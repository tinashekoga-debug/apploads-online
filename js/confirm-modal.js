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
    // Reset classes
    iconEl.className = 'confirm-icon';
    confirmBtn.className = 'btn';
    
    switch (type) {
        case 'danger':
            iconEl.classList.add('danger');
            confirmBtn.classList.add('danger');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
            `;
            break;
            
        case 'warning':
            iconEl.classList.add('warning');
            confirmBtn.classList.add('warning');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
            `;
            break;
            
        case 'info':
            iconEl.classList.add('info');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            `;
            break;
            
        case 'success':
            iconEl.classList.add('success');
            iconEl.innerHTML = `
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
            `;
            break;
    }
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

