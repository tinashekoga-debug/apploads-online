// ===========================================
// filters.js
// ===========================================
// Handles all LOADS filtering functionality
// ===========================================

import { trackEvent } from './firebase-config.js';

// =========================
// Filter State Management (LOADS ONLY)
// =========================
export const filterState = {
    loads: {
        originCountry: '',
        destCountry: '',
        searchText: '',
        sortType: 'all'
    }
};

// =========================
// Filter Application Logic (LOADS ONLY)
// =========================
export function applyLoadFilters(loads, countries, ownerRatingFor, ownerIdFromItem) {
    let filteredLoads = [...loads];
    const state = filterState.loads;

    // Apply country filters
    if (state.originCountry) {
        filteredLoads = state.originCountry === 'Other' 
            ? filteredLoads.filter(l => !countries.includes(l.originCountry))
            : filteredLoads.filter(l => l.originCountry === state.originCountry);
    }

    if (state.destCountry) {
        filteredLoads = state.destCountry === 'Other'
            ? filteredLoads.filter(l => !countries.includes(l.destCountry))
            : filteredLoads.filter(l => l.destCountry === state.destCountry);
    }

    // Apply text search
    if (state.searchText) {
        filteredLoads = filteredLoads.filter(l => 
            (l.cargo + " " + l.originCity + " " + l.destCity + " " + l.terms).toLowerCase().includes(state.searchText)
        );
    }

    // Apply sorting
    if (state.sortType === 'popular') {
        filteredLoads.sort((a, b) => {
            const aRating = ownerRatingFor(ownerIdFromItem(a)).avg;
            const bRating = ownerRatingFor(ownerIdFromItem(b)).avg;
            return bRating - aRating;
        });
    } else if (state.sortType === 'recent') {
        filteredLoads.sort((a, b) => (b.postedAt || 0) - (a.postedAt || 0));
    }

    return filteredLoads;
}

// =========================
// Filter State Updates (LOADS ONLY)
// =========================
export function updateLoadFilterState(filterOriginEl, filterDestEl, filterText) {
    if (filterOriginEl) filterState.loads.originCountry = filterOriginEl.value;
    if (filterDestEl) filterState.loads.destCountry = filterDestEl.value;
    if (filterText) filterState.loads.searchText = (filterText.value || '').toLowerCase();
}

// =========================
// Filter Clearing (LOADS ONLY)
// =========================
export function clearLoadFilters(filterOriginEl, filterDestEl, filterText) {
    trackEvent('clear_filters', {
        had_origin_filter: !!filterState.loads.originCountry,
        had_dest_filter: !!filterState.loads.destCountry,
        had_search_query: !!filterState.loads.searchText
    });
    
    if (filterOriginEl) filterOriginEl.value = '';
    if (filterDestEl) filterDestEl.value = '';
    if (filterText) filterText.value = '';
    
    filterState.loads.originCountry = '';
    filterState.loads.destCountry = '';
    filterState.loads.searchText = '';
    filterState.loads.sortType = 'all';
}

// =========================
// Filter State Getters
// =========================
export function getFilterState() {
    return { ...filterState };
}

// =========================
// Filter Setup Functions (LOADS ONLY)
// =========================
export function setupLoadFilters(renderLoadsCallback) {
    console.log('[setupLoadFilters] running...');
    const filterOriginEl = document.getElementById('filterOrigin');
    const filterDestEl = document.getElementById('filterDest');
    const filterText = document.getElementById('filterText');
    const clearFiltersBtn = document.querySelector('[data-action="clear-filters"]');

    console.log('[setupLoadFilters] Elements found:', {
        filterOriginEl: !!filterOriginEl,
        filterDestEl: !!filterDestEl,
        filterText: !!filterText,
        clearFiltersBtn: !!clearFiltersBtn
    });

    // attach input listeners only if element exists
    [filterOriginEl, filterDestEl, filterText].forEach(el => {
        if (!el) return;
        el.addEventListener('input', () => {
            console.log('[setupLoadFilters] filter input triggered');
            updateLoadFilterState(filterOriginEl, filterDestEl, filterText);
            renderLoadsCallback();
        });
    });

    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', () => {
            console.log('[setupLoadFilters] clear filters clicked');
            clearLoadFilters(filterOriginEl, filterDestEl, filterText);
            renderLoadsCallback();
        });
    }

    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            console.log('[setupLoadFilters] filter chip clicked', this.dataset.filter);
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            filterState.loads.sortType = this.dataset.filter || 'all';
            renderLoadsCallback();
        });
    });
}