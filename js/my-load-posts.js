// ===========================================
// my-load-posts.js
// ===========================================
// Handles rendering and management of user's load posts
// ===========================================
// Exports: renderMyLoads, autoDeleteExpiredLoad
// ===========================================

import { db, state, deleteDoc, doc } from './main.js';
import { escapeHtml, fmtMoney } from './ui.js';
import { getDaysUntilExpiry, shareItem } from './my-posts-utils.js';
// REMOVE THIS IMPORT - it's causing circular dependency
// import { repostLoad } from './loads.js';
// import { getLoadPopoverHTML } from './popovers-templates.js';
// import { renderLoads } from './loads.js';

// =========================
// Auto-delete taken loads after 1 hour
// =========================
export async function autoDeleteExpiredLoad(loadId) {
    try {
        // Import renderMine dynamically to avoid circular dependency
        const { renderMine } = await import('./my-posts.js');
        
        // Import renderLoads dynamically instead of static import
        const { renderLoads } = await import('./loads.js');
        
        await deleteDoc(doc(db, 'loads', loadId));
        state.loads = state.loads.filter(l => l.id !== loadId);
        renderMine();
        renderLoads();
        console.log(`✅ Auto-deleted load: ${loadId}`);
    } catch (e) {
        console.error('Error auto-deleting load:', e);
    }
}

// =========================
// Get Load Card HTML
// =========================
function getLoadHTML(l) {
    const isTaken = l.status === 'taken';
    const takenAt = l.takenAt ? Number(l.takenAt) : null;
    const daysLeft = getDaysUntilExpiry(l.postedAt, 7);
    const expiryText = isTaken ? 'Taken' : (daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired');
    const expiryColor = isTaken ? '#0b7d62' : (daysLeft <= 2 ? '#dc3545' : daysLeft <= 4 ? '#ff9800' : '#666');
    
    // Auto-delete taken loads after 1 day
if (isTaken && takenAt) {
    const daysSinceTaken = (Date.now() - takenAt) / (1000 * 60 * 60 * 24);
    if (daysSinceTaken >= 1) {
        setTimeout(() => autoDeleteExpiredLoad(l.id), 100);
    }
}
    
    // ⭐ UNIQUE POPOVER ID
    const popoverId = `popover-load-${l.id}`;
    
    return `
        <div class='card my-post-card' data-item-type="load" data-item-id="${l.id}">
            <div class="between">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong>${escapeHtml(l.cargo)}</strong>
                        ${isTaken ? '<span class="taken-badge">Taken</span>' : ''}
                    </div>
                    <div class="muted">${escapeHtml(l.originCity)}, ${escapeHtml(l.originCountry)} → ${escapeHtml(l.destCity)}, ${escapeHtml(l.destCountry)}</div>
                    <div class="muted mt6" style="color: ${expiryColor}; font-size: 12px;">⏱️ ${expiryText}</div>
                </div>
                <span class='price'>${fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total')}</span>
            </div>
            ${!isTaken ? `
                <div class='actions mt8' style='display:flex;align-items:center;gap:8px;position:relative;'>
                    <!-- Share Button -->
                    <button class='btn small share-btn' style='flex:1;min-width:0;padding:6px 8px;font-size:13px;' data-share-item="load" data-item-id="${l.id}">
                        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg"
                             alt="WhatsApp"
                             style="width:14px;height:14px;margin-right:4px;filter:invert(43%) sepia(92%) saturate(561%) hue-rotate(88deg) brightness(94%) contrast(92%);">
                        Share
                    </button>

                    <!-- Repost Button -->
                    <button class='btn small secondary' style='flex:1;min-width:0;padding:6px 8px;font-size:13px;' data-repost-load="${l.id}">
                        Repost
                    </button>

                    <!-- 3 Dots Menu - ⭐ WITH POPOVER ID REFERENCE -->
                    <div class="more-icon" data-popover-id="${popoverId}" style="font-size:22px;cursor:pointer;user-select:none;position:relative;z-index:20;">⋮</div>
                </div>
                
                <!-- ⭐ POPOVER MOVED OUTSIDE .actions WITH UNIQUE ID -->
                <div class="popover" id="${popoverId}">
                    <button class="popover-item edit">Edit</button>
                    <button class="popover-item mark-taken">Mark as Taken</button>
                    <button class="popover-item delete">Delete</button>
                </div>
            ` : `
            `}
        </div>
    `;
}

// =========================
// Render My Loads
// =========================
export function renderMyLoads(myLoads) {
    const loadsWrap = document.getElementById('myLoadsPosts');
    const emptyLoads = document.getElementById('emptyMyLoads');
    
    if (!loadsWrap) return;
    
    const loadsHTML = myLoads.map(l => getLoadHTML(l)).join('');
    
    loadsWrap.innerHTML = loadsHTML;
    if (emptyLoads) emptyLoads.style.display = myLoads.length ? 'none' : 'block';
    
    // Attach event handlers
    attachLoadHandlers(loadsWrap);
}

// =========================
// Event Handler Attachment
// =========================
function attachLoadHandlers(wrap) {
    if (!wrap) return;
    
    // Remove old listener if exists
    const oldHandler = wrap._loadHandler;
    if (oldHandler) {
        wrap.removeEventListener('click', oldHandler);
    }
    
    // Create new handler
    const newHandler = async (e) => {
        const target = e.target;
        
        // Ignore popover-related clicks (handled by popovers.js)
        if (target.closest('.popover') || target.closest('.more-icon')) {
            return;
        }
        
        // Share button
        const shareBtn = target.closest('[data-share-item="load"]');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = shareBtn.getAttribute('data-item-id');
            shareItem('load', itemId);
            return;
        }
        
        // Repost button
        const repostBtn = target.closest('[data-repost-load]');
        if (repostBtn) {
            e.preventDefault();
            e.stopPropagation();
            // Import repostLoad dynamically
            const { repostLoad } = await import('./loads.js');
            repostLoad(repostBtn.getAttribute('data-repost-load'));
            return;
        }
    };
    
    // Store reference and attach
    wrap._loadHandler = newHandler;
    wrap.addEventListener('click', newHandler);
}