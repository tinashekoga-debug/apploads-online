// ===========================================
// marketplace-filters.js (FIXED)
// ===========================================
// Handles all marketplace filtering functionality
// ===========================================

import { trackEvent } from './firebase-config.js';

// =========================
// Marketplace Filter State Management
// =========================
export const marketplaceFilterState = {
    country: '',
    listingType: 'sales',
    categories: [],
    searchText: ''
};

// =========================
// Marketplace Filter Application Logic
// =========================
export function applyMarketplaceFilters(sales) {
    let filteredSales = [...sales];
    const state = marketplaceFilterState;

    console.log('🔍 Applying marketplace filters:', state);

    // ✅ FIXED: Apply listing type filter with proper singular/plural handling
    if (state.listingType) {
        filteredSales = filteredSales.filter(sale => {
            const saleType = sale.type || 'sale';

            // Normalize: 'sales' -> 'sale', 'services' -> 'service'
            const normalizedListingType = state.listingType === 'sales' ? 'sale' : 
                                         state.listingType === 'services' ? 'service' : 
                                         state.listingType;

            // Match normalized types
            return saleType === normalizedListingType;
        });
        console.log(`📋 After listing type filter (${state.listingType}):`, filteredSales.length);
    }

    // Apply country filter
    if (state.country && state.country !== '') {
        filteredSales = filteredSales.filter(sale => sale.country === state.country);
        console.log(`🌍 After country filter (${state.country}):`, filteredSales.length);
    }

    // Apply category filter - handle multiple categories
    if (state.categories.length > 0) {
        filteredSales = filteredSales.filter(sale => 
            state.categories.includes(sale.category)
        );
        console.log(`🏷️ After category filter (${state.categories.join(', ')}):`, filteredSales.length);
    }

    // Apply text search (supports both sales + services)
    if (state.searchText) {
        filteredSales = filteredSales.filter(sale => {
            const searchable = `
                ${sale.title || ''}
                ${sale.description || ''}
                ${sale.businessName || ''}
                ${sale.serviceDescription || ''}
                ${sale.serviceAddress || ''}
                ${sale.city || ''}
                ${sale.country || ''}
            `.toLowerCase();

            return searchable.includes(state.searchText);
        });
        console.log(`🔍 After search filter:`, filteredSales.length);
    }

    console.log('📊 Marketplace filter results:', {
        original_count: sales.length,
        filtered_count: filteredSales.length,
        filters: state
    });

    return filteredSales;
}

// =========================
// Marketplace Filter State Updates
// =========================
export function updateMarketplaceCountryFilter(country) {
    marketplaceFilterState.country = country;
    console.log('🌍 Marketplace country filter updated:', country);
}

export function updateMarketplaceCategoryFilter(categories) {
    marketplaceFilterState.categories = categories;
    console.log('🏷️ Marketplace categories updated:', categories);
}

export function updateMarketplaceSearchFilter(searchText) {
    marketplaceFilterState.searchText = searchText ? searchText.toLowerCase() : '';
    console.log('🔍 Marketplace search updated:', searchText);
}

export function updateMarketplaceListingType(listingType) {
    marketplaceFilterState.listingType = listingType;
    console.log('📋 Marketplace listing type updated:', listingType);
}

// =========================
// Marketplace Filter Clearing
// =========================
export function clearMarketplaceFilters() {
    console.log('🗑️ Clearing all marketplace filters');
    
    marketplaceFilterState.country = '';
    marketplaceFilterState.categories = [];
    marketplaceFilterState.searchText = '';
    marketplaceFilterState.listingType = 'sales';
    
    // Track filter clearing
    trackEvent('clear_filters', {
        filter_type: 'marketplace'
    });
}

// =========================
// Marketplace Filter State Getters
// =========================
export function getMarketplaceFilterState() {
    return { ...marketplaceFilterState };
}

export function getActiveMarketplaceFilterCount() {
    let count = 0;
    
    // Country filter
    if (marketplaceFilterState.country && marketplaceFilterState.country !== '') count++;
    
    // Categories
    count += marketplaceFilterState.categories.length;
    
    // Search (only count if not empty)
    if (marketplaceFilterState.searchText && marketplaceFilterState.searchText.trim()) count++;
    
    // Listing type (only count if not default 'sales')
    if (marketplaceFilterState.listingType !== 'sales') count++;
    
    console.log('🔢 Active marketplace filter count:', count, {
        country: marketplaceFilterState.country,
        categories: marketplaceFilterState.categories,
        search: marketplaceFilterState.searchText,
        listingType: marketplaceFilterState.listingType
    });
    
    return count;
}

// =========================
// Marketplace Filter Setup Functions
// =========================
export function setupMarketplaceFilters(renderSalesCallback) {
    console.log('[setupMarketplaceFilters] running...');
    
    const salesFilterText = document.getElementById('salesFilterText');
    const clearFiltersBtn = document.querySelector('[data-action="clear-sale-filters"]');

    console.log('[setupMarketplaceFilters] Elements found:', {
        salesFilterText: !!salesFilterText,
        clearFiltersBtn: !!clearFiltersBtn
    });

    // Add event listener for search input
    if (salesFilterText) {
        salesFilterText.addEventListener('input', () => {
            console.log('[setupMarketplaceFilters] search input triggered');
            updateMarketplaceSearchFilter(salesFilterText.value);
            if (renderSalesCallback && typeof renderSalesCallback === 'function') {
                renderSalesCallback();
            }
        });
    }

    // Add event listener for clear filters button
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            console.log('[setupMarketplaceFilters] clear filters button clicked');
            clearMarketplaceFilters();
            if (salesFilterText) salesFilterText.value = '';
            if (renderSalesCallback && typeof renderSalesCallback === 'function') {
                renderSalesCallback();
            }
        });
    }
}