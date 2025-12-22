// ===========================================
// marketplace-utils.js (NEW)
// ===========================================
// Shared utilities for marketplace functionality:
// - Common rendering helpers
// - Category mappings
// - Contact type labels
// - Placeholder images
// ===========================================
// Exports: placeholderImage, createMarketplaceItem, getCategoryDisplayName, getContactTypeLabel
// ===========================================

import { escapeHtml, fmtMoney } from './ui.js';

// Category display names for both sales and services
export const categoryNames = {
    // Sales categories
    'trucks': '🚛 Trucks',
    'earthmoving': '🏗️ Earthmoving', 
    'tyres': '🛞 Tyres',
    'parts': '🔧 Parts',
    'other-sales': '📦 Other Sales',
    
    // Services categories
    'tracking': '📍 Tracking',
    'repairs': '🔧 Repairs',
    'insurance': '🛡️ Insurance',
    'customs': '🛃 Customs',
    'towing': '🚨 Towing',
    'other-services': '⚙️ Other Services'
};

// Contact type labels
export const contactTypeLabels = {
    'phone': 'Phone Call',
    'whatsapp': 'WhatsApp', 
    'email': 'Email',
    'visit': 'In-Person'
};

export function placeholderImage(text) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='280'>
        <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%230b7d62'/><stop offset='100%' stop-color='%2320a58a'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(%23g)'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial' font-size='26' font-weight='700'>${(text||'Truck').replace(/</g,'&lt;')}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

export function createMarketplaceItem(item, onClick) {
    const images = Array.isArray(item.images) ? item.images : (item.image ? [item.image] : [placeholderImage(item.title)]);
    const mainImage = images[0];
    const category = item.category || 'other-sales';
    
    const isService = item.type === 'service';
    
    const itemElement = document.createElement('div');
    itemElement.className = 'marketplace-item';
    
    // Add dimming class for sold items
    if (item.status === 'sold') {
        itemElement.classList.add('item-sold');
    }
    
    // Create status badge if item is sold
    const statusBadge = item.status === 'sold' 
        ? `<span class="marketplace-status-badge status-sold">SOLD</span>` 
        : '';
    
    itemElement.innerHTML = `
        <div class="marketplace-image-wrapper">
            <img src="${mainImage}" alt="${escapeHtml(item.title)}" class="marketplace-image" loading="lazy" />
            ${statusBadge}
        </div>
        <div class="marketplace-details">
            <div class="marketplace-price">
                ${isService ? 'Service' : fmtMoney(item.price || 0, item.currency || 'USD')}
            </div>

            <div class="marketplace-title">
                ${escapeHtml(item.title || item.businessName || item.serviceDescription || 'Service')}
            </div>

            <div class="marketplace-location">${escapeHtml(item.city)}, ${escapeHtml(item.country)}</div>
            
            ${categoryNames[category] ? `<div class="marketplace-category">${categoryNames[category]}</div>` : ''}
        </div>
    `;

    // Only make clickable if not sold
    if (item.status !== 'sold') {
        itemElement.addEventListener('click', onClick);
    } else {
        itemElement.style.cursor = 'not-allowed';
        itemElement.addEventListener('click', (e) => {
            e.preventDefault();
            // Optional: show toast that item is sold
        });
    }
    
    return itemElement;
}

export function getCategoryDisplayName(category) {
    return categoryNames[category] || category;
}

export function getContactTypeLabel(contactType) {
    return contactTypeLabels[contactType] || contactType;
}

