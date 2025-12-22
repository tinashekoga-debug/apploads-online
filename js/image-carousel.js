// ===========================================
// image-carousel.js
// ===========================================
// Dedicated image carousel and fullscreen functionality
// Features:
// - Image carousel with swipe support
// - Fullscreen modal with zoom/pinch
// - Touch gesture handling
// ===========================================
// Used internally by marketplace-listing.js
// ===========================================

import { trackEvent } from './firebase-config.js';
import { escapeHtml } from './ui.js';

class ImageCarousel {
    constructor() {
        this.currentImageIndex = 0;
        this.totalImages = 0;
        this.touchStartX = 0;
        this.isDragging = false;
        this.isFullscreen = false;
        this.fullscreenIndex = 0;
        
        // Zoom properties
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
        this.touchStartDistance = 0;
        this.lastTouchEnd = 0;
        this.isPinching = false;
        this.startScale = 1;
        this.startPosX = 0;
        this.startPosY = 0;
        
        this.carouselTrack = null;
        this.carouselCounter = null;
        this.fullscreenTrack = null;
        this.fullscreenCounter = null;
        this.currentListing = null;
    }
    
    setupCarouselElements(carouselTrack, carouselCounter, fullscreenTrack, fullscreenCounter) {
        this.carouselTrack = carouselTrack;
        this.carouselCounter = carouselCounter;
        this.fullscreenTrack = fullscreenTrack;
        this.fullscreenCounter = fullscreenCounter;
    }
    
    setupCarousel(listing) {
        this.currentListing = listing;
        const images = Array.isArray(listing.images) ? listing.images : (listing.image ? [listing.image] : []);
        this.totalImages = images.length;
        
        this.carouselTrack.innerHTML = '';
        
        if (this.totalImages === 0) {
            const placeholder = this.createPlaceholderImage();
            this.carouselTrack.appendChild(placeholder);
            this.carouselCounter.textContent = '';
            return;
        }
        
        // For infinite scroll: clone last image at beginning, first image at end
        if (this.totalImages > 1) {
            // Clone last image (goes at beginning)
            const lastClone = document.createElement('div');
            lastClone.className = 'carousel-slide';
            lastClone.innerHTML = `<img src="${images[images.length - 1]}" alt="${escapeHtml(listing.title)}" loading="lazy" />`;
            lastClone.querySelector('img').addEventListener('click', () => {
                this.openFullscreen(images.length - 1);
            });
            this.carouselTrack.appendChild(lastClone);
        }
        
        // Add all real images
        images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.innerHTML = `<img src="${image}" alt="${escapeHtml(listing.title)}" loading="lazy" />`;
            
            slide.querySelector('img').addEventListener('click', () => {
                this.openFullscreen(index);
            });
            
            this.carouselTrack.appendChild(slide);
        });
        
        // For infinite scroll: clone first image (goes at end)
        if (this.totalImages > 1) {
            const firstClone = document.createElement('div');
            firstClone.className = 'carousel-slide';
            firstClone.innerHTML = `<img src="${images[0]}" alt="${escapeHtml(listing.title)}" loading="lazy" />`;
            firstClone.querySelector('img').addEventListener('click', () => {
                this.openFullscreen(0);
            });
            this.carouselTrack.appendChild(firstClone);
        }
        
        // Start at first real image (index 1 because clone is at 0)
        this.currentImageIndex = this.totalImages > 1 ? 1 : 0;
        
        this.updateCarousel();
    }
    
    createPlaceholderImage() {
        const listing = this.currentListing;
        const categoryNames = {
            'trucks': '🚛 Trucks & Trailers',
            'earthmoving': '🏗️ Earthmoving Equipment',
            'tyres': '🛞 Tyres & Tarpaulins', 
            'parts': '🔧 Parts',
            'accessories': '⚙️ Truck Accessories',
            'lubricants': '🛢️ Lubricants & Oils',
            'tracking': '📍 Tracking & Telematics',
            'repairs': '🔧 Repairs & Mechanics',
            'insurance': '🛡️ Insurance & Finance',
            'customs': '🛃 Customs & Clearing',
            'towing': '🚨 Towing & Recovery',
            'warehousing': '🏬 Warehousing & Storage',
            'other-sales': '📦 Other Sales',
            'other-services': '💼 Other Services'
        };
        
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        slide.innerHTML = `
            <div style="
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, var(--brand), var(--brand-2));
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 1.4rem;
                font-weight: 700;
                text-align: center;
                padding: 20px;
            ">
                ${categoryNames[listing.category] || 'Marketplace Item'}
            </div>
        `;
        return slide;
    }
    
    updateCarousel() {
        if (this.totalImages === 0) return;
        
        const translateX = -this.currentImageIndex * 100;
        this.carouselTrack.style.transform = `translateX(${translateX}%)`;
        
        // Display counter based on real image index (accounting for clones)
        let displayIndex = this.currentImageIndex;
        if (this.totalImages > 1) {
            displayIndex = this.currentImageIndex - 1;
            if (displayIndex < 0) displayIndex = this.totalImages - 1;
            if (displayIndex >= this.totalImages) displayIndex = 0;
        }
        this.carouselCounter.textContent = `${displayIndex + 1}/${this.totalImages}`;
    }
    
    nextImage() {
        if (this.totalImages <= 1) return;
        
        this.currentImageIndex++;
        this.updateCarousel();
        
        // Check if we're at the clone at the end
        if (this.currentImageIndex === this.totalImages + 1) {
            setTimeout(() => {
                this.carouselTrack.style.transition = 'none';
                this.currentImageIndex = 1;
                const translateX = -this.currentImageIndex * 100;
                this.carouselTrack.style.transform = `translateX(${translateX}%)`;
                
                setTimeout(() => {
                    this.carouselTrack.style.transition = 'transform 0.3s ease';
                }, 50);
            }, 300);
        }
    }
    
    prevImage() {
        if (this.totalImages <= 1) return;
        
        this.currentImageIndex--;
        this.updateCarousel();
        
        // Check if we're at the clone at the beginning
        if (this.currentImageIndex === 0) {
            setTimeout(() => {
                this.carouselTrack.style.transition = 'none';
                this.currentImageIndex = this.totalImages;
                const translateX = -this.currentImageIndex * 100;
                this.carouselTrack.style.transform = `translateX(${translateX}%)`;
                
                setTimeout(() => {
                    this.carouselTrack.style.transition = 'transform 0.3s ease';
                }, 50);
            }, 300);
        }
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.isDragging = true;
        this.carouselTrack.style.transition = 'none';
    }
    
    handleTouchMove(e) {
        if (!this.isDragging) return;
        e.preventDefault();
    }
    
    handleTouchEnd(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.carouselTrack.style.transition = 'transform 0.3s ease';
        
        const touchEndX = e.changedTouches[0].clientX;
        const diff = this.touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.nextImage();
            } else {
                this.prevImage();
            }
        } else {
            this.updateCarousel();
        }
    }
    
    // FULLSCREEN METHODS
    openFullscreen(startIndex = 0) {
        this.isFullscreen = true;
        this.fullscreenIndex = startIndex;
        this.resetZoom();
        this.setupFullscreenCarousel();
        
        const fullscreenModal = document.getElementById('fullscreenImageModal');
        if (fullscreenModal) {
            fullscreenModal.classList.remove('hidden');
            document.body.classList.add('fullscreen-open');
        }
        
        trackEvent('fullscreen_image_open', {
            item_id: this.currentListing.id,
            start_index: startIndex,
            total_images: this.totalImages
        });
    }
    
    closeFullscreen() {
        this.isFullscreen = false;
        const fullscreenModal = document.getElementById('fullscreenImageModal');
        if (fullscreenModal) {
            fullscreenModal.classList.add('hidden');
            document.body.classList.remove('fullscreen-open');
        }
        
        trackEvent('fullscreen_image_close', {
            item_id: this.currentListing.id
        });
    }
    
    setupFullscreenCarousel() {
        const listing = this.currentListing;
        const images = Array.isArray(listing.images) ? listing.images : (listing.image ? [listing.image] : []);
        
        this.fullscreenTrack.innerHTML = '';
        
        // For infinite scroll: clone last image at beginning, first image at end
        if (this.totalImages > 1) {
            const lastClone = document.createElement('div');
            lastClone.className = 'fullscreen-slide';
            lastClone.innerHTML = `<img src="${images[images.length - 1]}" alt="${escapeHtml(listing.title)}" />`;
            this.fullscreenTrack.appendChild(lastClone);
        }
        
        // Add all real images
        images.forEach((image, index) => {
            const slide = document.createElement('div');
            slide.className = 'fullscreen-slide';
            slide.innerHTML = `<img src="${image}" alt="${escapeHtml(listing.title)}" />`;
            this.fullscreenTrack.appendChild(slide);
        });
        
        // For infinite scroll: clone first image (goes at end)
        if (this.totalImages > 1) {
            const firstClone = document.createElement('div');
            firstClone.className = 'fullscreen-slide';
            firstClone.innerHTML = `<img src="${images[0]}" alt="${escapeHtml(listing.title)}" />`;
            this.fullscreenTrack.appendChild(firstClone);
        }
        
        // Adjust fullscreenIndex to account for leading clone
        if (this.totalImages > 1) {
            this.fullscreenIndex = this.fullscreenIndex + 1;
        }
    
        this.updateFullscreenCarousel();
    }
    
    updateFullscreenCarousel() {
        const translateX = -this.fullscreenIndex * 100;
        this.fullscreenTrack.style.transform = `translateX(${translateX}%)`;
        
        let displayIndex = this.fullscreenIndex;
        if (this.totalImages > 1) {
            displayIndex = this.fullscreenIndex - 1;
            if (displayIndex < 0) displayIndex = this.totalImages - 1;
            if (displayIndex >= this.totalImages) displayIndex = 0;
        }
        this.fullscreenCounter.textContent = `${displayIndex + 1}/${this.totalImages}`;
    }
    
    fullscreenNextImage() {
        if (this.totalImages <= 1) return;
        
        this.resetZoom();
        this.applyZoom();
        
        this.fullscreenIndex++;
        this.updateFullscreenCarousel();
        
        if (this.fullscreenIndex === this.totalImages + 1) {
            setTimeout(() => {
                this.fullscreenTrack.style.transition = 'none';
                this.fullscreenIndex = 1;
                const translateX = -this.fullscreenIndex * 100;
                this.fullscreenTrack.style.transform = `translateX(${translateX}%)`;
                
                setTimeout(() => {
                    this.fullscreenTrack.style.transition = 'transform 0.3s ease';
                }, 50);
            }, 300);
        }
    }
    
    fullscreenPrevImage() {
        if (this.totalImages <= 1) return;
        
        this.resetZoom();
        this.applyZoom();
        
        this.fullscreenIndex--;
        this.updateFullscreenCarousel();
        
        if (this.fullscreenIndex === 0) {
            setTimeout(() => {
                this.fullscreenTrack.style.transition = 'none';
                this.fullscreenIndex = this.totalImages;
                const translateX = -this.fullscreenIndex * 100;
                this.fullscreenTrack.style.transform = `translateX(${translateX}%)`;
                
                setTimeout(() => {
                    this.fullscreenTrack.style.transition = 'transform 0.3s ease';
                }, 50);
            }, 300);
        }
    }
    
    // FULLSCREEN TOUCH HANDLERS
    handleFullscreenTouchStart(e) {
        if (e.touches.length === 2) {
            this.isPinching = true;
            this.touchStartDistance = this.getTouchDistance(e.touches);
            this.startScale = this.scale;
            e.preventDefault();
        } else if (e.touches.length === 1) {
            this.touchStartX = e.touches[0].clientX;
            this.touchStartY = e.touches[0].clientY;
            this.isDragging = true;
            this.startPosX = this.posX;
            this.startPosY = this.posY;
            
            if (this.scale === 1) {
                this.fullscreenTrack.style.transition = 'none';
            }
        }
    }
    
    handleFullscreenTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 2 && this.isPinching) {
            const currentDistance = this.getTouchDistance(e.touches);
            const newScale = this.startScale * (currentDistance / this.touchStartDistance);
            this.scale = Math.min(Math.max(1, newScale), 4);
            this.applyZoom();
        } else if (e.touches.length === 1 && this.isDragging) {
            const touchX = e.touches[0].clientX;
            const touchY = e.touches[0].clientY;
            
            if (this.scale > 1) {
                const deltaX = touchX - this.touchStartX;
                const deltaY = touchY - this.touchStartY;
                this.posX = this.startPosX + deltaX;
                this.posY = this.startPosY + deltaY;
                this.applyZoom();
            } else {
                const diff = this.touchStartX - touchX;
                const translateX = -this.fullscreenIndex * 100 - (diff / window.innerWidth) * 100;
                this.fullscreenTrack.style.transform = `translateX(${translateX}%)`;
            }
        }
    }
    
    handleFullscreenTouchEnd(e) {
        if (this.isPinching) {
            this.isPinching = false;
            return;
        }
        
        if (!this.isDragging) return;
        
        this.isDragging = false;
        
        const now = Date.now();
        if (now - this.lastTouchEnd < 300) {
            if (this.scale === 1) {
                this.scale = 2.5;
                this.posX = 0;
                this.posY = 0;
            } else {
                this.resetZoom();
            }
            this.applyZoom(true);
            this.lastTouchEnd = 0;
            return;
        }
        this.lastTouchEnd = now;
        
        if (this.scale > 1) {
            return;
        }
        
        this.fullscreenTrack.style.transition = 'transform 0.3s ease';
        
        const touchEndX = e.changedTouches[0].clientX;
        const diff = this.touchStartX - touchEndX;
        
        if (Math.abs(diff) > 50) {
            if (diff > 0) {
                this.fullscreenNextImage();
            } else {
                this.fullscreenPrevImage();
            }
        } else {
            this.updateFullscreenCarousel();
        }
    }
    
    // ZOOM HELPER METHODS
    getTouchDistance(touches) {
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    applyZoom(animated = false) {
        const currentSlide = this.fullscreenTrack.children[this.fullscreenIndex];
        if (!currentSlide) return;
        
        const img = currentSlide.querySelector('img');
        if (!img) return;
        
        if (animated) {
            img.style.transition = 'transform 0.3s ease';
        } else {
            img.style.transition = 'none';
        }
        
        img.style.transform = `translate(${this.posX}px, ${this.posY}px) scale(${this.scale})`;
        img.style.transformOrigin = 'center center';
    }
    
    resetZoom() {
        this.scale = 1;
        this.posX = 0;
        this.posY = 0;
    }
}

export { ImageCarousel };

