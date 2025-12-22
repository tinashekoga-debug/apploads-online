// ===========================================
// related-posts.js (NEW)
// ===========================================
// Handles related posts functionality:
// - Finding related listings
// - Creating related cards
// - Cross-referencing logic
// ===========================================
// Exports: getRelatedListings, createRelatedCard
// ===========================================

import { state } from './main.js';
import { escapeHtml, fmtMoney } from './ui.js';
import { placeholderImage } from './marketplace-utils.js';

export function getRelatedListings(currentItem) {
    if (!currentItem) return [];
    
    const related = state.sales.filter(sale => {
        if (sale.id === currentItem.id) return false;
        
        let score = 0;
        
        // Same category - high priority
        if (sale.category === currentItem.category) score += 3;
        
        // Same country - medium priority  
        if (sale.country === currentItem.country) score += 2;
        
        // Same type (sale/service) - medium priority
        if ((sale.type || 'sale') === (currentItem.type || 'sale')) score += 2;
        
        // Similar price range (for sales) - low priority
        if (sale.price && currentItem.price) {
            const priceDiff = Math.abs(sale.price - currentItem.price);
            const maxPrice = Math.max(sale.price, currentItem.price);
            if (priceDiff / maxPrice < 0.5) score += 1;
        }
        
        return score > 0;
    });
    
    // Sort by score (simplified) and recency
    return related
        .sort((a, b) => {
            // Prioritize same category and country
            const aScore = (a.category === currentItem.category ? 2 : 0) + 
                          (a.country === currentItem.country ? 1 : 0);
            const bScore = (b.category === currentItem.category ? 2 : 0) + 
                          (b.country === currentItem.country ? 1 : 0);
            
            if (bScore !== aScore) return bScore - aScore;
            
            // Then by recency
            return (b.postedAt || 0) - (a.postedAt || 0);
        })
        .slice(0, 4); // Show max 4 related listings
}

export function createRelatedCard(item, onClick) {
    const images = Array.isArray(item.images)
        ? item.images
        : (item.image ? [item.image] : []);

    const mainImage = images[0] || placeholderImage(item.title);
    const isService = item.type === 'service';

    // ✔ TITLE MAPPING:
    // For services → use businessName
    // For sales → use title
    const cardTitle = isService
        ? escapeHtml(item.businessName || 'Service')
        : escapeHtml(item.title);

    // ✔ PRICE MAPPING:
    const priceDisplay = isService
        ? 'Service'
        : fmtMoney(item.price || 0, item.currency || 'USD');

    // ✔ LOCATION stays the same
    const cardLocation = escapeHtml(item.city || '');

    const card = document.createElement('div');
    card.className = 'related-card';
    card.innerHTML = `
        <img src="${mainImage}" 
             alt="${cardTitle}" 
             class="related-image" />

        <div class="related-details">

            <div class="related-price">${priceDisplay}</div>

            <div class="related-title">${cardTitle}</div>

            <div class="related-location">${cardLocation}</div>
        </div>
    `;

    card.addEventListener('click', onClick);

    return card;
}

