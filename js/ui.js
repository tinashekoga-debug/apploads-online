// ===========================================
// ui.js
// ===========================================
// Handles UI utilities and helpers:
// - Navigation between sections
// - Toast notifications
// - Popup management (contact popup)
// - Money formatting
// - HTML escaping
// - Select filling (country dropdowns)
// ===========================================
// Exports: goto, checkAuthThen, showToast, openContact, closePopup, fmtMoney, escapeHtml, escapeAttr, fillSelect, copyText, contactLine, clearLoadFilters
// ===========================================

import { clearLoadFilters } from './filters.js';
import { trackEvent } from './firebase-config.js';
import { state, countries, ADMIN_EMAILS } from './main.js';
import { authOpen } from './auth.js';
import { renderLoads } from './loads.js';
import { renderSales } from './sales.js';
import { renderAccount } from './profile.js';
import { renderHome } from './main.js';
import { ownerRatingFor, ownerIdFromItem, loadRatingFor } from './ratings.js';

// =========================
// Currency Configuration
// =========================
export const currencies = {
    'USD': { symbol: '$', name: 'US Dollar' },
    'ZAR': { symbol: 'R', name: 'South African Rand' },
    'BWP': { symbol: 'P', name: 'Botswana Pula' },
    'ZWL': { symbol: 'ZWL$', name: 'Zimbabwe Dollar' },
    'ZMW': { symbol: 'K', name: 'Zambian Kwacha' },
    'MWK': { symbol: 'MK', name: 'Malawian Kwacha' },
    'TZS': { symbol: 'TSh', name: 'Tanzanian Shilling' },
    'Other': { symbol: '', name: 'Other Currency' }
};

// =========================
// Navigation
// =========================
export function goto(id, scrollToId = null) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-target="${id}"]`)?.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(id)?.classList.add('active');
    
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
            // Wait for auth to complete
            if (state.currentUser && state.profile) {
                goto(id, scrollToId);
            }
        });
    } else {
        goto(id, scrollToId);
    }
}

// =========================
// Specific Item Navigation
// =========================
window.goToSpecificLoad = function(loadId) {
    // Store the selected load ID for when we navigate to loads page
    window.selectedLoadId = loadId;
    closePopup();
    goto('loads');
    
    // Track this navigation
    trackEvent('navigate_to_specific_load', {
        load_id: loadId,
        source: 'other_posts_popup'
    });
};

window.goToSpecificSale = function(saleId) {
    // Store the selected sale ID for when we navigate to sales page  
    window.selectedSaleId = saleId;
    closePopup();
    goto('sales');
    
    // Track this navigation
    trackEvent('navigate_to_specific_sale', {
        sale_id: saleId,
        source: 'other_posts_popup'
    });
};

// =========================
// Toast Notification
// =========================
export function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// =========================
// Popup / Contact helpers
// =========================
function contactKey(c) {
    return (c?.email || c?.phone || c?.name || '').toString().trim().toLowerCase();
}

export function openContact(c, ownerIdPassed) {
    const body = document.getElementById('popupBody');
    const ownerId = ownerIdPassed || contactKey(c);
    
    // Track contact popup opening
    trackEvent('contact_popup_open', {
        contact_name: c.name || 'Unknown',
        has_phone: !!c.phone,
        has_email: !!c.email,
        has_website: !!c.web
    });
    const ownerRat = ownerRatingFor(ownerId);
    
    // Count owner's other posts
    const ownerLoads = state.loads.filter(l => ownerIdFromItem(l) === ownerId);
    const ownerSales = state.sales.filter(s => ownerIdFromItem(s) === ownerId);
    const totalOtherPosts = ownerLoads.length + ownerSales.length - 1; // Exclude current post
    
    // WhatsApp as prominent button
    const waButton = c.phone ? `
        <div style="margin-bottom: 12px;">
            <a href="https://wa.me/${(c.phone || '').replace(/\+/g, '')}" target="_blank" 
               style="display: flex; align-items: center; justify-content: center; gap: 8px; 
                      background: #25D366; color: white; padding: 12px 16px; border-radius: 8px; 
                      text-decoration: none; font-weight: 600; font-size: 16px;">
                💬 WhatsApp
            </a>
        </div>
    ` : '';
    
    // Other contact methods
    const tel = c.phone ? `<div style="margin-bottom: 8px;">📞 <a href="tel:${c.phone}" style="color: #0b7d62; text-decoration: none;">${c.phone}</a></div>` : '';
    const em = c.email ? `<div style="margin-bottom: 8px;">✉️ <a href="mailto:${c.email}" style="color: #0b7d62; text-decoration: none;">${c.email}</a></div>` : '';
    const web = c.web ? `<div style="margin-bottom: 8px;">🌐 <a href="${c.web}" target="_blank" style="color: #0b7d62; text-decoration: none;">${c.web}</a></div>` : '';
    
    // Other Posts button (only show if there are other posts)
    const otherPostsButton = totalOtherPosts > 0 ? `
        <div style="margin: 16px 0 12px 0; padding-top: 12px; border-top: 1px solid #eee;">
         <button onclick="viewOtherPosts('${ownerId}', ${JSON.stringify(c).replace(/"/g, '&quot;')})" 
                    style="width: 100%; padding: 10px 16px; background: #f8f9fa; border: 1px solid #ddd; 
                           border-radius: 8px; color: #0b7d62; font-weight: 500; cursor: pointer;">
                📦 Other Posts by Owner (${totalOtherPosts})
            </button>
        </div>
    ` : '';
    
    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${escapeHtml(c.name || 'Contact')}</p>
            <div style="color: #666; font-size: 14px;">
                ⭐ Owner rating: <strong>${ownerRat.count ? ownerRat.avg.toFixed(1) : '—'}</strong>${ownerRat.count ? ' ('+ownerRat.count+')' : ''}
            </div>
        </div>
        
        ${waButton}
        
        <div style="margin-bottom: 16px;">
            <div style="font-size: 14px; color: #666; margin-bottom: 8px;">Other contact methods:</div>
            ${tel}
            ${em}
            ${web}
        </div>
        
        ${otherPostsButton}
    `;
    
    document.getElementById('popup').style.display = 'flex';
}

// Add global function for viewing other posts
// Fixed viewOtherPosts function
window.viewOtherPosts = function(ownerId, currentContact = null) {
    console.log('🔥 viewOtherPosts called', { ownerId, currentContact });
    
    // Track "view other posts" action
    trackEvent('view_other_posts', {
        owner_id: ownerId,
        contact_name: currentContact?.name || 'Unknown'
    });
    
    const ownerLoads = state.loads.filter(l => ownerIdFromItem(l) === ownerId);
    const ownerSales = state.sales.filter(s => ownerIdFromItem(s) === ownerId);
    
    console.log('📊 Found loads:', ownerLoads.length, 'sales:', ownerSales.length);
    
    if (ownerLoads.length === 0 && ownerSales.length === 0) {
        showToast('No other posts found for this owner', 'info');
        return;
    }
    
    // Store current contact info for "back" button
    window.currentContactForOtherPosts = currentContact || window.currentPopupContact;
    window.currentOwnerIdForOtherPosts = ownerId;
    
    // Get reference to popup body (don't try to modify header if it doesn't exist)
    const popupBody = document.getElementById('popupBody');
    
    if (!popupBody) {
        console.error('❌ popupBody element not found');
        showToast('Error: Popup not available', 'error');
        return;
    }
    
    // Build new content with single Contact button
    popupBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h3 style="margin: 0;">Other Posts by Owner</h3>
            <button class="btn small" style="background:#0b7d62; color: white;" onclick="goBackToContact()">← Back</button>
        </div>
        <div style="max-height: 400px; overflow-y: auto;">
            ${ownerLoads.map(load => {
                const loadRat = loadRatingFor(load.id);
                return `
                <div class="card" style="margin-bottom: 8px; cursor: pointer;" onclick="goToSpecificLoad('${load.id}')">
                    <div class="between">
                        <div style="flex: 1;">
                            <strong>📦 ${escapeHtml(load.cargo)}</strong>
                            <div class="muted">${escapeHtml(load.originCity)} → ${escapeHtml(load.destCity)}</div>
                            <div class="muted" style="font-size: 12px; margin-top: 4px;">
                                ⭐ ${loadRat.count ? loadRat.avg.toFixed(1) : '—'}${loadRat.count ? ' ('+loadRat.count+')' : ''}
                            </div>
                        </div>
                        <span class="price">${fmtMoney(load.price || 0, load.currency || 'USD', load.pricingType || 'total')}</span>
                    </div>
                </div>
            `}).join('')}
            ${ownerSales.map(sale => `
                <div class="card" style="margin-bottom: 8px; cursor: pointer;" onclick="goToSpecificSale('${sale.id}')">
                    <div class="between">
                        <div style="flex: 1;">
                            <strong>🚛 ${escapeHtml(sale.title)}</strong>
                            <div class="muted">${escapeHtml(sale.city)}, ${escapeHtml(sale.country)}</div>
                        </div>
                        <span class="price">${fmtMoney(sale.price || 0, sale.currency || 'USD')}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    console.log('✅ Popup content updated');
    
    // Ensure popup stays visible
    document.getElementById('popup').style.display = 'flex';
};

// Add global function to go back to contact
window.goBackToContact = function() {
    console.log('Going back to contact');
    
    const popupBody = document.getElementById('popupBody');
    if (!popupBody) {
        console.error('❌ popupBody not found for goBackToContact');
        closePopup();
        return;
    }
    
    if (window.currentContactForOtherPosts && window.currentOwnerIdForOtherPosts) {
        openContact(window.currentContactForOtherPosts, window.currentOwnerIdForOtherPosts);
    } else {
        // Fallback: just close the popup
        closePopup();
    }
};

// Replace these placeholder functions in ui.js
window.viewLoadDetails = function(loadId) {
    goToSpecificLoad(loadId);
};

window.viewSaleDetails = function(saleId) {
    goToSpecificSale(saleId);
};

export function closePopup() {
    document.getElementById('popup').style.display = 'none';
}

export function copyText(t) {
    navigator.clipboard.writeText(t);
    
    // Track copy action
    trackEvent('copy_text', {
        text_length: t.length,
        has_phone: t.includes('+') || /\d{10,}/.test(t),
        has_email: t.includes('@')
    });
}

export function contactLine(c) {
    const parts = [];
    if (c.phone) parts.push(c.phone);
    if (c.email) parts.push(c.email);
    if (c.web) parts.push(c.web);
    return parts.join(' | ');
}

// =========================
// Utilities
// =========================
export function fmtMoney(amount, currency = 'USD', pricingType = 'total') {
    amount = Number(amount || 0);
    if (!amount) return '—';
    
    const currencyInfo = currencies[currency] || { symbol: currency, name: currency };
    const symbol = currencyInfo.symbol || currency;
    
    // Format the number with thousands separators
    const formattedAmount = amount.toLocaleString(undefined, { maximumFractionDigits: 0 });
    
    if (pricingType === 'per_ton') {
        return `${symbol}${formattedAmount} ${currency}/ton`;
    } else {
        return `${symbol}${formattedAmount} ${currency}`;
    }
}

export function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
}

export function escapeAttr(s) {
    return String(s || '').replace(/"/g, '&quot;');
}

export function fillSelect(sel, withAll=false) {
    sel.innerHTML = withAll ? '<option value="">All</option>' : '';
    countries.forEach(c => {
        const o = document.createElement('option');
        o.value = c;
        o.textContent = c;
        sel.appendChild(o);
    });
}

// Admin check
export function isAdminUser() {
    if (!state || (!state.currentUser && !state.profile)) return false;
    const email = (state.currentUser?.email || state.profile?.email || '').trim().toLowerCase();

    // Hardcoded admin emails (edit these)
    const ADMIN_EMAILS = [
        'tinashekoga@gmail.com',
        'tinaleinvestments@gmail.com',
        'admin@apploads-online.web.app'
    ];

    return ADMIN_EMAILS.includes(email);
}

// =========================
// Loading Overlay with Enhanced Features
// =========================
let loadingStartTime = 0;
let minDisplayTime = 500; // Minimum 500ms to prevent flickering
let currentCancelCallback = null;

export function showLoading(message = 'Loading...', options = {}) {
    const overlay = document.getElementById('loadingOverlay');
    const messageEl = overlay.querySelector('.loading-message');
    const progressEl = overlay.querySelector('.loading-progress');
    const cancelBtn = overlay.querySelector('.cancel-btn');
    
    if (overlay && messageEl) {
        // Reset state
        overlay.classList.remove('error');
        progressEl.style.display = 'none';
        cancelBtn.style.display = 'none';
        currentCancelCallback = null;
        
        // Set message
        messageEl.textContent = message;
        
        // Show progress if requested
        if (options.showProgress) {
            progressEl.style.display = 'block';
            setProgress(0);
        }
        
        // Show cancel button if callback provided
        if (options.onCancel) {
            cancelBtn.style.display = 'block';
            currentCancelCallback = options.onCancel;
            cancelBtn.onclick = options.onCancel;
        }
        
        // Show overlay and record start time
        overlay.classList.add('show');
        document.body.classList.add('loading'); // Add this line
        loadingStartTime = Date.now();
    }
}

export function hideLoading() {
    const elapsed = Date.now() - loadingStartTime;
    const remainingTime = Math.max(0, minDisplayTime - elapsed);
    
setTimeout(() => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show', 'error');
        document.body.classList.remove('loading'); // Add this line
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
        
        // Auto-hide error after 3 seconds
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

// ... your existing code ...

// Global function to cancel current operation
window.cancelCurrentOperation = function() {
    if (currentCancelCallback) {
        currentCancelCallback();
    }
    hideLoading();
};

// =========================
// ADD THE FEEDBACK FUNCTION RIGHT HERE
// =========================
export function showFeedbackForm() {
    const body = document.getElementById('popupBody');
    
    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0;">Send Feedback</h3>
            <p class="muted">Your feedback helps us improve <strong>AppLoads</strong> for everyone.</p>
        </div>
        
        <div style="margin-bottom: 12px;">
            <label>What's this about?</label>
            <select id="feedbackType" style="margin-bottom: 12px;">
                <option value="bug">🐛 Bug Report</option>
                <option value="suggestion">💡 Feature Idea</option>
                <option value="improvement">✨ Improvement</option>
                <option value="general">💬 General Feedback</option>
            </select>
            
            <label>Your Message *</label>
            <textarea id="feedbackMessage" placeholder="Please describe in detail..." 
                      style="min-height: 120px; margin-bottom: 8px;" required></textarea>
            
            <div class="muted" style="font-size: 0.8rem;">
                💡 For bugs: Include steps to reproduce and what you expected to happen
            </div>
        </div>
        
        <div class="button-row">
            <button class="btn secondary" onclick="closePopup()">Cancel</button>
            <button class="btn" onclick="submitFeedback()">Send Feedback</button>
        </div>
    `;
    
    document.getElementById('popup').style.display = 'flex';
}

// Make it globally available
window.showFeedbackForm = showFeedbackForm;

// =========================
// FEEDBACK SUBMISSION FUNCTION
// =========================
window.submitFeedback = async function() {
    const type = document.getElementById('feedbackType').value;
    const message = document.getElementById('feedbackMessage').value.trim();
    
    if (!message) {
        showToast('Please enter your feedback message', 'error');
        return;
    }
    
    showLoading('Sending feedback...');
    
    try {
        // Store feedback in Firebase
        const feedbackData = {
            type: type,
            message: message,
            userId: state.currentUser.uid,
            userEmail: state.currentUser.email || state.profile?.email || 'unknown',
            userName: state.profile?.name || 'Unknown',
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now(),
            appVersion: '2025-01-20.06.11',
            status: 'new'
        };
        
        // Use the existing db import from main.js
        const { db, uid } = await import('./main.js');
        const { doc, setDoc } = await import('./firebase-config.js');
        
        await setDoc(doc(db, 'feedback', uid()), feedbackData);
        
        // Track feedback submission
        trackEvent('feedback_submitted', {
            type: type,
            message_length: message.length,
            user_id: state.currentUser.uid,
            user_name: state.profile?.name || 'Unknown'
        });
        
        showToast('✅ Thank you! Your feedback has been sent.', 'success');
        closePopup();
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Failed to send feedback. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}; // ← This is the final closing brace of the ui.js file
