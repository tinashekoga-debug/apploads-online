// ===========================================
// URL HASH HANDLING FOR DIRECT POST LINKS
// Extracted safely from main.js
// ===========================================

import { goto } from './ui.js';

// -------------------------------------------
// Handles: #load_<id>  or  #sale_<id>
// Navigates to the correct tab and highlights
// -------------------------------------------
export function handlePostUrl() {
    const hash = window.location.hash;

    if (!hash) return;

    // Handle load post URL
    if (hash.startsWith('#load_')) {
        const loadId = hash.replace('#load_', '');
        window.selectedLoadId = loadId;

        // Increase timeout to ensure data is loaded
        setTimeout(() => {
            goto('loads');
            // renderLoads() will be called by goto() and will handle highlighting
        }, 800); // Increased from 500ms
    }

    // Handle sale post URL
    else if (hash.startsWith('#sale_')) {
        const saleId = hash.replace('#sale_', '');
        window.selectedSaleId = saleId;

        setTimeout(() => {
            goto('sales');
            // renderSales() will handle highlighting
        }, 800); // Increased from 500ms
    }

    // Clear the hash to prevent re-triggering
    setTimeout(() => {
        window.location.hash = '';
    }, 3000); // Increased from 2000ms to give more time
}

// -------------------------------------------
// Attach hashchange listener
// -------------------------------------------
export function setupHashListener() {
    window.addEventListener('hashchange', handlePostUrl);
}

