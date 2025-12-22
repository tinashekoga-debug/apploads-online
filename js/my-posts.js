// ===========================================
// my-posts.js (Main Orchestrator)
// ===========================================
// Main controller for My Posts section
// Coordinates all sub-modules and initializes features
// ===========================================
// Exports: renderMine
// ===========================================

import { state } from './main.js';
import { ownerKey } from './utils-id.js';
import { renderMyLoads } from './my-load-posts.js';
import { renderMySales } from './my-marketplace-posts.js';
import { renderMessagesTab } from './messages-tab.js';
import { enableSwipeTabs, setupAccountTabs } from './my-posts-swipe.js';
import { initializePopovers } from './popovers.js';

// =========================
// Main Render Function
// =========================
export function renderMine() {
    // Get container element
    const myPostsContainer = document.getElementById('myPostsContainer');
    
    // If not authenticated, hide the entire container
    if (!state.profile) {
        if (myPostsContainer) myPostsContainer.style.display = 'none';
        return;
    }

    // Hide My Posts while profile is being edited
    const acctState = document.getElementById('acctState');
    if (acctState?.dataset.editing === 'true') {
        if (myPostsContainer) myPostsContainer.style.display = 'none';
        return;
    }

    // Show the container if authenticated and not editing
    if (myPostsContainer) myPostsContainer.style.display = 'block';
    
    const key = ownerKey();
    
    // Filter user's loads and sales
    const myLoads = state.loads.filter(l => (l.owner || '') === key);
    const mySales = state.sales.filter(s => (s.owner || '') === key);
    
    // Update count badges
    const loadsCount = document.getElementById('myLoadsCount');
    const salesCount = document.getElementById('mySalesCount');
    if (loadsCount) loadsCount.textContent = myLoads.length;
    if (salesCount) salesCount.textContent = mySales.length;
    
    // Render all three sections
renderMessagesTab();  // NEW - Render messages first
renderMyLoads(myLoads);
renderMySales(mySales);
    
    // Initialize features (order matters!)
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        setupAccountTabs();      // Setup tab buttons first
        enableSwipeTabs();       // Enable swipe gestures second
        initializePopovers();    // Initialize popovers last
    }, 100);
}