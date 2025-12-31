// ===========================================
// toast-notifications.js
// ===========================================
// Modern, native-feeling toast notification system
// Features: Bottom slide-up, stacking, gestures, icons
// ===========================================

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }

    init() {
        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'success', options = {}) {
        const defaults = {
            duration: 3000,
            dismissible: true,
            action: null,
            actionLabel: 'Undo'
        };

        const config = { ...defaults, ...options };
        const toast = this.createToast(message, type, config);
        
        this.toasts.push(toast);
        this.container.appendChild(toast.element);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.element.classList.add('show');
        });

        // Auto dismiss
        if (config.duration > 0) {
            toast.timeout = setTimeout(() => {
                this.dismiss(toast);
            }, config.duration);
        }

        // Setup gestures
        if (config.dismissible) {
            this.setupGestures(toast);
        }

        return toast;
    }

    createToast(message, type, config) {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;

        // Icon based on type
        const icon = this.getIcon(type);

        // Build toast HTML
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${config.action ? `
                <button class="toast-action" data-action="custom">
                    ${config.actionLabel}
                </button>
            ` : ''}
            ${config.dismissible ? `
                <button class="toast-dismiss" data-action="dismiss">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                </button>
            ` : ''}
        `;

        const toastObj = {
            element: toast,
            message,
            type,
            config,
            timeout: null
        };

        // Action button handler
        if (config.action) {
            const actionBtn = toast.querySelector('[data-action="custom"]');
            actionBtn.addEventListener('click', () => {
                config.action();
                this.dismiss(toastObj);
            });
        }

        // Dismiss button handler
        if (config.dismissible) {
            const dismissBtn = toast.querySelector('[data-action="dismiss"]');
            dismissBtn?.addEventListener('click', () => {
                this.dismiss(toastObj);
            });
        }

        return toastObj;
    }

    setupGestures(toast) {
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const onTouchStart = (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
            toast.element.style.transition = 'none';
        };

        const onTouchMove = (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;

            // Only allow downward swipe
            if (deltaY > 0) {
                toast.element.style.transform = `translateY(${deltaY}px)`;
                toast.element.style.opacity = Math.max(0, 1 - (deltaY / 100));
            }
        };

        const onTouchEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            const deltaY = currentY - startY;

            toast.element.style.transition = '';

            if (deltaY > 50) {
                // Dismiss if swiped down enough
                this.dismiss(toast);
            } else {
                // Reset position
                toast.element.style.transform = '';
                toast.element.style.opacity = '';
            }
        };

        toast.element.addEventListener('touchstart', onTouchStart, { passive: true });
        toast.element.addEventListener('touchmove', onTouchMove, { passive: true });
        toast.element.addEventListener('touchend', onTouchEnd, { passive: true });
    }

    dismiss(toast) {
        if (toast.timeout) {
            clearTimeout(toast.timeout);
        }

        toast.element.classList.remove('show');
        toast.element.classList.add('hide');

        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts = this.toasts.filter(t => t !== toast);
        }, 300);
    }

    dismissAll() {
        this.toasts.forEach(toast => this.dismiss(toast));
    }

    getIcon(type) {
        const icons = {
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M20 6L9 17l-5-5"></path>
            </svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>`,
            warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>`
        };

        return icons[type] || icons.info;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export the main function
export function showToast(message, type = 'success', options = {}) {
    return toastManager.show(message, type, options);
}

// Export additional utilities
export function dismissAllToasts() {
    toastManager.dismissAll();
}

// Backwards compatibility - attach to window for inline onclick handlers
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.dismissAllToasts = dismissAllToasts;
}

