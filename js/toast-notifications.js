// ===========================================
// toast-notifications.js
// Clean, elegant, modern toast notifications
// No icons - just beautiful, minimal toasts
// ===========================================

class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = null;
        this.init();
    }

    init() {
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
            duration: 4000,
            dismissible: true
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

        // Clean, simple HTML - no icons
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-message">${this.escapeHtml(message)}</div>
            </div>
            ${config.dismissible ? `
                <button class="toast-dismiss" data-action="dismiss" aria-label="Dismiss">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
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
                this.dismiss(toast);
            } else {
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create singleton instance
const toastManager = new ToastManager();

// Export main function
export function showToast(message, type = 'success', options = {}) {
    return toastManager.show(message, type, options);
}

// Export utilities
export function dismissAllToasts() {
    toastManager.dismissAll();
}

// Backwards compatibility
if (typeof window !== 'undefined') {
    window.showToast = showToast;
    window.dismissAllToasts = dismissAllToasts;
}