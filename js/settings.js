// ===========================================
// settings.js
// ===========================================
// Handles Settings drawer functionality:
// - Opening/closing settings drawer
// - Settings menu items
// - Logout functionality
// ===========================================

import { auth, signOut, trackEvent } from './firebase-config.js';
import { state } from './main.js';
import { renderAccount } from './profile.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { showConfirm } from './confirm-modal.js';
import { forceAppUpdateWithStatus } from './app-updater.js';
import { showDataPolicy } from './data-framework.js';
import { showFeedbackForm } from './feedback.js';
import { enableDrawerSwipe } from './settings-swipe.js';

// =========================
// Constants
// =========================
const ANIMATION_DURATION = 300; // ms

// =========================
// Module State
// =========================
let swipeHandler = null;

// =========================
// Settings Drawer Controls
// =========================
export function openSettingsDrawer() {
    const drawer = document.getElementById('settingsDrawer');
    if (drawer) {
        drawer.style.display = 'block';
        setTimeout(() => {
            drawer.classList.add('active');
        }, 10);
    }
}

export function closeSettingsDrawer() {
    const drawer = document.getElementById('settingsDrawer');
    if (drawer) {
        drawer.classList.remove('active');
        setTimeout(() => {
            drawer.style.display = 'none';
        }, ANIMATION_DURATION);
    }
}

// Backwards compatibility
export const openSettingsModal = openSettingsDrawer;
export const closeSettingsModal = closeSettingsDrawer;

// =========================
// Logout Function
// =========================
export async function logout() {
    const confirmed = await showConfirm('Are you sure you want to sign out?', {
        title: 'Sign Out',
        confirmText: 'Sign Out',
        cancelText: 'Cancel',
        type: 'warning'
    });

    if (!confirmed) return;

    try {
        const uid = state.currentUser?.uid || null;
        await signOut(auth);

        trackEvent('logout', {
            user_id: uid,
            timestamp: Date.now()
        });

        state.profile = null;
        state.myVotes = {};
        renderAccount();
        closeSettingsDrawer();
        showToast('Signed out successfully', 'success');
    } catch (e) {
        console.error('Error signing out:', e);
        showToast('Error signing out', 'error');
    }
}

// =========================
// Event Handlers
// =========================
async function handleCheckUpdates() {
    try {
        showLoading('Checking for updates...');
        const updated = await forceAppUpdateWithStatus();
        
        if (updated) {
            showToast('Update found! Reloading...', 'success');
        } else {
            showToast('AppLoads up to date!', 'success');
        }
    } catch (error) {
        console.error('Update check failed:', error);
        showToast('Unable to check for updates', 'error');
    } finally {
        hideLoading();
        closeSettingsDrawer();
    }
}

function handleEditProfile() {
    const acctState = document.getElementById('acctState');
    if (acctState) {
        acctState.dataset.editing = 'true';
        renderAccount();
    }
    closeSettingsDrawer();
}

function handleRefreshApp() {
    window.location.reload();
}

function handleClearCache() {
    showToast('Clear Cache feature coming soon', 'info');
    closeSettingsDrawer();
}

function handleDeleteAccount() {
    showToast('Delete Account feature coming soon', 'info');
    closeSettingsDrawer();
}

function handleSendFeedback() {
    showFeedbackForm();
    closeSettingsDrawer();
}

function handleDataPolicy() {
    showDataPolicy();
    closeSettingsDrawer();
}

// =========================
// Initialize Settings Drawer
// =========================
export function initializeSettingsDrawer() {
    const drawer = document.getElementById('settingsDrawer');
    if (!drawer) return;
    
    // Enable WhatsApp-style swipe to close
    swipeHandler = enableDrawerSwipe('settingsDrawer', closeSettingsDrawer);
    
    // Map of button actions
    const buttonActions = {
        'edit-profile': handleEditProfile,
        'refresh-app': handleRefreshApp,
        'check-updates': handleCheckUpdates,
        'clear-cache': handleClearCache,
        'delete-account': handleDeleteAccount,
        'send-feedback': handleSendFeedback,
        'data-policy': handleDataPolicy,
        'sign-out': logout,
        'close-settings': closeSettingsDrawer
    };
    
    // Attach all button listeners
    Object.entries(buttonActions).forEach(([action, handler]) => {
        const btn = drawer.querySelector(`[data-action="${action}"]`);
        if (btn) {
            btn.addEventListener('click', handler);
        }
    });
    
    // Close when clicking overlay (outside drawer)
    drawer.addEventListener('click', (e) => {
        if (e.target === drawer) {
            closeSettingsDrawer();
        }
    });
}

// Backwards compatibility
export const initializeSettingsModal = initializeSettingsDrawer;