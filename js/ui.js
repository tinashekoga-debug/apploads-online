// ===========================================
// ui.js
// ===========================================
// Handles UI utilities and helpers:
// - Navigation between sections
// - Toast notifications (NEW: Modern native-style system)
// - Money formatting
// - HTML escaping
// - Select filling (country dropdowns)
// ===========================================

import { clearLoadFilters } from './filters.js';
import { trackEvent } from './firebase-config.js';
import { state } from './main.js';
import { ADMIN_EMAILS } from './admin-utils.js';
import { authOpen } from './auth.js';
import { renderLoads } from './loads.js';
import { renderSales } from './sales.js';
import { renderAccount } from './profile.js';
import { renderHome } from './main.js';
import { ownerRatingFor, ownerIdFromItem, loadRatingFor } from './ratings.js';
import { currencies } from './currencies.js';
import { showFeedbackForm, submitFeedback } from './feedback.js';
import { countries } from './countries.js';
import { openContact, goBackToContact, contactLine } from './contact-modal.js';
import { viewOtherPosts } from './other-posts-modal.js';
import { goToSpecificLoad } from './goto-load.js';
import { goToSpecificListing } from './goto-marketplace.js';
import { showToast as showModernToast, dismissAllToasts } from './toast-notifications.js';
import { showConfirm } from './confirm-modal.js';

// =========================
// Network Timeout Utility
// =========================
export async function withTimeout(promise, timeoutMs = 30000, operationName = 'Operation') {
    let timeoutId;
    
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`${operationName} timed out after ${timeoutMs/1000} seconds. Please check your internet connection.`));
        }, timeoutMs);
    });
    
    try {
        const result = await Promise.race([promise, timeoutPromise]);
        clearTimeout(timeoutId);
        return result;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

// =========================
// Navigation
// =========================
export function goto(id, scrollToId = null) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-target="${id}"]`)?.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    
    // FAB Button Visibility Control
    const fabButton = document.getElementById('fabButton');
    if (fabButton) {
        if (id === 'sales') {
            fabButton.style.display = 'flex';
        } else {
            fabButton.style.display = 'none';
        }
    }
    
    // Track page view
    trackEvent('page_view', {
        section: id,
        timestamp: Date.now()
    });
    
    if (id === 'loads') renderLoads();
    if (id === 'sales') renderSales();
    if (id === 'account') renderAccount();
    if (id === 'home') renderHome();
    
    if (scrollToId) {
        setTimeout(() => {
            const el = document.getElementById(scrollToId);
            if (el) el.scrollIntoView({behavior: 'smooth'});
        }, 300);
    }
}

export function checkAuthThen(id, scrollToId = null) {
    if (!state.currentUser || !state.profile || state.isLoadingAuth) {
        authOpen('signin', async () => {
            if (state.currentUser && state.profile) {
                goto(id, scrollToId);
            }
        });
    } else {
        goto(id, scrollToId);
    }
}

// =========================
// Toast Notification (NEW)
// =========================
export function showToast(message, type = 'success', options = {}) {
    // Use the new modern toast system
    return showModernToast(message, type, options);
}

// Export dismissAllToasts for cleanup
export { dismissAllToasts };

// =========================
// Popup / Contact helpers
// =========================
export function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

export function copyText(t) {
    navigator.clipboard.writeText(t);
    
    // REPLACE this alert with modern toast:
    // alert('Copied to clipboard!');
    // WITH:
    showToast('Copied to clipboard!', 'success', { duration: 2000 });
    
    // Track copy action
    trackEvent('copy_text', {
        text_length: t.length,
        has_phone: t.includes('+') || /\d{10,}/.test(t),
        has_email: t.includes('@')
    });
}

export function showDataPolicy() {
    const body = document.getElementById('popupBody');
    
    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0;">Data Policy</h3>
            <p style="font-size: 14px; color: #666; margin-bottom: 12px;">
                Your data is securely stored and protected by global privacy standards.
            </p>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 16px; font-size: 14px; line-height: 1.5;">
            <p><strong>Data Storage:</strong> All user data is stored securely with encryption at rest.</p>
            <p><strong>Privacy Protection:</strong> We comply with applicable data protection regulations including GDPR where applicable.</p>
            <p><strong>Account Data:</strong> Your profile information is only visible to users you choose to contact through listings.</p>
            <p><strong>Data Retention:</strong> You can delete your account at any time, which permanently removes all your data from our systems.</p>
            <p><strong>Cookies & Tracking:</strong> We use minimal essential cookies for app functionality and do not sell your data to third parties.</p>
            <p><strong>Security:</strong> All communications are encrypted using industry-standard SSL/TLS protocols.</p>
        </div>
        
        <div class="button-row">
            <button class="btn" onclick="closePopup()">Close</button>
        </div>
    `;
    
    document.getElementById('popup').style.display = 'flex';
    
    trackEvent('data_policy_viewed', {
        timestamp: Date.now(),
        user_id: state.currentUser?.uid || 'anonymous'
    });
}

window.showDataPolicy = showDataPolicy;

// =========================
// Utilities
// =========================
export function fmtMoney(amount, currency = 'USD', pricingType = 'total') {
    amount = Number(amount || 0);
    if (!amount) return '—';
    
    const currencyInfo = currencies[currency] || { symbol: currency, name: currency };
    const formattedAmount = amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    
    if (pricingType === 'per_ton') {
        return `${currency} ${formattedAmount}/ton`;
    } else {
        return `${currency} ${formattedAmount}`;
    }
}

export function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

export function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;');
}

export function fillSelect(sel, withAll=false) {
    if (!sel) {
        console.warn('fillSelect called with null element');
        return;
    }
    sel.innerHTML = withAll ? '<option value="">All</option>' : '';
    countries.forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
    });
}

// =========================
// Time Formatting Utility
// =========================
export function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const posted = typeof timestamp === 'number' ? timestamp : Number(timestamp);
    const now = Date.now();
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    const postDate = new Date(posted);
    return postDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
    });
}

export function isAdminUser() {
    if (!state || (!state.currentUser && !state.profile)) return false;
    const email = (state.currentUser?.email || state.profile?.email || '').trim().toLowerCase();
    return ADMIN_EMAILS.includes(email);
}

// =========================
// Loading Overlay with Enhanced Features
// =========================
let loadingStartTime = 0;
let minDisplayTime = 500;
let currentCancelCallback = null;
let loadingTimeout = null; // ✅ ADD THIS

export function showLoading(message = 'Loading...', options = {}) {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = overlay.querySelector('.loading-message');
    const progressEl = overlay.querySelector('.loading-progress');
    const cancelBtn = overlay.querySelector('.cancel-btn');
    
    if (overlay && messageEl) {
        overlay.classList.remove('error');
        progressEl.style.display = 'none';
        cancelBtn.style.display = 'none';
        currentCancelCallback = null;
        
        messageEl.textContent = message;
        
        if (options.showProgress) {
            progressEl.style.display = 'block';
            setProgress(0);
        }
        
        if (options.onCancel) {
            cancelBtn.style.display = 'block';
            currentCancelCallback = options.onCancel;
            cancelBtn.onclick = options.onCancel;
        }
        
        overlay.classList.add('show');
        document.body.classList.add('loading');
        loadingStartTime = Date.now();
        
        // ✅ ADD THIS: Auto-hide after 30 seconds with error
        if (loadingTimeout) clearTimeout(loadingTimeout);
        loadingTimeout = setTimeout(() => {
            setLoadingError('Request timed out. Please check your connection and try again.');
            setTimeout(hideLoading, 3000);
        }, 30000); // 30 seconds
    }
}

export function hideLoading() {
    // ✅ ADD THIS: Clear the timeout when manually hiding
    if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        loadingTimeout = null;
    }
    
    const elapsed = Date.now() - loadingStartTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
    setTimeout(() => {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.remove('show', 'error');
            document.body.classList.remove('loading'); 
            document.body.classList.remove('app-loading');
            currentCancelCallback = null;
        }
    }, remainingTime);
}

export function setLoadingError(message = 'Something went wrong') {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = overlay.querySelector('.loading-message');
    
    if (overlay && messageEl) {
        messageEl.textContent = message;
        overlay.classList.add('error');
        
        setTimeout(() => {
            hideLoading();
        }, 3000);
    }
}

export function setProgress(percent, text = null) {
    const progressEl = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    
    if (progressEl) {
        const clampedPercent = Math.max(0, Math.min(100, percent));
        progressEl.style.width = `${clampedPercent}%`;
        
        if (progressText) {
            progressText.textContent = text || `${Math.round(clampedPercent)}%`;
        }
    }
}

window.cancelCurrentOperation = function() {
    if (currentCancelCallback) {
        currentCancelCallback();
    }
    hideLoading();
};

// Export openContact
export { openContact };

// Export showConfirm from confirm-modal.js
export { showConfirm };