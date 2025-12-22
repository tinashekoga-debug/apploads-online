// ===========================================
// marketplace-drawer-swipe.js
// Handles horizontal swipe between Sales/Services tabs
// ===========================================

import { handleListingTypeSelect } from './marketplace-drawer.js';

/**
 * Initialize swipe functionality for Sales <-> Services tabs
 */
export function initializeTabSwipe() {
    const drawer = document.getElementById('filter-drawer');
    if (!drawer) {
        console.warn('⚠️ Filter drawer not found for swipe initialization');
        return;
    }
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwiping = false;
    let isVerticalScroll = false;
    
    // Swipe configuration - MORE SENSITIVE VALUES
    const SWIPE_THRESHOLD = 50;        // REDUCED from 80: Lower distance needed
    const VERTICAL_THRESHOLD = 100;    // INCREASED from 50: More diagonal allowance
    const TIME_THRESHOLD = 500;        // INCREASED from 300: More forgiving timing
    const DIAGONAL_RATIO = 1.2;        // REDUCED from 1.5: Less strict horizontal vs vertical ratio
    
    /**
     * Check if touch is on an interactive element
     */
    function isInteractiveElement(target) {
        return target.closest('.filter-chip') || 
               target.closest('.chip') || 
               target.closest('button:not(.chip)') || 
               target.closest('select') ||
               target.closest('input') ||
               target.closest('.drawer-footer') ||
               target.closest('.drawer-drag-handle');
    }
    
    /**
     * Get current active tab
     */
    function getCurrentTab() {
        const activeChip = document.querySelector('#listingTypeSelector .chip.active');
        return activeChip ? activeChip.dataset.filterValue : 'sales';
    }
    
    /**
     * Handle touch start
     */
    function handleTouchStart(e) {
        // Don't capture touches on interactive elements
        if (isInteractiveElement(e.target)) {
            touchStartX = 0; // Reset to disable swipe
            return;
        }
        
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartTime = Date.now();
        isSwiping = false;
        isVerticalScroll = false;
    }
    
    /**
     * Handle touch move - determine gesture type
     */
    function handleTouchMove(e) {
        if (touchStartX === 0) return;
        
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX);
        const deltaY = Math.abs(touch.clientY - touchStartY);
        
        // First significant movement determines gesture type
        if (!isSwiping && !isVerticalScroll) {
            if (deltaX > 10 || deltaY > 10) {
                if (deltaX > deltaY * DIAGONAL_RATIO) {
                    // Horizontal swipe detected
                    isSwiping = true;
                    console.log('👆 Horizontal swipe detected');
                } else {
                    // Vertical scroll detected
                    isVerticalScroll = true;
                }
            }
        }
        
        // Only prevent scroll during horizontal swipes
        if (isSwiping && deltaY < VERTICAL_THRESHOLD) {
            e.preventDefault();
        }
    }
    
    /**
     * Handle touch end - execute tab switch if valid swipe
     */
    function handleTouchEnd(e) {
        if (touchStartX === 0 || !isSwiping) {
            // Reset state
            touchStartX = 0;
            touchStartY = 0;
            isSwiping = false;
            isVerticalScroll = false;
            return;
        }
        
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX;
        const deltaY = Math.abs(touch.clientY - touchStartY);
        const deltaTime = Date.now() - touchStartTime;
        
        // Reset state
        const wasSwipingLeft = deltaX < 0;
        const wasSwipingRight = deltaX > 0;
        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
        isVerticalScroll = false;
        
        // Validate swipe - MORE FORGIVING CONDITIONS
        const isValidSwipe = 
            Math.abs(deltaX) >= SWIPE_THRESHOLD &&
            deltaY < VERTICAL_THRESHOLD &&
            deltaTime < TIME_THRESHOLD;
        
        if (!isValidSwipe) {
            console.log('❌ Invalid swipe:', { deltaX, deltaY, deltaTime });
            return;
        }
        
        const currentTab = getCurrentTab();
        console.log('✅ Valid swipe detected:', { 
            direction: wasSwipingLeft ? 'left' : 'right',
            currentTab,
            deltaX: Math.abs(deltaX),
            deltaY,
            deltaTime
        });
        
        // Execute tab switch based on swipe direction
        if (wasSwipingLeft && currentTab === 'sales') {
            // Swipe left: Sales -> Services
            console.log('➡️ Switching Sales -> Services');
            handleListingTypeSelect('services');
        } else if (wasSwipingRight && currentTab === 'services') {
            // Swipe right: Services -> Sales
            console.log('⬅️ Switching Services -> Sales');
            handleListingTypeSelect('sales');
        } else {
            console.log('⚠️ No tab switch (already at boundary)');
        }
    }
    
    /**
     * Handle touch cancel - cleanup
     */
    function handleTouchCancel() {
        touchStartX = 0;
        touchStartY = 0;
        isSwiping = false;
        isVerticalScroll = false;
    }
    
    // Attach event listeners to the drawer content area
    const drawerContent = drawer.querySelector('.drawer-content');
    if (drawerContent) {
        drawerContent.addEventListener('touchstart', handleTouchStart, { passive: true });
        drawerContent.addEventListener('touchmove', handleTouchMove, { passive: false });
        drawerContent.addEventListener('touchend', handleTouchEnd, { passive: true });
        drawerContent.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        console.log('✅ Tab swipe initialized on drawer content');
    } else {
        // Fallback: attach to drawer itself
        drawer.addEventListener('touchstart', handleTouchStart, { passive: true });
        drawer.addEventListener('touchmove', handleTouchMove, { passive: false });
        drawer.addEventListener('touchend', handleTouchEnd, { passive: true });
        drawer.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        
        console.log('✅ Tab swipe initialized on drawer (fallback)');
    }
}

/**
 * Add visual swipe indicator (optional enhancement)
 */
export function addSwipeIndicator() {
    const listingSelector = document.getElementById('listingTypeSelector');
    if (!listingSelector || listingSelector.querySelector('.swipe-hint')) {
        return; // Already exists or selector not found
    }
    
    // Create subtle swipe hint
    const hint = document.createElement('div');
    hint.className = 'swipe-hint';
    hint.style.cssText = `
        text-align: center;
        font-size: 11px;
        color: #9ca3af;
        margin-top: 4px;
        opacity: 0.7;
        user-select: none;
        animation: fadePulse 2s infinite;
    `;
    hint.textContent = '← Swipe to switch →';
    
    listingSelector.parentElement.appendChild(hint);
    
    // Add CSS animation for the fade pulse
    if (!document.querySelector('#swipe-hint-styles')) {
        const style = document.createElement('style');
        style.id = 'swipe-hint-styles';
        style.textContent = `
            @keyframes fadePulse {
                0%, 100% { opacity: 0.3; }
                50% { opacity: 0.8; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Fade out after a few seconds
    setTimeout(() => {
        hint.style.transition = 'opacity 1s ease';
        hint.style.opacity = '0';
        setTimeout(() => hint.remove(), 1000);
    }, 5000); // Increased from 3000 to 5000
}