// ===========================================
// ratings.js
// ===========================================
// Handles the rating system:
// - Load ratings (per-load star ratings)
// - Owner ratings (aggregate ratings per owner)
// - User votes (tracking what users have rated)
// - Star bar UI (interactive 5-star rating widget)
// - Rating calculations and aggregations
// ===========================================
// Exports: loadRatingFor, ownerRatingFor, setVote, myVote, buildStarBar, ownerIdFromItem, calculateOwnerRatings
// ===========================================

import { trackEvent } from './firebase-config.js';
import { doc, getDoc, setDoc, updateDoc, increment, db } from './firebase-config.js';
import { state } from './main.js';
import { showToast } from './ui.js';
import { renderLoads } from './loads.js';
import { renderHome } from './main.js';

// =========================
// Rating helpers (owner-level)
// =========================
function contactKey(c) {
    return (c?.email || c?.phone || c?.name || '').toString().trim().toLowerCase();
}

export function ownerIdFromItem(item) {
    return (item.owner && String(item.owner).trim()) || contactKey(item.contact) || 'unknown';
}

// Get rating for a specific load
export function loadRatingFor(loadId) {
    const r = state.loadRatings[loadId];
    if (!r || !r.count) return {avg: 0, count: 0};
    return {avg: r.sum / r.count, count: r.count};
}

// Get aggregate rating for an owner
export function ownerRatingFor(ownerId) {
    const r = state.ownerRatings[ownerId];
    if (!r || !r.count) return {avg: 0, count: 0};
    return {avg: r.sum / r.count, count: r.count};
}

export async function setVote(loadId, stars) {
    if (!state.currentUser) {
        showToast('Please sign in to rate', 'warning');
        return;
    }
    
    stars = Math.max(1, Math.min(5, Number(stars) || 0));
    const prev = state.myVotes[loadId];
    
    // Track rating attempt
    trackEvent('rate_load_attempt', {
        load_id: loadId,
        stars: stars,
        previous_rating: prev || null,
        user_id: state.currentUser.uid
    });
    
    try {
        // Update load rating in Firestore
        const ratingRef = doc(db, 'loadRatings', loadId);
        const ratingDoc = await getDoc(ratingRef);
        
        if (prev) {
            // User is changing their vote
            const delta = stars - prev;
            await updateDoc(ratingRef, {
                sum: increment(delta)
            });
        } else {
            // New vote
            if (ratingDoc.exists()) {
                await updateDoc(ratingRef, {
                    sum: increment(stars),
                    count: increment(1)
                });
            } else {
                await setDoc(ratingRef, {
                    sum: stars,
                    count: 1
                });
            }
        }
        
        // Update user's votes
        state.myVotes[loadId] = stars;
        await setDoc(doc(db, 'userVotes', state.currentUser.uid), {
            loadVotes: state.myVotes
        });
        
        // Reload ratings
        const updatedRating = await getDoc(ratingRef);
        state.loadRatings[loadId] = updatedRating.data();
        
       // Recalculate owner aggregates
calculateOwnerRatings();

// Track successful rating
trackEvent('rate_load', {
    load_id: loadId,
    stars: stars,
    previous_rating: prev || null,
    user_id: state.currentUser.uid,
    new_average: (updatedRating.sum / updatedRating.count).toFixed(1),
    total_ratings: updatedRating.count
});

showToast(`Thanks for your ${stars}-star rating!`, 'success');
renderLoads();
renderHome();
} catch (e) {
    console.error('Error saving rating:', e);
    
    // Track failed rating
    trackEvent('rate_load', {
        success: false,
        load_id: loadId,
        stars: stars,
        error: e.message
    });
    
    showToast('Error saving rating', 'error');
}
}

export function myVote(loadId) {
    return state.myVotes[loadId] || 0;
}

export function calculateOwnerRatings() {
    state.ownerRatings = {};
    state.loads.forEach(load => {
        const ownerId = ownerIdFromItem(load);
        const loadRating = state.loadRatings[load.id];
        if (loadRating && loadRating.count > 0) {
            if (!state.ownerRatings[ownerId]) {
                state.ownerRatings[ownerId] = { sum: 0, count: 0 };
            }
            state.ownerRatings[ownerId].sum += loadRating.sum;
            state.ownerRatings[ownerId].count += loadRating.count;
        }
    });
}

// Build a star bar (interactive)
export function buildStarBar(loadId, initial) {
    const wrap = document.createElement('div');
    wrap.className = 'stars';
    wrap.dataset.loadid = loadId;
    
    const stars = [];
    for (let i = 1; i <= 5; i++) {
        const s = document.createElement('span');
        s.className = 'star';
        s.textContent = '★';
        s.dataset.value = i;
        wrap.appendChild(s);
        stars.push(s);
        
  s.addEventListener('mouseenter', () => {
    // Track star hover (pre-rating interaction)
    trackEvent('star_hover', {
        load_id: loadId,
        hovered_stars: i,
        current_rating: current || 0
    });
    fill(i);
});
s.addEventListener('mouseleave', () => fill(current || 0));
s.addEventListener('click', () => {
    current = i;
    
    // Track star click (before setting vote)
    trackEvent('star_click', {
        load_id: loadId,
        selected_stars: i,
        previous_rating: current || 0
    });
    
    setVote(loadId, i);
    fill(current);
});
    }

    let current = initial || 0;
    function fill(n) {
        stars.forEach((el, idx) => {
            el.classList.toggle('filled', idx < n);
        });
    }
    fill(current);
    
    return wrap;
}

