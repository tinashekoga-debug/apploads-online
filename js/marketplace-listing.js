// ===========================================
// marketplace-listing.js
// ===========================================
// Full-screen marketplace listing view
// Features:
// - Full-screen overlay with fade animation
// - Contact actions (WhatsApp, Contact Info)
// - Related listings
// ===========================================
// Exports: openListing, closeListing
// ===========================================

import { trackEvent } from './firebase-config.js';
import { escapeHtml, fmtMoney, getTimeAgo, showToast } from './ui.js'; // FIXED: Added openContact import
import { state } from './main.js';
import { authOpen } from './auth.js'; // or wherever it's defined
import { openMarketplaceReportModal } from './marketplace-reporting.js'; // or wherever it's defined
import { getRelatedListings, createRelatedCard } from './related-posts.js';
import { ImageCarousel } from './image-carousel.js';
import { openContact } from './contact-modal.js';
import { openLoadChat } from './chat-controller.js';

class MarketplaceListing {
    constructor() {
        this.currentListing = null;
        this.imageCarousel = new ImageCarousel();
        this.init();
    }

    init() {
        this.createOverlay();
        this.bindEvents();
    }
    
    createOverlay() {
    // ADD THIS LINE FIRST:
    this.overlay = document.getElementById('listingOverlay');
    
    this.carouselTrack = document.getElementById('carouselTrack');
    this.carouselCounter = document.getElementById('carouselCounter');
    this.carouselPrev = document.getElementById('carouselPrev');
    this.carouselNext = document.getElementById('carouselNext');
    this.closeBtn = document.getElementById('listingCloseBtn');
        
    // Contact button references
this.whatsappBtn = document.getElementById('whatsappBtn');
this.messageBtn = document.getElementById('messageBtn');
this.contactInfoBtn = document.getElementById('contactInfoBtn');
        this.reportBtn = document.getElementById('reportBtn'); // ✅ ADD THIS LINE 
    
    // Listing content references
    this.listingPrice = document.getElementById('listingPrice');
    this.listingTitle = document.getElementById('listingTitle');
    this.listingMeta = document.getElementById('listingMeta');
    this.listingDescription = document.getElementById('listingDescription');
    
    // Related listings references
    this.relatedSection = document.getElementById('relatedSection');
    this.relatedScroll = document.getElementById('relatedScroll');
    
    // CREATE FULLSCREEN MODAL FIRST!
    this.createFullscreenModal();
    
    // NOW get the fullscreen elements and setup carousel
    const fullscreenTrack = document.getElementById('fullscreenTrack');
    const fullscreenCounter = document.getElementById('fullscreenCounter');
    this.imageCarousel.setupCarouselElements(this.carouselTrack, this.carouselCounter, fullscreenTrack, fullscreenCounter);
}

    createFullscreenModal() {
        let fullscreenModal = document.getElementById('fullscreenImageModal');
        if (fullscreenModal) {
            this.fullscreenModal = fullscreenModal;
            this.fullscreenCloseBtn = document.getElementById('fullscreenCloseBtn');
            this.fullscreenPrev = document.getElementById('fullscreenPrev');
            this.fullscreenNext = document.getElementById('fullscreenNext');
            return;
        }
        
        fullscreenModal = document.createElement('div');
        fullscreenModal.id = 'fullscreenImageModal';
        fullscreenModal.className = 'fullscreen-modal hidden';
        fullscreenModal.innerHTML = `
            <div class="fullscreen-content">
                <button class="fullscreen-close" id="fullscreenCloseBtn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <path d="M18 6L6 18M6 6l12 12"></path>
                    </svg>
                </button>
                <div class="fullscreen-track" id="fullscreenTrack"></div>
                <div class="fullscreen-counter" id="fullscreenCounter"></div>
                <button class="fullscreen-nav fullscreen-prev" id="fullscreenPrev">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6"></path>
                    </svg>
                </button>
                <button class="fullscreen-nav fullscreen-next" id="fullscreenNext">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 18l6-6-6-6"></path>
                    </svg>
                </button>
            </div>
        `;
        document.body.appendChild(fullscreenModal);
        
        this.fullscreenModal = fullscreenModal;
        this.fullscreenCloseBtn = document.getElementById('fullscreenCloseBtn');
        this.fullscreenPrev = document.getElementById('fullscreenPrev');
        this.fullscreenNext = document.getElementById('fullscreenNext');
    }

    bindEvents() {
        // Close button
        this.closeBtn.addEventListener('click', () => this.closeListing());
        
        // Overlay background click
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeListing();
            }
        });
        
        // Touch events for carousel - delegated to imageCarousel
        this.carouselTrack.addEventListener('touchstart', (e) => this.imageCarousel.handleTouchStart(e));
        this.carouselTrack.addEventListener('touchmove', (e) => this.imageCarousel.handleTouchMove(e));
        this.carouselTrack.addEventListener('touchend', (e) => this.imageCarousel.handleTouchEnd(e));
        
// Contact actions with safety checks
if (this.whatsappBtn) {
    this.whatsappBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleWhatsApp();
        this.whatsappBtn.blur();
    });
}
if (this.contactInfoBtn) {
    this.contactInfoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleContactInfo();
        this.contactInfoBtn.blur();
    });
}
if (this.messageBtn) {
    this.messageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleMessage();
        this.messageBtn.blur();
    });
}

// Report button handler
if (this.reportBtn) {
    this.reportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleReport();
        this.reportBtn.blur();
    });
}

// Aggressive focus removal for all contact buttons
[this.whatsappBtn, this.messageBtn, this.contactInfoBtn, this.reportBtn].forEach(btn => {
    if (btn) {
        btn.addEventListener('touchstart', function() {
            this.blur();
        });
        btn.addEventListener('touchend', function() {
            setTimeout(() => this.blur(), 0);
        });
        btn.addEventListener('mousedown', function() {
            this.blur();
        });
    }
});
        
        // Escape key to close listing
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.closeListing();
            }
        });
        
        // Fullscreen events
if (this.fullscreenCloseBtn) {
    this.fullscreenCloseBtn.addEventListener('click', () => this.imageCarousel.closeFullscreen());
}

if (this.fullscreenPrev) {
    this.fullscreenPrev.addEventListener('click', () => this.imageCarousel.fullscreenPrevImage());
}

if (this.fullscreenNext) {
    this.fullscreenNext.addEventListener('click', () => this.imageCarousel.fullscreenNextImage());
}
        
        if (this.imageCarousel.fullscreenTrack) {
            // Fullscreen touch events - delegated to imageCarousel
            this.imageCarousel.fullscreenTrack.addEventListener('touchstart', (e) => this.imageCarousel.handleFullscreenTouchStart(e));
            this.imageCarousel.fullscreenTrack.addEventListener('touchmove', (e) => this.imageCarousel.handleFullscreenTouchMove(e));
            this.imageCarousel.fullscreenTrack.addEventListener('touchend', (e) => this.imageCarousel.handleFullscreenTouchEnd(e));
        }
        
        // Escape key for fullscreen
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.imageCarousel.isFullscreen) {
                this.imageCarousel.closeFullscreen();
            }
        });
    }

    openListing(listingData) {
        this.currentListing = listingData;
        
        this.populateListingData();
        this.imageCarousel.setupCarousel(listingData);
        this.setupRelatedListings();
        
        // Show overlay
        this.overlay.classList.remove('hidden');
        document.body.classList.add('listing-open');
        
        // Trigger fade-in animation
        setTimeout(() => {
            this.overlay.style.opacity = '1';
            this.overlay.style.visibility = 'visible';
        }, 10);
        
        // Track view
        trackEvent('marketplace_listing_view', {
            item_id: listingData.id,
            item_type: listingData.type || 'sale',
            category: listingData.category,
            has_images: this.imageCarousel.totalImages > 0
        });
    }

    closeListing() {
        this.overlay.style.opacity = '0';
        this.overlay.style.visibility = 'hidden';
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
            document.body.classList.remove('listing-open');
            this.currentListing = null;
            this.clearContent();
        }, 250);
        
        trackEvent('marketplace_listing_close', {
            item_id: this.currentListing?.id
        });
    }

    populateListingData() {
        const listing = this.currentListing;
        const isService = listing.type === 'service' || !listing.price;
        
        // Price
        if (this.listingPrice) {
            if (isService) {
                this.listingPrice.textContent = 'Service';
            } else {
                this.listingPrice.textContent = fmtMoney(listing.price || 0, listing.currency || 'USD');
            }
        }
        
        // Title
        if (this.listingTitle) {
            this.listingTitle.textContent = escapeHtml(listing.title);
        }
        
        // Meta (location + time)
        if (this.listingMeta) {
            const location = escapeHtml(listing.city) + ', ' + escapeHtml(listing.country);
            const timeAgo = getTimeAgo(listing.postedAt);
            this.listingMeta.innerHTML = `
                <span>📍 ${location}</span>
                <span>•</span>
                <span>${timeAgo}</span>
            `;
        }
        
        // Description
        if (this.listingDescription) {
            if (listing.type === 'service') {
    this.listingDescription.innerHTML = `
        <p><strong>${escapeHtml(listing.businessName || 'Service')}</strong></p>

        <p><strong>Service Details:</strong><br>
        ${escapeHtml(listing.serviceDescription)}</p>

        ${listing.serviceAddress ? `<p><strong>Address:</strong> ${escapeHtml(listing.serviceAddress)}</p>` : ''}

        ${listing.serviceHours ? `<p><strong>Hours:</strong> ${escapeHtml(listing.serviceHours)}</p>` : ''}

        ${listing.description ? `<p>${escapeHtml(listing.description)}</p>` : ''}
    `;
            } else if (listing.description) {
                this.listingDescription.innerHTML = `<p>${escapeHtml(listing.description)}</p>`;
            } else {
                this.listingDescription.innerHTML = '<p class="muted">No description provided.</p>';
            }
        }
        
        // Contact buttons
        if (this.whatsappBtn) {
            this.whatsappBtn.style.display = listing.contact?.phone ? 'flex' : 'none';
        }
    }

    handleWhatsApp() {
        const listing = this.currentListing;
        if (!listing.contact?.phone) return;
        
        const message = `Hi, I'm interested in your listing: ${listing.title}`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${listing.contact.phone.replace(/\+/g, '')}?text=${encodedMessage}`;
        
        window.open(whatsappUrl, '_blank');
        
        trackEvent('whatsapp_contact_listing', {
            item_id: listing.id,
            item_title: listing.title
        });
    }

    handleContactInfo() {
        const listing = this.currentListing;
        if (!listing.contact) return;
        
        // FIXED: Use the same ownerIdFromItem logic to ensure consistency
        const ownerId = (listing.owner && String(listing.owner).trim()) || 
                       (listing.contact?.email || listing.contact?.phone || listing.contact?.name || '').toString().trim().toLowerCase() || 
                       'unknown';
        
        openContact(listing.contact, ownerId);
        
        trackEvent('contact_info_listing', {
            item_id: listing.id,
            item_title: listing.title
        });
    }

    handleMessage() {
    const listing = this.currentListing;
    if (!listing) return;
    
    trackEvent('message_click', {
        item_type: 'marketplace',
        item_id: listing.id,
        item_title: listing.title,
        category: listing.category
    });
    
    // Convert marketplace listing to load-like format for chat
    const listingForChat = {
        id: listing.id,
        cargo: listing.title,
        originCity: listing.city,
        originCountry: listing.country,
        destCity: listing.city,
        destCountry: listing.country,
        price: listing.price,
        currency: listing.currency || 'USD',
        owner: listing.owner,
        contact: listing.contact,
        type: 'marketplace'
    };
    
    // ✅ FIX: Close the listing modal first
    this.closeListing();
    
    // ✅ Then open the chat after a brief delay to let the modal close
    setTimeout(() => {
        openLoadChat(listingForChat);
    }, 300); // Match your fade-out duration (250ms + small buffer)
}
    
  handleReport() {
    const listing = this.currentListing;
    if (!listing) return;
    
    // Track report button click
    trackEvent('report_listing_click', {
        item_id: listing.id,
        item_title: listing.title
    });
    
    // ✅ FIX: Use imported state consistently
    if (!state?.currentUser) {
        
        // ✅ FIX: Use imported function
        if (typeof authOpen === 'function') {
            authOpen();
        }
        return;
    }
    
    // ✅ FIX: Use imported function
    if (typeof openMarketplaceReportModal === 'function') {
        openMarketplaceReportModal(listing);
    } else {
        console.warn('Report modal function not available');
        showToast('Reporting feature is not available yet', 'warning');
    }
}

    setupRelatedListings() {
        const related = getRelatedListings(this.currentListing);
        
        if (!this.relatedScroll || !this.relatedSection) return;
        
        this.relatedScroll.innerHTML = '';
        
        if (related.length === 0) {
            this.relatedSection.style.display = 'none';
            return;
        }
        
        this.relatedSection.style.display = 'block';
        
        related.forEach(item => {
            const card = createRelatedCard(item, () => {
                this.openListing(item);
            });
            this.relatedScroll.appendChild(card);
        });
    }

    clearContent() {
        this.carouselTrack.innerHTML = '';
        this.carouselCounter.textContent = '';
        if (this.listingPrice) this.listingPrice.textContent = '';
        if (this.listingTitle) this.listingTitle.textContent = '';
        if (this.listingMeta) this.listingMeta.textContent = '';
        if (this.listingDescription) this.listingDescription.textContent = '';
        if (this.relatedScroll) this.relatedScroll.innerHTML = '';
    }
}

// Create singleton instance
const marketplaceListing = new MarketplaceListing();

// Export functions
export function openListing(listingData) {
    marketplaceListing.openListing(listingData);
}

export function closeListing() {
    marketplaceListing.closeListing();
}

// Make it globally available for existing code
window.openListing = openListing;
window.closeListing = closeListing;