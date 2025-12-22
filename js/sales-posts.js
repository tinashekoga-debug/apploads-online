// ===========================================
// sales-posts.js (REFACTORED) (Psydo Markeplace-Posts)
// ===========================================
// Handles SALES rendering and display logic only:
// - Rendering sales list with filters
// - Sales filtering
// - Pagination
// - Image gallery setup
// ===========================================
// Exports: renderSales, saleShareText, postSale
// ===========================================

import { skeletonLoader } from './skeleton-loader.js';
import { lazyImageLoader } from './lazy-loading.js';
import { trackEvent } from './firebase-config.js';
import { pagination, state } from './main.js';
import { showToast, fmtMoney, escapeHtml, getTimeAgo } from './ui.js';
import { applyMarketplaceFilters } from './marketplace-filters.js';
import { openListing } from './marketplace-listing.js';
import { getRelatedListings } from './related-posts.js';
import { placeholderImage, createMarketplaceItem, getCategoryDisplayName } from './marketplace-utils.js';
import { openContact } from './contact-modal.js';


export function postSale() {
    // Add the postSale function implementation here
    // This should handle posting new sales listings
    console.log('postSale function called');
    // Your existing postSale logic goes here
}

export function renderSales() {
    const listEl = document.getElementById('salesList');
    listEl.innerHTML = '';
    
    if (state.sales.length === 0) {
        listEl.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center;">
                <h2 style="margin:0 0 12px 0;font-size:1.05rem">Marketplace</h2>
                ${skeletonLoader.createMarketplaceSkeleton(4)}
            </div>
        `;
        return;
    }
    
    // Use the new marketplace filters instead of sale filters
    let filteredSales = applyMarketplaceFilters(state.sales);
    const displayCount = Math.min(filteredSales.length, pagination.sales.displayed);
    const totalCount = filteredSales.length;
    
    let list = filteredSales.slice(0, pagination.sales.displayed);
    
    const empty = document.getElementById('emptySales');
    empty.style.display = list.length ? 'none' : 'block';
    
    list.forEach(sale => {
        // IMPORTANT FIX: allow services to show in marketplace
        const item = createMarketplaceItem(sale, () => {
            openListing(sale);
        });
        
        // Add data attribute for targeting (like we did for loads)
        item.setAttribute('data-sale-id', sale.id);
        
        // Add highlight class if this is the selected sale
        if (window.selectedSaleId === sale.id) {
            item.classList.add('highlight-load'); // Using same class for consistency
        }

        listEl.appendChild(item);
    });
    
    // Add pagination
    addSimplePaginationButtons('sales', displayCount, totalCount, pagination.sales.limit);
    
    // Handle URL hash highlighting and scrolling (SAME AS LOADS)
    requestAnimationFrame(() => {
        if (window.selectedSaleId) {
            const highlightedSale = document.querySelector(`[data-sale-id="${window.selectedSaleId}"]`);
            if (highlightedSale) {
                // Scroll to the highlighted sale
                highlightedSale.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Ensure highlight class is added
                highlightedSale.classList.add('highlight-load');
                
                // Remove highlight after 5 seconds
                setTimeout(() => {
                    highlightedSale.classList.remove('highlight-load');
                    window.selectedSaleId = null;
                }, 5000);
            }
        }
    });
}

export function saleShareText(s) {
    const isService = s.type === 'service';

    const priceDisplay = isService
        ? 'Service'
        : fmtMoney(s.price || 0, s.currency || 'USD');

    const titleDisplay = isService
        ? (s.businessName || 'Service')
        : s.title;

    const descDisplay = isService
        ? (s.serviceDescription || '')
        : (s.details || '');

    const postUrl = `https://apploads-online.web.app/#sale_${s.id}`;

    return `${titleDisplay}
Location: ${s.city}, ${s.country}
${isService ? '' : `Price: ${priceDisplay}`}
Details: ${descDisplay || '—'}
Contact: ${contactLine(s.contact)}
View post: ${postUrl}`;
}

// =========================
// Pagination Helper
// =========================
function addSimplePaginationButtons(type, displayedCount, totalCount, limit) {
    const container = document.createElement('div');
    container.className = 'pagination-container';

    // Load More Button
    if (displayedCount < totalCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'pagination-btn';
        loadMoreBtn.textContent = `Load ${displayedCount}/${totalCount}`;
        loadMoreBtn.addEventListener('click', () => {
            if (type === 'sales') {
                pagination.sales.displayed += limit;
                renderSales();
            } else {
                pagination.loads.displayed += pagination.loads.limit;
                renderLoads();
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
    if (type === 'sales') {
        document.getElementById('salesList').appendChild(container);
    } else {
        document.getElementById('loadsList').appendChild(container);
    }
}

// Re-export for backward compatibility
export { getRelatedListings };