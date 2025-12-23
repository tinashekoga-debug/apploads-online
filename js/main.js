// ===========================================
// OPTIMIZED IMPORTS - main.js
// ===========================================

// 1. CONFIGURATION FIRST (Before anything else)
import { getUserRegion, getRegionalPosts } from './regional-targeting.js'; // ⬅️ ADD THIS LINE
import { countries } from './countries.js'; // ⬅️ ADD THIS LINE

// 1. UI & UTILITIES FIRST (Fast - no external dependencies)
import { registerServiceWorker, checkForUpdates, cleanupCaches, setupPWAInstallationHandler } from './sw-register.js';
import { OfflineQueue } from './offline-queue.js';
import { goto, checkAuthThen, showToast, closePopup, fmtMoney, escapeHtml, fillSelect, showLoading, hideLoading, setLoadingError } from './ui.js';
// Add this to your imports section - put it with the UI imports
import { skeletonLoader } from './skeleton-loader.js';
import { lazyImageLoader } from './lazy-loading.js';
import { setupInstallPrompt, checkInstallStatus, updateAccountInstallButton } from './install-prompt.js'; // ADD updateAccountInstallButton here
import { initMarketplacePosting } from './marketplace-posting.js';

// 2. CORE APP LOGIC (Medium - uses UI utilities)
import { renderLoads, postLoad, clearPostForm } from './loads.js';
import { renderSales, postSale } from './sales-posts.js';
import { renderServices } from './services-posts.js';
import { loadUserProfile, renderAccount } from './profile.js';
import { loadRatingFor, calculateOwnerRatings, initializeRatings } from './ratings.js';
import { setupLoadFilters, clearLoadFilters } from './filters.js'; // ADD clearSaleFilters here
import { setupImagePreview, createImageModal } from './images.js';
import { setupReportFunctionality } from './report.js';
import { initializePopovers } from './popovers.js';
// Add to imports (around other imports)
import { initializeSettingsDrawer } from './settings.js';
// Add to your imports section
import { setupMarketplaceReporting } from './marketplace-reporting.js';
import { updateUnreadBadge } from './chat-controller.js';
import { setupMarketplaceFilters, clearMarketplaceFilters } from './marketplace-filters.js';
import { showFeedbackForm } from './feedback.js';
import { openListing } from './marketplace-listing.js';
// Add to imports section
import { 
  initializeMarketplaceDrawer, 
  openFilterDrawer, 
  closeFilterDrawer,
  handleListingTypeSelect,
  handleMultiSelectChip,
  applyMarketplaceFiltersFromDrawer,  // ✅ CORRECT NAME
  resetMarketplaceFilters,
  handleSearchInput,
  handleCountryChange
} from './marketplace-drawer.js';

// 3. DATA LOADER
import { DataLoader } from './data-loader.js';
import { setupAfiAI } from './ai-integration.js';

// 4. EXTERNAL SERVICES LAST (Slow - network dependencies)
import { trackEvent } from './firebase-config.js';
import { auth, onAuthStateChanged, collection, getDocs, query, orderBy, doc, setDoc, getDoc, deleteDoc, db } from './firebase-config.js';
import { authOpen, authClose, switchAuth, doGoogleSignin } from './auth.js';
// Add to imports section:
import { initializeDataFramework } from './data-framework.js';

// URL hash handling
import { handlePostUrl, setupHashListener } from './url-hash-handler.js';
// Exit prevention
import { setupExitPrevention } from './exit-prevention.js';
// Admin utils
import { ADMIN_EMAILS, isAdminUser } from './admin-utils.js';
// ID utils
import { uid, ownerKey } from './utils-id.js';

// ==========================================
// SVG Icon Sprite Loader (Modern)
// ==========================================
async function loadSVGSprite() {
    // Prevent double-loading
    if (document.getElementById('svg-sprite-container')) {
        return;
    }

    try {
        const response = await fetch('icons.svg');
        if (!response.ok) throw new Error('SVG sprite not found');
        
        const svgContent = await response.text();
        
        const container = document.createElement('div');
        container.id = 'svg-sprite-container';
        container.style.display = 'none';
        container.setAttribute('aria-hidden', 'true');
        container.innerHTML = svgContent;
        
        document.body.insertBefore(container, document.body.firstChild);
        console.log('✅ SVG icons loaded');
    } catch (error) {
        console.error('❌ Error loading SVG icons:', error);
    }
}

// Load immediately
loadSVGSprite();

// ===========================================
// ✅ DETECT USER REGION IMMEDIATELY (Top-level)
// ===========================================
console.log('🌍 Detecting user region at app startup...');
const detectedRegion = getUserRegion();
console.log('📍 User region detected:', detectedRegion);

// Store it globally so it's always available
window.userRegion = detectedRegion;

// ===========================================
// top-level of main.js, after your imports
setupLoadFilters(() => {
    if (typeof renderLoads === 'function') renderLoads();
});

setupMarketplaceFilters(() => {
    if (typeof renderSales === 'function') renderSales();
});

// =========================
// DATA LOADER
// =========================
const dataLoader = new DataLoader();

// ✅ ADD THIS: Re-export Firebase utilities for other modules
export { db, auth, doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, orderBy } from './firebase-config.js';

// DELETE this entire block:
// export const countries = ['Angola','Botswana','DR Congo','Eswatini','Lesotho','Malawi','Mozambique','Namibia','South Africa','Tanzania','Zambia','Zimbabwe'];

// Add this line immediately after:
window.countries = countries;

// =========================
// CENTRALIZED STATE - All mutable state in one object
// =========================
export const state = {
    currentUser: null,
    profile: null,
    loads: [],
    sales: [],
    loadRatings: {},
    ownerRatings: {},
    myVotes: {},
    isLoadingAuth: false,
    isInitialLoad: true,
    countries: countries // ADD THIS LINE
};

// =========================
// PAGINATION STATE
// =========================
export const pagination = {
    loads: {
        limit: 100,
        displayed: 100,
        total: 0
    },
    sales: {
        limit: 25,
        displayed: 25,
        total: 0
    }
};

// =========================
// FILTER STATE MANAGEMENT
// =========================
export const filterState = {
    sales: {
        category: 'all',
        country: 'all', 
        search: ''
    }
};

// =========================
// Double-tap Exit Prevention State
// =========================
let backButtonPressed = false;
let backButtonTimer = null;

// =========================
// Firestore Helper Functions
// =========================
async function loadUserVotes(uid) {
    try {
        const votesDoc = await getDoc(doc(db, 'userVotes', uid));
        if (votesDoc.exists()) {
            state.myVotes = votesDoc.data().loadVotes || {};
        } else {
            state.myVotes = {};
        }
    } catch (e) {
        console.error('Error loading votes:', e);
    }
}

// =========================
// SIMPLE DATA LOADING
// =========================
async function loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
        const { loads, sales } = await dataLoader.loadInitialData();
        state.loads = loads;
        state.sales = sales;
        
        // ✅ FIX: Load ratings data with proper initialization
        const ratingsData = await dataLoader.loadRatingsData();
        
        // Initialize ratings - multiple fallbacks for reliability
        if (typeof initializeRatings === 'function') {
            initializeRatings(ratingsData);
        } else if (window.initializeRatings) {
            window.initializeRatings(ratingsData);
        } else {
            // Direct initialization as final fallback
            state.loadRatings = ratingsData;
            if (typeof calculateOwnerRatings === 'function') {
                calculateOwnerRatings();
            } else if (window.calculateOwnerRatings) {
                window.calculateOwnerRatings();
            }
        }
        
        // ✅ ADD THIS LINE - Update UI with regional targeting
        renderHome();  // ⬅️ ADD THIS!
        renderLoads();
        renderSales();
        
        // Load rest in background
        loadAllData();
    } catch (error) {
        console.error('❌ Failed to load initial data:', error);
        showToast('Network issue: Showing limited data. Check connection.', 'warning');
        
        // Set empty arrays to prevent crashes
        state.loads = [];
        state.sales = [];
        state.loadRatings = {};
        state.ownerRatings = {};
        
        // Still render UI but with empty state
        renderHome();  // ⬅️ ADD THIS TOO!
        renderLoads();
        renderSales();
    }
}

async function loadAllData() {
    console.log('🔄 Loading all data in background...');
    
    try {
        const { loads, sales } = await dataLoader.loadAllData();
        state.loads = loads;
        state.sales = sales;
        
        // ✅ FIX: Reload ratings data with proper initialization
        const ratingsData = await dataLoader.loadRatingsData();
        
        // Initialize ratings - multiple fallbacks for reliability
        if (typeof initializeRatings === 'function') {
            initializeRatings(ratingsData);
        } else if (window.initializeRatings) {
            window.initializeRatings(ratingsData);
        } else {
            // Direct initialization as final fallback
            state.loadRatings = ratingsData;
            if (typeof calculateOwnerRatings === 'function') {
                calculateOwnerRatings();
            } else if (window.calculateOwnerRatings) {
                window.calculateOwnerRatings();
            }
        }
        
        // Silently update UI
        setTimeout(() => {
            renderHome();  // ✅ This is already here - good!
            renderLoads(); 
            renderSales();
        }, 100);
    } catch (error) {
        console.error('❌ Failed to load background data:', error);
        // Don't show toast for background failures - initial data should be enough
    }
}

// =========================
// Home - Real data only with skeletons
// =========================
export function renderHome() {
    const hL = document.getElementById('homeLatestLoads');
    const hS = document.getElementById('homeLatestSales');
    
    // ✅ ALWAYS call getRegionalPosts (it handles empty arrays)
    const { loads, sales } = getRegionalPosts(state.loads, state.sales);
    
    // Show loads or skeleton
    if (loads.length === 0) {
        hL.innerHTML = skeletonLoader.createLoadSkeleton(2);
    } else {
        hL.innerHTML = loads.map(l => {
            const loadRat = loadRatingFor(l.id);
            return `
                <div class='card'>
                    <div class='between'>
                        <strong>${escapeHtml(l.cargo)}</strong>
                        <span class='price'>${fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total')}</span>
                    </div>
                    <div class='muted mt6'>${escapeHtml(l.originCity)}, ${escapeHtml(l.originCountry)} → ${escapeHtml(l.destCity)}, ${escapeHtml(l.destCountry)}</div>
                    <div class='home-load-meta'>
                        <span class="chip terms">${escapeHtml(l.terms || '—')}</span>
                        <span class="chip rating">⭐ ${loadRat.count ? loadRat.avg.toFixed(1) : '—'}${loadRat.count ? ' ('+loadRat.count+')' : ''}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Show sales or skeleton
    if (sales.length === 0) {
        hS.innerHTML = skeletonLoader.createSaleSkeleton(1);
    } else {
        hS.innerHTML = sales.map(s => {
            const images = Array.isArray(s.images) ? s.images : (s.image ? [s.image] : []);
            
            return `
                <div class='card'>
                    <div class='sale-card-home'>
                        <img src='${images[0] || 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="420" height="280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#0b7d62"/><stop offset="100%" stop-color="#20a58a"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="26" font-weight="700">' + (s.title||'Truck').replace(/</g,'&lt;') + '</text></svg>')}' alt='${escapeHtml(s.title)}' 
                             style='width: 100%; height: 120px; object-fit: cover; border-radius: 8px;'/>
                        <div class='sale-details-home'>
                            <div class='between'>
                                <strong>${escapeHtml(s.title)}</strong>
                                <span class='price'>${fmtMoney(s.price || 0, s.currency || 'USD')}</span>
                            </div>
                            <div class='muted mt6'>${escapeHtml(s.city)}, ${escapeHtml(s.country)}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// =========================
// DOM & Selects
// =========================
const originCountryEl = document.getElementById('originCountry');
const destCountryEl = document.getElementById('destCountry');
const filterOriginEl = document.getElementById('filterOrigin');
const filterDestEl = document.getElementById('filterDest');
const saleCountryEl = document.getElementById('saleCountry');
const salesFilterCountryEl = document.getElementById('salesFilterCountry');

// These will be filled after DOM is ready - see DOMContentLoaded event below

// =========================
// APP INITIALIZATION - SINGLE DOMContentLoaded LISTENER
// =========================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM Ready - Initializing app');
    
    // 1. Register Service Worker first
    registerServiceWorker();
    if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
  
    // 2. Setup exit prevention for mobile
    setupExitPrevention();
    
    // 3. Fill country dropdowns
    const originCountryEl = document.getElementById('originCountry');
    const destCountryEl = document.getElementById('destCountry');
    const filterOriginEl = document.getElementById('filterOrigin');
    const filterDestEl = document.getElementById('filterDest');
    const saleCountryEl = document.getElementById('saleCountry');
    const salesFilterCountryEl = document.getElementById('salesFilterCountry');
    
    // Fill country selects with "Other" option for post forms
    [originCountryEl, destCountryEl].forEach(s => {
        if (s) {
            fillSelect(s, countries);
            const otherOption = document.createElement('option');
            otherOption.value = 'Other';
            otherOption.textContent = 'Other';
            s.appendChild(otherOption);
        }
    });
    
    // Fill filter dropdowns
    [filterOriginEl, filterDestEl].forEach(s => {
        if (s) {
            fillSelect(s, ['All', ...countries]);
            const otherOption = document.createElement('option');
            otherOption.value = 'Other';
            otherOption.textContent = 'Other';
            s.appendChild(otherOption);
        }
    });
    
  if (saleCountryEl) fillSelect(saleCountryEl, countries);
if (salesFilterCountryEl) fillSelect(salesFilterCountryEl, ['All', ...countries]);

// ✅ ADD THIS - Wire up marketplace country filter
const filterCountryEl = document.getElementById('filterCountry');
if (filterCountryEl) {
    filterCountryEl.addEventListener('change', (e) => {
        console.log('🌍 Country filter changed:', e.target.value);
        handleCountryChange(e.target.value);
        // Update the filter count immediately
        if (typeof window.updateFilterCount === 'function') {
            window.updateFilterCount();
        }
    });
}
    
    // 4. Tab Navigation
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => goto(tab.dataset.target));
    });

    // 5. Filter chips
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.addEventListener('click', function() {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            trackEvent('filter_used', {
                filter_type: 'load_sort',
                value: this.dataset.filter,
                item_type: 'load'
            });
            
            pagination.loads.displayed = pagination.loads.limit;
            renderLoads();
        });
    });
    
    // 6. Initialize features
    initializePopovers();
    setupInstallPrompt();
    setupPWAInstallationHandler();
    initializeMarketplaceDrawer();
  initializeSettingsDrawer(); // ADD THIS LINE
    // Add to initialization section (after auth initialization):
initializeDataFramework();
  setupAfiAI()
  setupReportFunctionality();
    setupMarketplaceReporting();
    
    // Only setup image preview if element exists
    if (document.getElementById('saleImage')) {
        setupImagePreview();
    }
  if (document.getElementById('postImages')) {
    setupImagePreview();
}
    
    // Initialize image modal
    initializeImageModal();
    
    // Initialize lazy loading
    lazyImageLoader.init();
    
    // Initialize marketplace posting
    initMarketplacePosting();
    
    // Setup filters
    setupLoadFilters(() => {
        if (typeof renderLoads === 'function') renderLoads();
    });
    
    setupMarketplaceFilters(() => {
        if (typeof renderSales === 'function') renderSales();
    });
    
    // 7. Show loading spinner
    showLoading('Loading AppLoads...');
    
    // 8. Start auth state management
    state.isLoadingAuth = true;
    onAuthStateChanged(auth, async (user) => {
        state.currentUser = user;
        state.isLoadingAuth = false;
        
        if (user) {
            console.log('✅ User authenticated:', user.email);
            try {
                await loadUserProfile(user.uid);
                await loadUserVotes(user.uid);
                renderAccount();
            } catch (e) {
                console.error('Error loading user data:', e);
            }
        } else {
            console.log('❌ No user authenticated');
            state.profile = null;
            state.myVotes = {};
            renderAccount();
        }
    });
    
    // 9. Wait 3 seconds for spinner, then show skeletons
    setTimeout(() => {
        hideLoading();
        renderHome();
        renderLoads();
        renderSales();
        renderAccount();
      // Update unread message badge
        updateUnreadBadge();
        console.log('✅ 3-second spinner complete, showing skeletons');
        
        // 10. Load real data in background
        loadInitialData().then(() => {
            console.log('✅ Data loaded after spinner and skeletons');
        }).catch(error => {
            console.error('❌ Data load failed:', error);
        });
    }, 3000);
    
    // 11. Handle direct post URLs
  setTimeout(() => handlePostUrl(), 1000);
  
  // Enable hashchange handler
setupHashListener();
    
    // 12. Update install button status
    setTimeout(updateAccountInstallButton, 1000);
    
    console.log('✅ App initialized');

// ⭐ Show UI ONLY after everything is ready
document.documentElement.classList.add('ready');
});

// =========================
// Event Delegation for data-action buttons
// =========================
document.addEventListener('click', function(e) {
    // =========================
    // PRIORITY 1: Handle multi-select chips FIRST (before anything else)
    // =========================
    const multiSelectChip = e.target.closest('.filter-chip.multi-select');
    if (multiSelectChip) {
        console.log('🟢 Multi-select chip detected:', multiSelectChip.dataset.category);
        e.preventDefault();
        e.stopPropagation();
        handleMultiSelectChip(multiSelectChip, e); // ✅ Pass the event!
        return; // CRITICAL: Stop processing other handlers
    }
    
    // =========================
    // PRIORITY 2: Handle listing type selector chips
    // =========================
    const listingChip = e.target.closest('#listingTypeSelector .chip');
    if (listingChip) {
        const filterValue = listingChip.dataset.filterValue;
        console.log('🔵 Listing type chip clicked:', filterValue);
        e.preventDefault();
        e.stopPropagation();
        handleListingTypeSelect(filterValue);
        return; // Prevent other handlers from running
    }
    
    // =========================
    // PRIORITY 3: Handle regular data-action buttons
    // =========================
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    
    switch(action) {
        case 'browse-loads':
            trackEvent('navigation', { from: 'home', to: 'loads', action: 'browse_loads' });
            goto('loads');
            break;
            
        case 'browse-trucks':
            trackEvent('navigation', { from: 'home', to: 'sales', action: 'browse_trucks' });
            goto('sales');
            break;
            
        // =========================
        // MARKETPLACE DRAWER ACTIONS
        // =========================
        case 'open-filter-drawer':
            openFilterDrawer();
            break;
            
        case 'reset-filters':
    resetMarketplaceFilters();
    renderSales(); // ✅ Add this line
    break;
            
        case 'reset-filters':
            resetMarketplaceFilters();
            break;
            
        case 'apply-filters':
    applyMarketplaceFiltersFromDrawer();  // ✅ CORRECT NAME
    break;
            
        case 'post-load': {
    trackEvent('navigation', { from: 'home', to: 'post', action: 'post_load' });

    // 🔄 Reset edit mode when opening Post normally
    const form = document.getElementById('postLoadForm') || document.getElementById('post');
    if (form) {
        delete form.dataset.editingId;
    }

    const submitBtn = document.querySelector('[data-action="submit-load"]');
    if (submitBtn) {
        submitBtn.textContent = 'Post Load';
        delete submitBtn.dataset.editId;
    }

    const postBtn = document.getElementById('postLoadBtn');
    const editActions = document.getElementById('editLoadActions');

    if (postBtn) postBtn.style.display = 'block';
    if (editActions) editActions.style.display = 'none';

    clearPostForm();
    checkAuthThen('post');
    break;
}
      
      case 'cancel-edit-load':
    const form = document.getElementById('postLoadForm');

    if (form) {
        delete form.dataset.editingId;
    }

    const submitBtn = document.querySelector('[data-action="submit-load"]');
    if (submitBtn) {
        submitBtn.textContent = 'Post Load';
        delete submitBtn.dataset.editId;
    }

    const postBtn = document.getElementById('postLoadBtn');
    const editActions = document.getElementById('editLoadActions');

    if (postBtn) postBtn.style.display = 'block';
    if (editActions) editActions.style.display = 'none';

    clearPostForm();
    goto('account');
    break;
            
        case 'post-truck':
            trackEvent('navigation', { from: 'home', to: 'sales', action: 'post_truck' });
            checkAuthThen('sales', 'postSaleAnchor');
            break;
            
        case 'open-post-modal':
            // This will be handled by marketplace-posting.js
            break;
            
        case 'clear-filters':
            const filterOriginEl = document.getElementById('filterOrigin');
            const filterDestEl = document.getElementById('filterDest');
            const filterText = document.getElementById('filterText');
            clearLoadFilters(filterOriginEl, filterDestEl, filterText);
            if (typeof renderLoads === 'function') {
                renderLoads();
            }
            break;
        
        case 'clear-sale-filters':
    console.log('🗑️ Clearing marketplace filters via button');
    
    // Call the full reset function instead of just clearing
    if (typeof resetMarketplaceFilters === 'function') {
        resetMarketplaceFilters();
    } else if (window.resetMarketplaceFilters) {
        window.resetMarketplaceFilters();
    } else {
        // Fallback: manual reset
        clearMarketplaceFilters();
        const salesFilterText = document.getElementById('salesFilterText');
        if (salesFilterText) salesFilterText.value = '';
    }
    
    // Re-render
    if (typeof renderSales === 'function') {
        renderSales();
    }
    break;
            
        case 'submit-load':
            postLoad();
            break;
            
        case 'submit-truck':
            postSale();
            break;
            
        case 'close-popup':
            closePopup();
            break;
            
        case 'close-auth':
            authClose();
            break;
            
        case 'signin-tab':
            switchAuth('signin');
            break;
            
        case 'signup-tab':
            switchAuth('signup');
            break;
            
        case 'google-signin':
            doGoogleSignin();
            break;
            
        default:
            break;
    }
}); // <-- End of click event listener (notice the closing parenthesis and semicolon)

// ✅ Initialize image modal when app loads - SINGLE INITIALIZATION
function initializeImageModal() {
    try {
        createImageModal();
        console.log('✅ Image modal initialized');
    } catch (err) {
        console.error('Failed to initialize image modal:', err);
    }
}

// =========================
// MARKETPLACE FILTER EVENT HANDLERS
// =========================

// Search input handler
document.addEventListener('input', function(e) {
    if (e.target.id === 'salesFilterText') {
        handleSearchInput(e.target.value);
    }
});

// Country select handler  
document.addEventListener('change', function(e) {
    if (e.target.id === 'filterCountry') {
        const countryCode = e.target.value;
        console.log('🌍 Country filter changed:', countryCode);
        handleCountryChange(countryCode);
        
        // Also import and call updateFilterCount
        if (typeof window.updateFilterCount === 'function') {
            window.updateFilterCount();
        }
    }
});

