// ===========================================
// confirm-modal.js
// ===========================================
// Modern, promise-based confirmation dialog
// Matches app's design system with beautiful animations
// ===========================================

import { trackEvent } from './firebase-config.js';

let confirmResolve = null;

// =========================
// Show Confirm Dialog
// =========================
export function showConfirm(message, options = {}) {
    return new Promise((resolve) => {
        confirmResolve = resolve;
        
        const {
            title = 'Confirm Action',
            confirmText = 'OK',
            cancelText = 'Cancel',
            type = 'warning', // 'danger', 'warning', 'info', 'success'
            description = null
        } = options;
        
        const modal = document.getElementById('confirmModal');
        const modalTitle = document.getElementById('confirmTitle');
        const modalIcon = document.getElementById('confirmIcon');
        const modalMessage = document.getElementById('confirmMessage');
        const modalDescription = document.getElementById('confirmDescription');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        if (!modal) {
            console.error('Confirm modal not found in DOM');
            resolve(false);
            return;
        }
        
        // Set content
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        // Show/hide description
        if (description) {
            modalDescription.textContent = description;
            modalDescription.style.display = 'block';
        } else {
            modalDescription.style.display = 'none';
        }
        
        // Set button text
        confirmBtn.textContent = confirmText;
        cancelBtn.textContent = cancelText;
        
        // Set icon and styling based on type
        setConfirmType(type, modalIcon, confirmBtn);
        
        // Show modal
        modal.classList.remove('hidden');
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        
        // Focus confirm button for keyboard navigation
        setTimeout(() => confirmBtn.focus(), 100);
        
        // Track event
        trackEvent('confirm_dialog_shown', {
            type: type,
            message: message.substring(0, 50)
        });
    });
}

// =========================
// Set Type Styling
// =========================
function setConfirmType(type, iconEl, confirmBtn) {
    // Reset button classes
    confirmBtn.className = 'btn';
    
    // Set button class based on type
    if (type === 'danger') {
        confirmBtn.classList.add('danger');
    } else if (type === 'warning') {
        confirmBtn.classList.add('warning');
    }
    // No special styling for info/success
}

// =========================
// Handle Confirm
// =========================
function handleConfirm() {
    if (confirmResolve) {
        confirmResolve(true);
        confirmResolve = null;
    }
    closeConfirmModal();
    
    trackEvent('confirm_dialog_confirmed');
}

// =========================
// Handle Cancel
// =========================
function handleCancel() {
    if (confirmResolve) {
        confirmResolve(false);
        confirmResolve = null;
    }
    closeConfirmModal();
    
    trackEvent('confirm_dialog_cancelled');
}

// =========================
// Close Modal
// =========================
function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }, 200);
    }
}

// =========================
// Initialize Event Listeners
// =========================
export function initConfirmModal() {
    // Button handlers
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const modal = document.getElementById('confirmModal');
    
    if (confirmBtn) {
        confirmBtn.addEventListener('click', handleConfirm);
    }
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancel);
    }
    
    // Backdrop click to cancel
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                handleCancel();
            }
        });
    }
    
    // Keyboard support
    document.addEventListener('keydown', (e) => {
        if (!modal || modal.classList.contains('hidden')) return;
        
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirm();
        }
    });
}

// Initialize on import
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConfirmModal);
    } else {
        initConfirmModal();
    }
}

