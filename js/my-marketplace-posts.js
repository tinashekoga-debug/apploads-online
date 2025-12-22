// ===========================================
// my-marketplace-posts.js
// ===========================================
// Handles rendering and management of user's marketplace/sale posts
// ===========================================
// Exports: renderMySales, autoDeleteExpiredSale
// ===========================================

import { db, state, deleteDoc, doc } from './main.js';
import { escapeHtml, fmtMoney } from './ui.js';
import { getDaysUntilExpiry, shareItem } from './my-posts-utils.js';
// REMOVE THESE IMPORTS - they cause circular dependency
// import { repostSale } from './sales.js';
// import { getSalePopoverHTML } from './popovers-templates.js';
// import { renderSales } from './sales.js';

// =========================
// Auto-delete sold sales after 7 days
// =========================
export async function autoDeleteExpiredSale(saleId) {
    try {
        // Import renderMine dynamically to avoid circular dependency
        const { renderMine } = await import('./my-posts.js');
        
        // Import renderSales dynamically
        const { renderSales } = await import('./sales.js');
        
        await deleteDoc(doc(db, 'sales', saleId));
        state.sales = state.sales.filter(s => s.id !== saleId);
        renderMine();
        renderSales();
        console.log(`✅ Auto-deleted sale: ${saleId}`);
    } catch (e) {
        console.error('Error auto-deleting sale:', e);
    }
}

// =========================
// Get Sale Card HTML
// =========================
function getSaleHTML(s) {
    const isSold = s.status === 'sold';
    const soldAt = s.soldAt ? Number(s.soldAt) : null;
    const daysLeft = getDaysUntilExpiry(s.postedAt, 30);
    const expiryText = isSold ? 'Sold' : (daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired');
    const expiryColor = isSold ? '#0b7d62' : (daysLeft <= 5 ? '#dc3545' : daysLeft <= 10 ? '#ff9800' : '#666');
    
   // Auto-delete sold sales after 7 days
if (isSold && soldAt) {
    const daysSinceSold = (Date.now() - soldAt) / (1000 * 60 * 60 * 24);
    if (daysSinceSold >= 7) {
        setTimeout(() => autoDeleteExpiredSale(s.id), 100);
    }
}
    
    // ⭐ UNIQUE POPOVER ID
    const popoverId = `popover-sale-${s.id}`;
    
    return `
        <div class='card my-post-card' data-item-type="sale" data-item-id="${s.id}">
            <div class="between">
                <div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong>${escapeHtml(s.title)}</strong>
                        ${isSold ? '<span class="sold-badge">SOLD</span>' : ''}
                    </div>
                    <div class="muted">${escapeHtml(s.city)}, ${escapeHtml(s.country)}</div>
                    <div class="muted mt6" style="color: ${expiryColor}; font-size: 12px;">⏱️ ${expiryText}</div>
                </div>
                <span class='price'>${fmtMoney(s.price || 0, s.currency || 'USD')}</span>
            </div>
            ${!isSold ? `
                <div class='actions mt8' style='display:flex;align-items:center;gap:8px;position:relative;'>
                    <!-- Share Button -->
                    <button class='btn small share-btn' style='flex:1;min-width:0;padding:6px 8px;font-size:13px;' data-share-item="sale" data-item-id="${s.id}">
                        <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/whatsapp.svg"
                             alt="WhatsApp"
                             style="width:14px;height:14px;margin-right:4px;filter:invert(43%) sepia(92%) saturate(561%) hue-rotate(88deg) brightness(94%) contrast(92%);">
                        Share
                    </button>

                    <!-- Repost Button -->
                    <button class='btn small secondary' style='flex:1;min-width:0;padding:6px 8px;font-size:13px;' data-repost-sale="${s.id}">
                        Repost
                    </button>

                    <!-- 3 Dots Menu - ⭐ WITH POPOVER ID REFERENCE -->
                    <div class="more-icon" data-popover-id="${popoverId}" style="font-size:22px;cursor:pointer;user-select:none;position:relative;z-index:20;">⋮</div>
                </div>
                
                <!-- ⭐ POPOVER MOVED OUTSIDE .actions WITH UNIQUE ID -->
                <div class="popover" id="${popoverId}">
                    <button class="popover-item edit">Edit</button>
                    <button class="popover-item mark-sold">Mark as Sold</button>
                    <button class="popover-item delete">Delete</button>
                </div>
            ` : `
            `}
        </div>
    `;
}

// =========================
// Render My Sales
// =========================
export function renderMySales(mySales) {
    const salesWrap = document.getElementById('mySalesPosts');
    const emptySales = document.getElementById('emptyMySales');
    
    if (!salesWrap) return;
    
    const salesHTML = mySales.map(s => getSaleHTML(s)).join('');
    
    salesWrap.innerHTML = salesHTML;
    if (emptySales) emptySales.style.display = mySales.length ? 'none' : 'block';
    
    // Attach event handlers
    attachSaleHandlers(salesWrap);
}

// =========================
// Event Handler Attachment
// =========================
function attachSaleHandlers(wrap) {
    if (!wrap) return;
    
    // Remove old listener if exists
    const oldHandler = wrap._saleHandler;
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
        const shareBtn = target.closest('[data-share-item="sale"]');
        if (shareBtn) {
            e.preventDefault();
            e.stopPropagation();
            const itemId = shareBtn.getAttribute('data-item-id');
            shareItem('sale', itemId);
            return;
        }
        
        // Repost button
        const repostBtn = target.closest('[data-repost-sale]');
        if (repostBtn) {
            e.preventDefault();
            e.stopPropagation();
            // Import repostSale dynamically
            const { repostSale } = await import('./sales.js');
            repostSale(repostBtn.getAttribute('data-repost-sale'));
            return;
        }
    };
    
    // Store reference and attach
    wrap._saleHandler = newHandler;
    wrap.addEventListener('click', newHandler);
}