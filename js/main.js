// ===========================================
// OPTIMIZED IMPORTS - main.js
// ===========================================

// 1. UI & UTILITIES FIRST (Fast - no external dependencies)
import { registerServiceWorker, checkForUpdates, cleanupCaches, setupPWAInstallationHandler } from './sw-register.js';
import { OfflineQueue } from './offline-queue.js';
import { goto, checkAuthThen, showToast, closePopup, fmtMoney, escapeHtml, fillSelect, showLoading, hideLoading, setLoadingError } from './ui.js';
// Add this to your imports section - put it with the UI imports
import { skeletonLoader } from './skeleton-loader.js';
import { lazyImageLoader } from './lazy-loading.js';
import { setupInstallPrompt, checkInstallStatus } from './install-prompt.js';


// 2. CORE APP LOGIC (Medium - uses UI utilities)
import { renderLoads, postLoad } from './loads.js';
import { renderSales, postSale } from './sales.js';
import { loadUserProfile, renderAccount } from './profile.js';
import { loadRatingFor, calculateOwnerRatings } from './ratings.js';
import { setupLoadFilters, setupSaleFilters, clearLoadFilters } from './filters.js';
import { setupImagePreview, createImageModal } from './images.js';
import { setupReportFunctionality } from './report.js';
// In your imports section, ensure you have:
import { showFeedbackForm } from './ui.js';

// 3. DATA LOADER
import { DataLoader } from './data-loader.js';

// 4. EXTERNAL SERVICES LAST (Slow - network dependencies)
import { trackEvent } from './firebase-config.js';
import { auth, onAuthStateChanged, collection, getDocs, query, orderBy, doc, setDoc, getDoc, deleteDoc, db } from './firebase-config.js';
import { authOpen, authClose, switchAuth, doGoogleSignin } from './auth.js';

// ===========================================
// MODULE MAP - Where to find things
// ===========================================
// 
// 🔐 AUTH & USER
// - Sign in/up/out, forgot password, Google auth → auth.js
// - Profile editing, account page, logout → profile.js
//
// 📦 CONTENT
// - Posting/editing/viewing/deleting loads → loads.js
// - Posting/editing/viewing/deleting trucks/trailers → sales.js
//
// ⭐ FEATURES
// - Star ratings, owner ratings, voting → ratings.js
//
// 🎨 INTERFACE
// - Navigation, popups, toasts, formatting helpers → ui.js
//
// 🔥 DATA
// - Firebase setup, auth config, database connection → firebase-config.js
// - Data loading → data-loader.js
//
// 🚀 STARTUP
// - App initialization, event listeners, data loading → main.js
//
// ===========================================

// =========================
// DATA LOADER
// =========================
const dataLoader = new DataLoader();

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
    isInitialLoad: true
};

// =========================
// SADC Countries
// =========================
export const countries = ['Angola','Botswana','Comoros','DR Congo','Eswatini','Lesotho','Madagascar','Malawi','Mauritius','Mozambique','Namibia','Seychelles','South Africa','Tanzania','Zambia','Zimbabwe'];

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
// Double-tap Exit Prevention State
// =========================
let backButtonPressed = false;
let backButtonTimer = null;

// =========================
// Double-tap Exit Prevention
// =========================
function setupExitPrevention() {
  window.addEventListener('popstate', function(e) {
    if (!backButtonPressed) {
      // First back button press
      backButtonPressed = true;
      showToast('Press back again to exit', 'warning');
      
      // Reset after 3 seconds
      backButtonTimer = setTimeout(() => {
        backButtonPressed = false;
      }, 3000);
      
      // Push state to prevent immediate exit
      history.pushState(null, null, window.location.href);
    } else {
      // Second back button press - allow exit
      if (backButtonTimer) {
        clearTimeout(backButtonTimer);
      }
      // App will close naturally
    }
  });

  // Prevent initial back button
  history.pushState(null, null, window.location.href);
}

// =========================
// Regional Content Targeting with Silent Fallback
// =========================

// Define fallback order for countries
const COUNTRY_FALLBACK_ORDER = ['South Africa', 'Zimbabwe', 'Zambia'];

function getUserRegion() {
    // 1. Check browser language for country hints
    const browserLang = navigator.language || navigator.userLanguage;
    
    // Common SADC country language codes
    if (browserLang.includes('en-ZA') || browserLang.includes('af-ZA')) return 'South Africa';
    if (browserLang.includes('en-ZW')) return 'Zimbabwe';
    if (browserLang.includes('en-ZM')) return 'Zambia';
    if (browserLang.includes('en-BW') || browserLang.includes('tn-BW')) return 'Botswana';
    if (browserLang.includes('en-NA')) return 'Namibia';
    if (browserLang.includes('en-MW')) return 'Malawi';
    if (browserLang.includes('en-MZ') || browserLang.includes('pt-MZ')) return 'Mozambique';
    if (browserLang.includes('en-TZ') || browserLang.includes('sw-TZ')) return 'Tanzania';
    
    // 2. Default to first in fallback order (South Africa)
    return COUNTRY_FALLBACK_ORDER[0];
}

function getRegionalPosts() {
    const userRegion = getUserRegion();
    console.log('📍 User region detected:', userRegion);
    
    // Get posts for detected region first
    let finalLoads = getLoadsForRegion(userRegion);
    let finalSales = getSalesForRegion(userRegion);
    
    console.log(`📊 ${userRegion} - Loads: ${finalLoads.length}, Sales: ${finalSales.length}`);
    
    // For LOADS: Keep adding from fallback countries until we reach our limit (3)
    if (finalLoads.length < 3) {
        for (const fallbackCountry of COUNTRY_FALLBACK_ORDER) {
            if (fallbackCountry === userRegion) continue;
            if (finalLoads.length >= 3) break;
            
            const fallbackLoads = getLoadsForRegion(fallbackCountry);
            console.log(`🔄 Loads fallback ${fallbackCountry}: ${fallbackLoads.length} available`);
            
            // Add as many as needed from this fallback country
            const needed = 3 - finalLoads.length;
            const toAdd = fallbackLoads.slice(0, needed);
            finalLoads = [...finalLoads, ...toAdd];
            
            console.log(`✅ Added ${toAdd.length} loads from ${fallbackCountry}, total: ${finalLoads.length}`);
        }
        
        // If still not enough, add latest from ANY country
        if (finalLoads.length < 3) {
            const needed = 3 - finalLoads.length;
            const globalLoads = state.loads
                .filter(load => !finalLoads.some(l => l.id === load.id)) // Avoid duplicates
                .slice(0, needed);
            finalLoads = [...finalLoads, ...globalLoads];
            console.log(`🌍 Added ${globalLoads.length} global loads, total: ${finalLoads.length}`);
        }
    }
    
    // For SALES: Keep adding from fallback countries until we reach our limit (2)
    if (finalSales.length < 2) {
        for (const fallbackCountry of COUNTRY_FALLBACK_ORDER) {
            if (fallbackCountry === userRegion) continue;
            if (finalSales.length >= 2) break;
            
            const fallbackSales = getSalesForRegion(fallbackCountry);
            console.log(`🔄 Sales fallback ${fallbackCountry}: ${fallbackSales.length} available`);
            
            // Add as many as needed from this fallback country
            const needed = 2 - finalSales.length;
            const toAdd = fallbackSales.slice(0, needed);
            finalSales = [...finalSales, ...toAdd];
            
            console.log(`✅ Added ${toAdd.length} sales from ${fallbackCountry}, total: ${finalSales.length}`);
        }
        
        // If still not enough, add latest from ANY country
        if (finalSales.length < 2) {
            const needed = 2 - finalSales.length;
            const globalSales = state.sales
                .filter(sale => !finalSales.some(s => s.id === sale.id)) // Avoid duplicates
                .slice(0, needed);
            finalSales = [...finalSales, ...globalSales];
            console.log(`🌍 Added ${globalSales.length} global sales, total: ${finalSales.length}`);
        }
    }
    
    console.log(`🎯 Final - Loads: ${finalLoads.length}, Sales: ${finalSales.length}`);
    
    return {
        loads: finalLoads.slice(0, 3),
        sales: finalSales.slice(0, 2)
    };
}

function getLoadsForRegion(country) {
    return state.loads.filter(load => {
        const isFromRegion = load.originCountry === country;
        const isToRegion = load.destCountry === country;
        
        // Major cross-border routes
        const isMajorRoute = 
            (load.originCountry === 'Zimbabwe' && load.destCountry === 'South Africa') ||
            (load.originCountry === 'Zambia' && load.destCountry === 'South Africa') ||
            (load.originCountry === 'Botswana' && load.destCountry === 'South Africa') ||
            (load.originCountry === 'South Africa' && load.destCountry === 'Zimbabwe') ||
            (load.originCountry === 'South Africa' && load.destCountry === 'Zambia');
        
        return isFromRegion || isToRegion || isMajorRoute;
    });
}

function getSalesForRegion(country) {
    return state.sales.filter(sale => sale.country === country);
}

// Admin configuration
export const ADMIN_EMAILS = ['admin@apploads.app', 'tinashekoga@gmail.com']; // UPDATE WITH YOUR ACTUAL EMAIL

export function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ownerKey() {
    // Prioritize user ID over contact info for authenticated users
    if (state.currentUser) {
        return state.currentUser.uid;
    }
    // Fallback for old data
    return (state.profile?.email || state.profile?.phone || 'anonymous').trim();
}

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
// =========================
// SIMPLE DATA LOADING
// =========================
async function loadInitialData() {
    console.log('📥 Loading initial data...');
    
    try {
        const { loads, sales } = await dataLoader.loadInitialData();
        state.loads = loads;
        state.sales = sales;
        
        // Update UI
        renderHome();
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
        
        // Still render UI but with empty state
        renderHome();
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
        
        // Silently update UI
        setTimeout(() => {
            renderHome();
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
    
    // Show skeletons if no data
    if (state.loads.length === 0 || state.sales.length === 0) {
        hL.innerHTML = skeletonLoader.createLoadSkeleton(2);
        hS.innerHTML = skeletonLoader.createSaleSkeleton(1);
        return;
    }
    
    const { loads, sales } = getRegionalPosts();
    
    // Show loads
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
    }).join('') || `<p class="muted">No loads available. <a href="#" onclick="goto('loads')" style="color: #0b7d62; text-decoration: none;">Browse all loads</a> or <a href="#" onclick="checkAuthThen('post')" style="color: #0b7d62; text-decoration: none;">post the first one!</a></p>`;
    
    // Show sales
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
    }).join('') || `<p class="muted">No trucks available. <a href="#" onclick="goto('sales')" style="color: #0b7d62; text-decoration: none;">Browse all trucks</a> or <a href="#" onclick="checkAuthThen('sales', 'postSaleAnchor')" style="color: #0b7d62; text-decoration: none;">list one for sale!</a></p>`;
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

// Fill country selects but preserve "Other" option for post form
[originCountryEl, destCountryEl].forEach(s => {
    fillSelect(s, false);
    // Add "Other" option after filling with countries
    const otherOption = document.createElement('option');
    otherOption.value = 'Other';
    otherOption.textContent = 'Other';
    s.appendChild(otherOption);
});

// Fill filter dropdowns with "Other" option too
[filterOriginEl, filterDestEl].forEach(s => {
    fillSelect(s, true);
    // Add "Other" option to filters
    const otherOption = document.createElement('option');
    otherOption.value = 'Other';
    otherOption.textContent = 'Other';
    s.appendChild(otherOption);
});

[saleCountryEl].forEach(s => fillSelect(s, false));
[salesFilterCountryEl].forEach(s => fillSelect(s, true));

// =========================
// Tab Navigation
// =========================
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => goto(tab.dataset.target));
});

// Filter chips
document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', function() {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
        
        // Track filter usage
        trackEvent('filter_used', {
            filter_type: 'load_sort',
            value: this.dataset.filter,
            item_type: 'load'
        });
        
        pagination.loads.displayed = pagination.loads.limit; // Reset pagination
        renderLoads();
    });
});

// =========================
// Event Delegation for data-action buttons
// =========================
document.addEventListener('click', function(e) {
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
        case 'post-load':
            trackEvent('navigation', { from: 'home', to: 'post', action: 'post_load' });
            checkAuthThen('post');
            break;
        case 'post-truck':
            trackEvent('navigation', { from: 'home', to: 'sales', action: 'post_truck' });
            checkAuthThen('sales', 'postSaleAnchor');
            break;
  case 'clear-filters':
    const filterOriginEl = document.getElementById('filterOrigin');
    const filterDestEl = document.getElementById('filterDest');
    const filterText = document.getElementById('filterText');
    clearLoadFilters(filterOriginEl, filterDestEl, filterText);
    if (typeof renderLoads === 'function') {
        renderLoads(); // Force re-render after clearing
    }
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
    }
});

// Listen for auth state changes
onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed:', user ? user.email : 'signed out');
    state.currentUser = user;
    
    const loadUserData = async () => {
        if (user) {
            state.isLoadingAuth = true;
            try {
                await loadUserProfile(user.uid);
                await loadUserVotes(user.uid);
            } catch (e) {
                console.error('Error loading user data:', e);
                // === IMPROVED ERROR HANDLING ===
                if (e.code === 'permission-denied') {
                    showToast('Unable to load profile data', 'warning');
                } else {
                    showToast('Network issue loading profile', 'warning');
                }
                // Continue without user data - it's not critical for viewing
            } finally {
                state.isLoadingAuth = false;
            }
        } else {
            state.profile = null;
            state.myVotes = {};
            state.isLoadingAuth = false;
        }
    };
    
    const loadPublicData = async () => {
        if (state.isInitialLoad) {
            try {
                await loadInitialData();
            } catch (e) {
                console.error('Failed to load public data:', e);
                // === IMPROVED ERROR HANDLING ===
                showToast('Network issue: Some data may be unavailable', 'warning');
                // Empty state - no demo data fallback
                state.loads = [];
                state.sales = [];
            } finally {
                state.isInitialLoad = false;
            }
        }
    };
    
    try {
        await loadUserData();
        await loadPublicData();
    } catch (e) {
        console.error('Unexpected error in auth state change:', e);
        showToast('App initialization issue', 'error');
    }
    
    // Always render, even if data loading had issues
    setTimeout(() => {
        try {
            if (typeof renderAccount === 'function') renderAccount();
            if (typeof renderHome === 'function') renderHome();
            if (typeof renderLoads === 'function') renderLoads();
            if (typeof renderSales === 'function') renderSales();
        } catch (renderError) {
            console.error('Error rendering UI:', renderError);
        }
    }, 100);
});

// First render - FAST STARTUP
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🚀 Fast startup - rendering UI immediately');
  
  // Register Service Worker
  registerServiceWorker();
  
  // Setup PWA installation handler
  setupPWAInstallationHandler();
  
  // Setup exit prevention for mobile
  setupExitPrevention();
  
  // Setup install prompt
  setupInstallPrompt();
    
    // 1. Show loading spinner immediately
    showLoading('Loading AppLoads...');
    
    // 2. Show spinner for 3 seconds minimum
    setTimeout(() => {
        hideLoading();
        
        // 3. Then show skeleton UI
        renderHome();
        renderLoads();
        renderSales();
        renderAccount();
        
        // 4. Continue with feature initialization
        setTimeout(() => {
            setupReportFunctionality();
            setupImagePreview();
            createImageModal();
            lazyImageLoader.init();
            
            // Setup filters
            setupLoadFilters(() => {
                if (typeof renderLoads === 'function') renderLoads();
            });
            setupSaleFilters(() => {
                if (typeof renderSales === 'function') renderSales();
            });
            
            // Start loading real data
            loadInitialData();
        }, 0);
        
    }, 3000); // 3-second spinner
});

// ✅ Initialize image modal when app loads
window.addEventListener('DOMContentLoaded', () => {
    try {
        createImageModal();
        console.log('✅ Image modal initialized');
    } catch (err) {
        console.error('Failed to initialize image modal:', err);
    }
});

// Export db so other modules can access it
export { db };

