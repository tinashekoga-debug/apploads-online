// ===========================================
// settings-swipe.js
// ===========================================
// WhatsApp-style swipe-to-close for left drawer
// Smooth, responsive, follows your finger
// ===========================================

const SWIPE_CONFIG = {
    threshold: 80,              // Distance to trigger close (px)
    velocityThreshold: 0.5,     // Velocity to trigger close (px/ms)
    maxDragDistance: 300,       // Max drawer width
    animationDuration: 300,     // Transition duration (ms)
};

class DrawerSwipeHandler {
    constructor(drawer, content, onClose) {
        this.drawer = drawer;
        this.content = content;
        this.onClose = onClose;
        
        // State
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;
        this.currentX = 0;
        this.lastX = 0;
        this.lastTime = 0;
        this.velocity = 0;
        this.isHorizontalSwipe = null;
        
        this.init();
    }
    
    init() {
        // Touch events
        this.content.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        this.content.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.content.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        this.content.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: true });
    }
    
    handleTouchStart(e) {
        const touch = e.touches[0];
        this.isDragging = true;
        this.startX = touch.clientX;
        this.startY = touch.clientY;
        this.currentX = touch.clientX;
        this.lastX = touch.clientX;
        this.lastTime = Date.now();
        this.isHorizontalSwipe = null;
        
        // Disable transitions during drag
        this.content.style.transition = 'none';
        this.drawer.style.transition = 'none';
    }
    
    handleTouchMove(e) {
        if (!this.isDragging) return;
        
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.startX;
        const deltaY = touch.clientY - this.startY;
        
        // Determine swipe direction on first significant movement
        if (this.isHorizontalSwipe === null && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
            this.isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
        }
        
        // Only handle leftward swipes
        if (this.isHorizontalSwipe && deltaX < 0) {
            e.preventDefault(); // Prevent page scroll
            
            this.currentX = touch.clientX;
            
            // Calculate velocity for momentum
            const now = Date.now();
            const timeDelta = now - this.lastTime;
            if (timeDelta > 0) {
                this.velocity = (touch.clientX - this.lastX) / timeDelta;
            }
            this.lastX = touch.clientX;
            this.lastTime = now;
            
            // Apply transform - negative because swiping left
            const distance = Math.abs(deltaX);
            const translation = -distance;
            
            this.content.style.transform = `translateX(${translation}px)`;
            
            // Fade overlay based on progress
            const progress = Math.min(distance / SWIPE_CONFIG.maxDragDistance, 1);
            const opacity = 0.4 * (1 - progress);
            this.drawer.style.backgroundColor = `rgba(0, 0, 0, ${opacity})`;
        }
    }
    
    handleTouchEnd() {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        // Re-enable transitions for smooth snap
        this.content.style.transition = `transform ${SWIPE_CONFIG.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        this.drawer.style.transition = `background-color ${SWIPE_CONFIG.animationDuration}ms cubic-bezier(0.4, 0.0, 0.2, 1)`;
        
        const deltaX = this.currentX - this.startX;
        const distance = Math.abs(deltaX);
        
        // Close if: 1) Distance threshold met, or 2) Fast swipe (velocity)
        const shouldClose = 
            (distance > SWIPE_CONFIG.threshold) || 
            (this.velocity < -SWIPE_CONFIG.velocityThreshold && distance > 30);
        
        if (shouldClose && this.isHorizontalSwipe && deltaX < 0) {
            this.close();
        } else {
            this.reset();
        }
    }
    
    close() {
        // Animate to closed position
        this.content.style.transform = 'translateX(-100%)';
        this.drawer.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        
        // Call onClose after animation
        setTimeout(() => {
            this.onClose();
            this.reset();
        }, SWIPE_CONFIG.animationDuration);
    }
    
    reset() {
        // Reset to original position
        this.content.style.transform = '';
        this.drawer.style.backgroundColor = '';
        
        // Clean up after transition
        setTimeout(() => {
            this.content.style.transition = '';
            this.drawer.style.transition = '';
        }, SWIPE_CONFIG.animationDuration);
    }
    
    destroy() {
        this.isDragging = false;
        this.content.style.transform = '';
        this.content.style.transition = '';
    }
}

// =========================
// Public API
// =========================
export function enableDrawerSwipe(drawerId, onClose) {
    const drawer = document.getElementById(drawerId);
    if (!drawer) {
        console.warn(`Drawer with id "${drawerId}" not found`);
        return null;
    }
    
    const content = drawer.querySelector('.drawer-content');
    if (!content) {
        console.warn(`Drawer content not found in "${drawerId}"`);
        return null;
    }
    
    return new DrawerSwipeHandler(drawer, content, onClose);
}

