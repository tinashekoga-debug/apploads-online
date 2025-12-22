// ===========================================
// load-posts.js
// ===========================================
// Handles load rendering and display logic:
// - Rendering loads list with filters
// - Load filtering
// - Pagination
// - Rating display
// ===========================================
// Exports: renderLoads, loadShareText
// ===========================================

import { skeletonLoader } from './skeleton-loader.js';
import { trackEvent } from './firebase-config.js';
import { pagination, state } from './main.js';
import { showToast, goto, fmtMoney, escapeHtml, copyText } from './ui.js';
import { loadRatingFor, ownerRatingFor, ownerIdFromItem, myVote, buildStarBar } from './ratings.js';
import { applyLoadFilters } from './filters.js';
import { openContact, contactLine } from './contact-modal.js';
import { openLoadChat } from './chat-controller.js';

const loadsList = document.getElementById('loadsList');
const emptyLoads = document.getElementById('emptyLoads');

export function renderLoads() {
    loadsList.innerHTML = '';
    
    // Show skeletons if no data or very little data
    if (state.loads.length === 0) {
        loadsList.innerHTML = `
            <div class="card">
                <h2 style="margin:0 0 12px 0;font-size:1.05rem">Available Loads</h2>
                ${skeletonLoader.createLoadSkeleton(3)}
            </div>
        `;
        return;
    }
    
    // Apply filters BEFORE pagination
    let filteredLoads = applyLoadFilters(state.loads);
    
    // Calculate display range
    const displayCount = Math.min(filteredLoads.length, pagination.loads.displayed);
    const totalCount = filteredLoads.length;
    
    let list = filteredLoads.slice(0, pagination.loads.displayed);
    
    emptyLoads.style.display = list.length ? 'none' : 'block';
    
    // Render items
    list.forEach(l => {
        loadsList.appendChild(loadItem(l));
    });
    
    // Add load more button if needed
    addPaginationButtons('loads', displayCount, totalCount);
    
    // Handle URL hash highlighting and scrolling
    // Use requestAnimationFrame to ensure DOM is fully painted
    requestAnimationFrame(() => {
        if (window.selectedLoadId) {
            const highlightedLoad = document.querySelector(`[data-load-id="${window.selectedLoadId}"]`);
            if (highlightedLoad) {
                // Scroll to the highlighted load
                highlightedLoad.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Ensure highlight class is added
                highlightedLoad.classList.add('highlight-load');
                
                // Remove highlight after 5 seconds
                setTimeout(() => {
                    highlightedLoad.classList.remove('highlight-load');
                    window.selectedLoadId = null;
                }, 5000);
            }
        }
    });
}

function addPaginationButtons(type, displayedCount, totalCount) {
    const container = document.createElement('div');
    container.className = 'pagination-container';

    // Load More Button
    if (displayedCount < totalCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'pagination-btn';
        loadMoreBtn.textContent = `Load ${displayedCount}/${totalCount}`;
        loadMoreBtn.addEventListener('click', () => {
            if (type === 'loads') {
                pagination.loads.displayed += pagination.loads.limit;
                renderLoads();
            } else {
                // This handles sales pagination - will be used by sales-posts.js
                import('./sales-posts.js').then(({ renderSales }) => {
                    pagination.sales.displayed += pagination.sales.limit;
                    renderSales();
                });
            }
        });
        container.appendChild(loadMoreBtn);
    }

    // Back to Top Button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'pagination-btn';
    backToTopBtn.textContent = 'Back to Top';
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    container.appendChild(backToTopBtn);

    // Append to appropriate list
    if (type === 'loads') {
        loadsList.appendChild(container);
    } else {
        document.getElementById('salesList').appendChild(container);
    }
}

function loadItem(l) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Add dimming class for taken loads
    if (l.status === 'taken') {
        card.classList.add('item-taken');
    }
    
    // Add data attribute for targeting
    card.setAttribute('data-load-id', l.id);
    
    // Add highlight class if this is the selected load
    if (window.selectedLoadId === l.id) {
        card.classList.add('highlight-load');
        // DON'T clear window.selectedLoadId here - let renderLoads() handle it
    }
    
    const d = document.createElement('details');
    d.className = 'load';
    d.open = false;
    
    const ownerId = ownerIdFromItem(l);
    const loadRat = loadRatingFor(l.id);
    const ownerRat = ownerRatingFor(ownerId);
    const ratingChip = `<span class="chip rating">⭐ ${loadRat.count ? loadRat.avg.toFixed(1) : '—'}${loadRat.count ? ' ('+loadRat.count+')' : ''}</span>`;
    
    // Add status badge for taken loads
    const statusBadge = l.status === 'taken' 
        ? `<span class="chip status-taken">TAKEN</span>` 
        : '';
    
    const sum = document.createElement('summary');
    sum.innerHTML = `
        <div class="load-head">
            <div>
                <div class="load-title">${escapeHtml(l.cargo)}</div>
                <div class="load-sub">${escapeHtml(l.originCity)}, ${escapeHtml(l.originCountry)} → ${escapeHtml(l.destCity)}, ${escapeHtml(l.destCountry)}</div>
                <div class="load-meta">
                    <span class="chip terms">${escapeHtml(l.terms || '—')}</span>
                    ${l.ready ? `<span class="chip now">Ready: ${escapeHtml(l.ready)}</span>` : ''}
                    ${ratingChip}
                    ${statusBadge}
                </div>
            </div>
            <div class="price">${fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total')}</div>
        </div>
    `;
    
    const inner = document.createElement('div');
    inner.className = 'mt10';
    inner.innerHTML = `
        <div class="muted">Posted by: <strong>${escapeHtml(l.contact?.name || 'Contact')}</strong> • ${getTimeAgo(l.postedAt)}</div>
        <div class="actions mt8">
    <button class="btn small" data-act="message" ${l.status === 'taken' ? 'disabled' : ''}>
        ${l.status === 'taken' ? 'No Longer Available' : 'Message'}
    </button>
    <button class="btn secondary small" data-act="contact" ${l.status === 'taken' ? 'disabled' : ''}>
        Contact
    </button>
</div>
        <div class="rating-widget">
            <div class="rating-row">
                <span class="rating-prompt">Rate this load:</span>
                <div class="rating-stars" data-starbar></div>
            </div>
            <div class="rating-summary">
                Your rating: ${myVote(l.id) ? (myVote(l.id) + '★') : 'Not rated yet'} • 
                Owner avg: ${ownerRat.count ? ownerRat.avg.toFixed(1) + '★ (' + ownerRat.count + ')' : '—'}
            </div>
        </div>
    `;
    
    d.appendChild(sum);
    d.appendChild(inner);
    card.appendChild(d);
    
    // Interactive star bar
    const barHost = inner.querySelector('[data-starbar]');
    barHost.appendChild(buildStarBar(l.id, myVote(l.id)));
    
    // Actions
    card.querySelector('[data-act="contact"]').addEventListener('click', (e) => {
        if (l.status === 'taken') {
            e.preventDefault();
            showToast('This load is no longer available', 'info');
            return;
        }
        trackEvent('contact_click', {
            item_type: 'load',
            item_id: l.id,
            owner_id: ownerId,
            price: l.price,
            currency: l.currency || 'USD'
        });
        openContact(l.contact, ownerId);
    });
    
    card.querySelector('[data-act="message"]').addEventListener('click', () => {
    if (l.status === 'taken') {
        showToast('This load is no longer available', 'info');
        return;
    }
    
    trackEvent('message_click', {
        item_type: 'load',
        item_id: l.id,
        owner_id: ownerId
    });
    
    openLoadChat(l);
});
    
    return card;
}

export function loadShareText(l) {
    const priceDisplay = fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total');
    const postUrl = `https://apploads-online.web.app/#load_${l.id}`;
    return `LOAD: ${l.cargo}
Route: ${l.originCity}, ${l.originCountry} → ${l.destCity}, ${l.destCountry}
Rate: ${priceDisplay} | Terms: ${l.terms || '—'}${l.ready ? ' | Ready: '+l.ready : ''}
Contact: ${contactLine(l.contact)}
View post: ${postUrl}`;
}

// =========================
// Time Formatting Utility
// =========================
function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    // Ensure timestamp is a number
    const posted = typeof timestamp === 'number' ? timestamp : Number(timestamp);
    const now = Date.now();
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    // Industry standard relative time formatting
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    // For very old posts, show exact date
    const postDate = new Date(posted);
    return postDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
    });
}

