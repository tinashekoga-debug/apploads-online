// ===========================================
// services-posts.js (NEW)
// ===========================================
// Handles SERVICES rendering and display logic:
// - Rendering services list with filters
// - Services filtering
// - Service-specific display logic
// ===========================================
// Exports: renderServices, serviceShareText
// ===========================================

import { skeletonLoader } from './skeleton-loader.js';
import { trackEvent } from './firebase-config.js';
import { pagination, state } from './main.js';
import { showToast, escapeHtml } from './ui.js';
import { applyMarketplaceFilters } from './marketplace-filters.js';
import { openListing } from './marketplace-listing.js';
import { createMarketplaceItem, getContactTypeLabel } from './marketplace-utils.js';
import { openContact } from './contact-modal.js';


export function renderServices() {
    const listEl = document.getElementById('salesList');
    
    // Filter only services from the sales array
    const services = state.sales.filter(sale => sale.type === 'service');
    
    if (services.length === 0) {
        listEl.innerHTML = `
            <div class="card" style="grid-column: 1 / -1; text-align: center;">
                <h2 style="margin:0 0 12px 0;font-size:1.05rem">Services</h2>
                ${skeletonLoader.createMarketplaceSkeleton(2)}
            </div>
        `;
        return;
    }
    
    let filteredServices = applyMarketplaceFilters(services);
    const displayCount = Math.min(filteredServices.length, pagination.sales.displayed);
    const totalCount = filteredServices.length;
    
    let list = filteredServices.slice(0, pagination.sales.displayed);
    
    const empty = document.getElementById('emptySales');
    empty.style.display = list.length ? 'none' : 'block';
    
    listEl.innerHTML = '';
    
    list.forEach(service => {
        const item = createMarketplaceItem(service, () => {
            openListing(service);
        });
        
        listEl.appendChild(item);
    });
    
    // Add pagination
    addSimplePaginationButtons('services', displayCount, totalCount, pagination.sales.limit);
}

export function serviceShareText(s) {
    const postUrl = `https://apploads-online.web.app/#service_${s.id}`;
    return `SERVICE: ${s.title}
Location: ${s.city}, ${s.country}
Service: ${s.serviceDescription || '—'}
Contact Method: ${getContactTypeLabel(s.contactType)}
Details: ${s.description || '—'}
Contact: ${contactLine(s.contact)}
View post: ${postUrl}`;
}

// =========================
// Pagination Helper (Services-specific)
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
            pagination.sales.displayed += limit;
            renderServices();
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

    document.getElementById('salesList').appendChild(container);
}

