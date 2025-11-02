// ===========================================
// lazy-loading.js - SIMPLE VERSION
// ===========================================
// Only applies lazy loading to initial page load, not "Load More"
// ===========================================

export const lazyImageLoader = {
    observer: null,
    initialized: false,

    init: function() {
        if (this.initialized) return;
        
        console.log('🔄 Initializing lazy image loader...');
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            rootMargin: '100px'
        });

        this.initialized = true;
    },

    // Setup image for lazy loading
    setupImage: function(img) {
        if (!this.initialized) this.init();
        
        // Skip if already processed
        if (img.hasAttribute('data-lazy-processed')) {
            return;
        }
        
        const originalSrc = img.src;
        
        // Store original src and set placeholder
        img.setAttribute('data-original-src', originalSrc);
        img.setAttribute('data-lazy-processed', 'true');
        img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjExMiIgdmlld0JveD0iMCAwIDE1MCAxMTIiIGZpbGw9IiNmNWY3ZmIiPjxyZWN0IHdpZHRoPSIxNTAiIGhlaWdodD0iMTEyIiBmaWxsPSIjZjVmN2ZiIi8+PC9zdmc+';
        img.classList.add('lazy-loading');
        
        this.observer.observe(img);
    },

    loadImage: function(img) {
        const originalSrc = img.getAttribute('data-original-src');
        if (!originalSrc) return;

        img.src = originalSrc;
        img.classList.remove('lazy-loading');
        img.classList.add('lazy-loaded');
        img.removeAttribute('data-original-src');
    },

    // Setup images in a container
    setupContainer: function(container) {
        if (!container) return;
        
        const images = container.querySelectorAll('img:not([data-lazy-processed])');
        images.forEach(img => {
            this.setupImage(img);
        });
    }
};

window.lazyImageLoader = lazyImageLoader;