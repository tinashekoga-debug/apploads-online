// ===========================================
// popovers.js (Enhanced)
// ===========================================
// Centralized popover management system
// Fixed to work properly with swipe gestures
// ===========================================
// Exports: initializePopovers, closeAllPopovers
// ===========================================

import { trackEvent } from './firebase-config.js';
import { showToast } from './ui.js';
import { editLoad } from './loads.js';
import { editSale } from './sales.js';
import { editMarketplaceItem } from './marketplace-posting.js'; // ✅ ADD THIS
import { markAsSold, markAsTaken, delItem } from './my-posts-utils.js';

// =========================
// Popover State Management
// =========================
export let popoverOpen = false;
let currentOpenPopover = null;
let popoversInitialized = false;

// =========================
// Core Popover Functions
// =========================

export function initializePopovers() {
    if (popoversInitialized) {
        console.debug('Popovers already initialized');
        return;
    }
    popoversInitialized = true;
    
    console.log("✅ Popover system initialized");

    // Use event delegation with capture phase for priority handling
    document.addEventListener('click', handleGlobalClick, true);
    document.addEventListener('touchend', handleGlobalTouch, true);
    
    // Close popovers on scroll
    document.addEventListener('scroll', () => {
        if (currentOpenPopover) {
            closeAllPopovers();
        }
    }, true);
}

// =========================
// Touch Handler (Separate from Click)
// =========================
function handleGlobalTouch(e) {
    // Check if this is a tap on popover-related elements
    const moreIcon = e.target.closest('.more-icon');
    const popoverItem = e.target.closest('.popover-item');
    const popover = e.target.closest('.popover');
    
    // Handle more icon tap
    if (moreIcon) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleMoreIconClick(moreIcon);
        return;
    }
    
    // Handle popover item tap
    if (popoverItem) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handlePopoverItemClick(popoverItem);
        return;
    }
    
    // Close popovers when tapping outside
    if (currentOpenPopover && !popover && !moreIcon) {
        closeAllPopovers();
    }
}

// =========================
// Click Handler (Desktop)
// =========================
function handleGlobalClick(e) {
    const moreIcon = e.target.closest('.more-icon');
    const popoverItem = e.target.closest('.popover-item');
    const popover = e.target.closest('.popover');
    
    // Handle more icon click
    if (moreIcon) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handleMoreIconClick(moreIcon);
        return;
    }
    
    // Handle popover item click
    if (popoverItem) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        handlePopoverItemClick(popoverItem);
        return;
    }
    
    // Close popovers when clicking outside
    if (currentOpenPopover && !popover && !moreIcon) {
        closeAllPopovers();
    }
}

// =========================
// More Icon Click Handler
// =========================
function handleMoreIconClick(moreIcon) {
    // Use ID-based lookup instead of nextElementSibling
    const popoverId = moreIcon.dataset.popoverId;
    const popover = document.getElementById(popoverId);
    const card = moreIcon.closest('.my-post-card');
    
    if (!popover) {
        console.warn('Popover element not found for ID:', popoverId);
        return;
    }
    
    // Close any currently open popover
    if (currentOpenPopover && currentOpenPopover !== popover) {
        closePopover(currentOpenPopover);
    }
    
    // Toggle this popover
    if (currentOpenPopover && currentOpenPopover._originalPopover === popover) {
        closePopover(currentOpenPopover);
    } else {
        openPopover(popover, moreIcon, card);
    }
}

// =========================
// Open Popover (Clone Approach)
// =========================
function openPopover(popover, moreIcon, card) {
    // Clone popover and append to body to escape overflow:hidden clipping
    const popoverClone = popover.cloneNode(true);
    popoverClone.id = popover.id + '-active';
    popoverClone.classList.add('popover-portal'); // Marker class for cleanup
    document.body.appendChild(popoverClone);
    
    // Position relative to the more icon
    const rect = moreIcon.getBoundingClientRect();
    
    popoverClone.style.position = 'fixed';
    popoverClone.style.top = `${rect.bottom + 6}px`;
    popoverClone.style.right = `${window.innerWidth - rect.right}px`;
    popoverClone.style.left = 'auto';
    popoverClone.style.zIndex = '999999';
    popoverClone.style.display = 'block';
    
    popoverClone.classList.add('show');

    popoverOpen = true;

    if (card) card.classList.add('active-popover');
    
    // Store references for event handling
    popoverClone._cardReference = card;
    popoverClone._originalPopover = popover;
    
    currentOpenPopover = popoverClone;
    
    // Track popover open
    trackEvent('popover_opened', {
        item_type: card?.dataset?.itemType || 'unknown',
        item_id: card?.dataset?.itemId || 'unknown'
    });
}

// =========================
// Close Popover
// =========================
function closePopover(popover) {
    popover.classList.remove('show');
    
    // Get card reference
    const card = popover._cardReference;
    if (card) card.classList.remove('active-popover');
    
    // Remove cloned popover from body
    if (popover.classList.contains('popover-portal') && popover.parentElement === document.body) {
        popover.remove();
    }
    
    if (currentOpenPopover === popover) {
        currentOpenPopover = null;
        popoverOpen = false;
    }
}

// =========================
// Close All Popovers (Public API)
// =========================
export function closeAllPopovers() {
    // Close current open popover
    if (currentOpenPopover) {
        closePopover(currentOpenPopover);
    }
    
    // Cleanup: Remove any orphaned portal popovers
    document.querySelectorAll('.popover-portal').forEach(popover => {
        popover.remove();
    });
    
    // Remove active state from all cards
    document.querySelectorAll('.my-post-card.active-popover').forEach(card => {
        card.classList.remove('active-popover');
    });

    currentOpenPopover = null;
    popoverOpen = false;
}

// =========================
// Popover Item Click Handler
// =========================
function handlePopoverItemClick(popoverItem) {
    const popover = popoverItem.closest('.popover');
    
    // Get card from stored reference (works with cloned popovers)
    const card = popover?._cardReference;
    
    closeAllPopovers();
    
    if (!card) {
        console.warn('No parent card found for popover item');
        return;
    }
    
    const itemType = card.dataset.itemType;
    const itemId = card.dataset.itemId;
    
    if (!itemType || !itemId) {
        console.warn('Missing item type or ID:', { itemType, itemId });
        return;
    }
    
    // Handle different popover actions
    if (popoverItem.classList.contains('edit')) {
        handleEditAction(itemType, itemId);
    } else if (popoverItem.classList.contains('mark-sold')) {
        handleMarkSoldAction(itemId);
    } else if (popoverItem.classList.contains('mark-taken')) {
        handleMarkTakenAction(itemId);
    } else if (popoverItem.classList.contains('delete')) {
        handleDeleteAction(itemType, itemId);
    }
}

// =========================
// Popover Action Handlers
// =========================

function handleEditAction(itemType, itemId) {
    trackEvent('popover_action', {
        action: 'edit',
        item_type: itemType,
        item_id: itemId
    });
    
    if (itemType === 'load') {
        if (typeof editLoad === 'function') {
            editLoad(itemId);
        } else {
            showToast('Edit load function not available', 'error');
        }
    } else if (itemType === 'sale') {
        // ✅ USE THE NEW MARKETPLACE EDIT FUNCTION
        if (typeof editMarketplaceItem === 'function') {
            editMarketplaceItem(itemId);
        } else {
            showToast('Edit marketplace item function not available', 'error');
        }
    }
}

function handleMarkSoldAction(itemId) {
    trackEvent('popover_action', {
        action: 'mark_sold',
        item_type: 'sale',
        item_id: itemId
    });
    
    if (typeof markAsSold === 'function') {
        markAsSold(itemId);
    } else {
        showToast('Mark as sold function not available', 'error');
    }
}

function handleMarkTakenAction(itemId) {
    trackEvent('popover_action', {
        action: 'mark_taken',
        item_type: 'load',
        item_id: itemId
    });
    
    if (typeof markAsTaken === 'function') {
        markAsTaken(itemId);
    } else {
        showToast('Mark as taken function not available', 'error');
    }
}

function handleDeleteAction(itemType, itemId) {
    trackEvent('popover_action', {
        action: 'delete',
        item_type: itemType,
        item_id: itemId
    });
    
    if (typeof delItem === 'function') {
        delItem(itemType, itemId);
    } else {
        showToast('Delete function not available', 'error');
    }
}