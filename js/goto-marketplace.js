// =========================
// MARKETPLACE NAVIGATION MODULE
// =========================

import { goto, closePopup } from './ui.js';
import { trackEvent } from './firebase-config.js';

export function goToSpecificListing(listingId) {
    window.selectedSaleId = listingId;
    closePopup();
    goto('sales');

    trackEvent('navigate_to_specific_sale', {
        sale_id: listingId,
        source: 'other_posts_popup'
    });

    setTimeout(() => {
        const el = document.querySelector(`[data-sale-id="${listingId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 500);
}

window.goToSpecificSale = goToSpecificListing;
window.goToSpecificListing = goToSpecificListing;

