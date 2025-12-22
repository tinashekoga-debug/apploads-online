// ===========================================
// marketplace-drawer.js
// ===========================================
// Handles marketplace filter drawer functionality:
// - Drawer open/close animations
// - Filter state management
// - Multi-select category handling
// - Filter count updates
// - WhatsApp-style swipe gestures
// ===========================================

import { trackEvent } from './firebase-config.js';
import { renderSales } from './sales-posts.js';
import { state } from './main.js';
import { 
    marketplaceFilterState,
    updateMarketplaceCountryFilter,
    updateMarketplaceCategoryFilter,
    updateMarketplaceSearchFilter,
    updateMarketplaceListingType,
    clearMarketplaceFilters,
    getActiveMarketplaceFilterCount,
    applyMarketplaceFilters
} from './marketplace-filters.js';
import { initializeTabSwipe, addSwipeIndicator } from './marketplace-drawer-swipe.js';

// =========================
// Constants
// =========================
const ANIMATION_DURATION = 300; // ms
const SWIPE_THRESHOLD = 100; // pixels to trigger close
const SWIPE_VELOCITY_THRESHOLD = 0.5; // pixels per ms

// =========================
// Module State
// =========================
let swipeState = {
    startY: 0,
    currentY: 0,
    startTime: 0,
    isDragging: false,
    initialScrollTop: 0
};

// =========================
// Drawer Management
// =========================
export function openFilterDrawer() {
    const drawer = document.getElementById('filter-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    
    if (!drawer) {
        console.error('❌ Filter drawer element not found');
        return;
    }
    
    console.log('🎯 Opening filter drawer');
    
    // Remove hidden class and prepare for animation
    drawer.classList.remove('hidden');
    if (backdrop) {
        backdrop.style.display = 'block';
    }
    
    // Force reflow
    drawer.offsetHeight;
    
    requestAnimationFrame(() => {
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
        document.body.classList.add('drawer-open');
        document.body.style.overflow = 'hidden';
        
        updateFilterCount();
    });
    
    trackEvent('filter_drawer_open', {
        has_active_filters: getActiveMarketplaceFilterCount() > 0
    });
}

export function closeFilterDrawer() {
    const drawer = document.getElementById('filter-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    
    if (!drawer) return;
    
    console.log('🎯 Closing filter drawer');
    
    // Clear inline styles first
drawer.style.transition = '';
drawer.style.transform = '';

drawer.classList.remove('open');
if (backdrop) backdrop.classList.remove('active');
document.body.classList.remove('drawer-open');
document.body.style.overflow = '';
    
    setTimeout(() => {
        if (!drawer.classList.contains('open')) {
            drawer.classList.add('hidden');
            if (backdrop) backdrop.style.display = 'none';
        }
    }, ANIMATION_DURATION);
}

// =========================
// Swipe to Close Gesture
// =========================
function handleSwipeStart(e) {
    const drawer = document.getElementById('filter-drawer');
    if (!drawer) return;
    
    const drawerContent = drawer.querySelector('.drawer-content');
    if (!drawerContent) return;
    
    // Only start swipe if at top of scroll or swiping on drag handle
    const isOnHandle = e.target.closest('.drawer-drag-handle');
    const scrollTop = drawerContent.scrollTop;
    
    if (!isOnHandle && scrollTop > 5) {
        return; // Let normal scrolling happen
    }
    
    swipeState.startY = e.touches[0].clientY;
    swipeState.currentY = swipeState.startY;
    swipeState.startTime = Date.now();
    swipeState.isDragging = true;
    swipeState.initialScrollTop = scrollTop;
    
    drawer.style.transition = 'none';
}

function handleSwipeMove(e) {
    if (!swipeState.isDragging) return;
    
    const drawer = document.getElementById('filter-drawer');
    if (!drawer) return;
    
    swipeState.currentY = e.touches[0].clientY;
    const deltaY = swipeState.currentY - swipeState.startY;
    
    // Only allow downward swipes (closing)
    if (deltaY > 0) {
        e.preventDefault();
        
        // Apply transform to slide drawer down
        drawer.style.transform = `translateY(${deltaY}px)`;
        
        // Fade backdrop proportionally
        const backdrop = document.getElementById('drawer-backdrop');
        if (backdrop) {
            const opacity = Math.max(0, 1 - (deltaY / 300));
            backdrop.style.opacity = opacity;
        }
    }
}

function handleSwipeEnd(e) {
    if (!swipeState.isDragging) return;
    
    const drawer = document.getElementById('filter-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer) return;
    
    const deltaY = swipeState.currentY - swipeState.startY;
    const deltaTime = Date.now() - swipeState.startTime;
    const velocity = deltaY / deltaTime;
    
    swipeState.isDragging = false;
    
    // Determine if we should close
    const shouldClose = deltaY > SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY_THRESHOLD;
    
    // Re-enable CSS transitions
drawer.style.transition = 'transform 0.3s ease';
if (backdrop) backdrop.style.opacity = '';

if (shouldClose) {
    // Animate to fully closed position
    drawer.style.transform = 'translateY(100%)';
    setTimeout(() => {
        closeFilterDrawer();
    }, 300);
} else {
    // Snap back to open position
    drawer.style.transform = 'translateY(0)';
}
}

// =========================
// Filter Selection Handlers
// =========================
export function handleListingTypeSelect(selectedType) {
    console.log('🎯 Switching to listing type:', selectedType);
    
    document.querySelectorAll('#listingTypeSelector .chip').forEach(chip => {
        chip.classList.remove('active');
        if (chip.dataset.filterValue === selectedType) {
            chip.classList.add('active');
        }
    });
    
    updateMarketplaceListingType(selectedType);
    
    document.querySelectorAll('.sub-category-section').forEach(section => {
        const shouldShow = section.dataset.sectionId === selectedType;
        console.log('Section:', section.dataset.sectionId, 'Should show:', shouldShow);
        section.classList.toggle('hidden', !shouldShow);
    });
    
    updateMarketplaceCategoryFilter([]);
    document.querySelectorAll('.filter-chip.multi-select').forEach(chip => {
        chip.classList.remove('active');
    });
    
    updateFilterCount();
    
    trackEvent('listing_type_selected', {
        type: selectedType
    });
}

export function handleMultiSelectChip(clickedChip, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    
    const category = clickedChip.dataset.category;
    const isActive = clickedChip.classList.contains('active');
    
    console.log('🎯 Multi-select chip clicked:', category, 'Currently active:', isActive);
    console.log('📊 Current categories before update:', [...marketplaceFilterState.categories]);
    
    let currentCategories = [...marketplaceFilterState.categories];
    
    if (isActive) {
        clickedChip.classList.remove('active');
        currentCategories = currentCategories.filter(c => c !== category);
    } else {
        clickedChip.classList.add('active');
        if (!currentCategories.includes(category)) {
            currentCategories.push(category);
        }
    }
    
    console.log('📊 Categories after update:', currentCategories);
    
    updateMarketplaceCategoryFilter(currentCategories);
    updateFilterCount();
    
    trackEvent('category_filter_toggled', {
        category: category,
        action: isActive ? 'removed' : 'added',
        total_selected: currentCategories.length
    });
}

// =========================
// Filter Count Management
// =========================
export function updateFilterCount() {
    const count = getActiveMarketplaceFilterCount();
    const filteredCount = getFilteredResultsCount();
    
    console.log('🔢 Filter count updated:', {
        active_filters: count,
        filtered_results: filteredCount
    });
    
    const filterCountElement = document.getElementById('activeFilterCount');
    if (filterCountElement) {
        filterCountElement.textContent = count > 0 ? `(${count})` : '';
    }
    
    const resultsCountElement = document.getElementById('resultsCount');
    if (resultsCountElement) {
        resultsCountElement.textContent = `(${filteredCount})`;
    }
}

function getFilteredResultsCount() {
    if (!state || !Array.isArray(state.sales)) {
        return 0;
    }
    
    const filteredSales = applyMarketplaceFilters(state.sales);
    return filteredSales.length;
}

// =========================
// Filter Application
// =========================
export function applyMarketplaceFiltersFromDrawer() {
    console.log('🎯 Applying marketplace filters from drawer');
    
    if (typeof renderSales === 'function') {
        renderSales();
    } else {
        console.error('❌ renderSales function not found');
    }
    
    closeFilterDrawer();
    
    trackEvent('filters_applied', {
        country: marketplaceFilterState.country || 'all',
        listing_type: marketplaceFilterState.listingType,
        category_count: marketplaceFilterState.categories.length,
        categories: marketplaceFilterState.categories.join(','),
        has_search: !!marketplaceFilterState.searchText?.trim()
    });
}

export function resetMarketplaceFilters() {
    console.log('🔄 Resetting marketplace filters');
    
    clearMarketplaceFilters();
    
    const countrySelect = document.getElementById('filterCountry');
    if (countrySelect) countrySelect.value = '';
    
    document.querySelectorAll('#listingTypeSelector .chip').forEach(chip => {
        chip.classList.remove('active');
    });
    const salesChip = document.querySelector('.chip[data-filter-value="sales"]');
    if (salesChip) salesChip.classList.add('active');
    
    document.querySelectorAll('.filter-chip.multi-select').forEach(chip => {
        chip.classList.remove('active');
    });
    
    document.querySelectorAll('.sub-category-section').forEach(section => {
        section.classList.toggle('hidden', section.dataset.sectionId !== 'sales');
    });
    
    const searchInput = document.getElementById('salesFilterText');
    if (searchInput) searchInput.value = '';
    
    updateFilterCount();
    
    trackEvent('filters_reset');
}

// =========================
// Search Handler
// =========================
export function handleSearchInput(searchText) {
    updateMarketplaceSearchFilter(searchText);
    updateFilterCount();
}

// =========================
// Country Filter Handler
// =========================
export function handleCountryChange(countryCode) {
    updateMarketplaceCountryFilter(countryCode);
    updateFilterCount();
}

// =========================
// Initialization
// =========================
export function initializeMarketplaceDrawer() {
    console.log('🔄 Initializing marketplace drawer...');
    
    resetMarketplaceFilters();
    
    const backdrop = document.getElementById('drawer-backdrop');
    if (backdrop) {
        backdrop.addEventListener('click', closeFilterDrawer);
    }
    
    const drawer = document.getElementById('filter-drawer');
    if (drawer) {
        // Add swipe gesture listeners
        drawer.addEventListener('touchstart', handleSwipeStart, { passive: false });
        drawer.addEventListener('touchmove', handleSwipeMove, { passive: false });
        drawer.addEventListener('touchend', handleSwipeEnd, { passive: true });
    }
    
    // Initialize horizontal swipe between Sales/Services tabs
    initializeTabSwipe();
    
    setTimeout(() => {
        addSwipeIndicator();
    }, 500);
    
    console.log('✅ Marketplace drawer initialized with WhatsApp-style swipe');
}

// Make functions available globally for data-action handlers
window.openFilterDrawer = openFilterDrawer;
window.closeFilterDrawer = closeFilterDrawer;
window.handleListingTypeSelect = handleListingTypeSelect;
window.handleMultiSelectChip = handleMultiSelectChip;
window.applyMarketplaceFilters = applyMarketplaceFiltersFromDrawer;
window.resetMarketplaceFilters = resetMarketplaceFilters;
window.updateFilterCount = updateFilterCount;