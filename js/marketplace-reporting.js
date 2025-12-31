// ===========================================
// marketplace-reporting.js
// ===========================================
// Beautiful, elegant marketplace item reporting
// Matches app's WhatsApp-style drawer design
// ===========================================

import { state } from './main.js';
import { db, doc, setDoc, collection } from './firebase-config.js';
import { trackEvent } from './firebase-config.js';
import { showToast } from './ui.js';
import { authOpen } from './auth.js';

// Report reasons with clear, helpful descriptions
const REPORT_REASONS = [
    {
        id: 'spam',
        label: 'Spam or Misleading',
        description: 'Repetitive posts, fake listings, or misleading information'
    },
    {
        id: 'inappropriate',
        label: 'Inappropriate Content',
        description: 'Offensive, illegal, or inappropriate material'
    },
    {
        id: 'scam',
        label: 'Scam or Fraud',
        description: 'Suspicious activity, fake contact info, or fraudulent listing'
    },
    {
        id: 'wrong_category',
        label: 'Wrong Category',
        description: 'Item posted in incorrect category'
    },
    {
        id: 'sold',
        label: 'Already Sold/Taken',
        description: 'Item is no longer available but still listed'
    },
    {
        id: 'duplicate',
        label: 'Duplicate Listing',
        description: 'Same item posted multiple times'
    },
    {
        id: 'other',
        label: 'Other Issue',
        description: 'Something else that violates our guidelines'
    }
];

class MarketplaceReporting {
    constructor() {
        this.currentListing = null;
        this.drawer = null;
        this.backdrop = null;
        this.selectedReasons = new Set();
        this.init();
    }

    init() {
        this.createDrawer();
        this.bindEvents();
    }

    createDrawer() {
        // Check if already exists
        if (document.getElementById('reportDrawer')) {
            this.drawer = document.getElementById('reportDrawer');
            this.backdrop = document.getElementById('reportBackdrop');
            return;
        }

        // Create backdrop
        this.backdrop = document.createElement('div');
        this.backdrop.id = 'reportBackdrop';
        this.backdrop.className = 'drawer-backdrop';
        document.body.appendChild(this.backdrop);

        // Create drawer
        this.drawer = document.createElement('div');
        this.drawer.id = 'reportDrawer';
        this.drawer.className = 'bottom-sheet-drawer report-drawer hidden';
        
        this.drawer.innerHTML = `
            <div class="drawer-drag-handle">
                <div class="drag-handle-pill"></div>
            </div>
            
            <div class="drawer-content">
                <div class="report-header">
                    <h3 class="report-title">Report Listing</h3>
                    <p class="report-subtitle">Help us keep AppLoads safe and trustworthy</p>
                </div>

                <div class="report-listing-preview" id="reportListingPreview">
                    <!-- Listing info will be inserted here -->
                </div>

                <div class="report-reasons-section">
                    <h4 class="section-label">Why are you reporting this?</h4>
                    <p class="section-hint">Select all that apply</p>
                    
                    <div class="report-reasons-list" id="reportReasonsList">
                        ${REPORT_REASONS.map(reason => `
                            <label class="report-reason-item" data-reason="${reason.id}">
                                <input type="checkbox" value="${reason.id}" style="display: none;">
                                <span class="reason-checkbox">
                                    <svg class="checkbox-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                </span>
                                <div class="reason-content">
                                    <div class="reason-label">${reason.label}</div>
                                    <div class="reason-description">${reason.description}</div>
                                </div>
                            </label>
                        `).join('')}
                    </div>
                </div>

                <div class="report-details-section">
                    <h4 class="section-label">Additional Details (Optional)</h4>
                    <textarea 
                        id="reportDetails" 
                        class="report-textarea" 
                        placeholder="Provide any additional information that might help us review this report..."
                        maxlength="500"
                    ></textarea>
                    <div class="char-counter">
                        <span id="reportCharCount">0</span>/500
                    </div>
                </div>
            </div>

            <div class="drawer-footer sticky-bottom">
                <button class="btn-secondary" data-action="cancel-report">Cancel</button>
                <button class="btn-primary" data-action="submit-report">Submit Report</button>
            </div>
        `;

        document.body.appendChild(this.drawer);
    }

    bindEvents() {
        // Backdrop click to close
        this.backdrop.addEventListener('click', () => this.closeDrawer());

        // Reason selection
        this.drawer.addEventListener('click', (e) => {
            const reasonItem = e.target.closest('.report-reason-item');
            if (reasonItem) {
                e.preventDefault();
                this.toggleReason(reasonItem);
            }
        });

        // Character counter
        const textarea = this.drawer.querySelector('#reportDetails');
        const charCount = this.drawer.querySelector('#reportCharCount');
        if (textarea && charCount) {
            textarea.addEventListener('input', () => {
                charCount.textContent = textarea.value.length;
            });
        }

        // Action buttons
        this.drawer.addEventListener('click', (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            
            if (action === 'cancel-report') {
                this.closeDrawer();
            } else if (action === 'submit-report') {
                this.submitReport();
            }
        });

        // Swipe down to close (mobile)
        let startY = 0;
        let currentY = 0;
        let isDragging = false;

        const dragHandle = this.drawer.querySelector('.drawer-drag-handle');
        
        dragHandle.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            isDragging = true;
        });

        dragHandle.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            if (deltaY > 0) {
                this.drawer.style.transform = `translateY(${deltaY}px)`;
            }
        });

        dragHandle.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const deltaY = currentY - startY;
            
            if (deltaY > 100) {
                this.closeDrawer();
            } else {
                this.drawer.style.transform = '';
            }
        });
    }

    toggleReason(reasonItem) {
        const checkbox = reasonItem.querySelector('input[type="checkbox"]');
        const reasonId = reasonItem.dataset.reason;

        if (this.selectedReasons.has(reasonId)) {
            this.selectedReasons.delete(reasonId);
            reasonItem.classList.remove('selected');
            checkbox.checked = false;
        } else {
            this.selectedReasons.add(reasonId);
            reasonItem.classList.add('selected');
            checkbox.checked = true;
        }

        console.log('📋 Selected reasons:', Array.from(this.selectedReasons));
    }

    openDrawer(listing) {
        if (!listing) {
            console.error('❌ No listing provided to report');
            return;
        }

        // Check if user is logged in
        if (!state?.currentUser) {
            if (typeof authOpen === 'function') {
                authOpen();
            }
            return;
        }

        this.currentListing = listing;
        this.selectedReasons.clear();

        // Populate listing preview
        this.populateListingPreview(listing);

        // Reset form
        this.resetForm();

        // Show drawer
        this.drawer.classList.remove('hidden');
        this.backdrop.classList.add('active');
        document.body.classList.add('drawer-open');

        // Animate in
        setTimeout(() => {
            this.drawer.classList.add('open');
        }, 10);

        trackEvent('report_drawer_opened', {
            item_id: listing.id,
            item_type: 'marketplace'
        });
    }

    closeDrawer() {
        this.drawer.classList.remove('open');
        this.backdrop.classList.remove('active');
        document.body.classList.remove('drawer-open');

        setTimeout(() => {
            this.drawer.classList.add('hidden');
            this.drawer.style.transform = '';
            this.currentListing = null;
            this.selectedReasons.clear();
        }, 300);
    }

    populateListingPreview(listing) {
        const preview = this.drawer.querySelector('#reportListingPreview');
        if (!preview) return;

        const images = Array.isArray(listing.images) ? listing.images : 
                      (listing.image ? [listing.image] : []);
        const firstImage = images[0] || '';

        preview.innerHTML = `
            <div class="preview-card">
                ${firstImage ? `
                    <img src="${firstImage}" alt="${listing.title}" class="preview-image">
                ` : `
                    <div class="preview-image-placeholder">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                            <circle cx="8.5" cy="8.5" r="1.5"></circle>
                            <polyline points="21 15 16 10 5 21"></polyline>
                        </svg>
                    </div>
                `}
                <div class="preview-info">
                    <div class="preview-title">${listing.title || 'Untitled'}</div>
                    <div class="preview-meta">
                        <span>${listing.city || 'Unknown'}, ${listing.country || 'Unknown'}</span>
                        ${listing.price ? `<span class="preview-price">${listing.currency || 'USD'} ${listing.price}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    resetForm() {
        // Clear checkboxes
        this.drawer.querySelectorAll('.report-reason-item').forEach(item => {
            item.classList.remove('selected');
            const checkbox = item.querySelector('input[type="checkbox"]');
            if (checkbox) checkbox.checked = false;
        });

        // Clear textarea
        const textarea = this.drawer.querySelector('#reportDetails');
        const charCount = this.drawer.querySelector('#reportCharCount');
        if (textarea) textarea.value = '';
        if (charCount) charCount.textContent = '0';
    }

    async submitReport() {
        if (this.selectedReasons.size === 0) {
            showToast('Please select at least one reason', 'warning');
            return;
        }

        if (!this.currentListing) {
            showToast('Listing information missing', 'error');
            return;
        }

        if (!state?.currentUser) {
            return;
        }

        const submitBtn = this.drawer.querySelector('[data-action="submit-report"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        try {
            const reportData = {
                listingId: this.currentListing.id,
                listingTitle: this.currentListing.title,
                listingOwner: this.currentListing.owner || 'unknown',
                reportedBy: state.currentUser.uid,
                reporterEmail: state.currentUser.email,
                reasons: Array.from(this.selectedReasons),
                details: this.drawer.querySelector('#reportDetails').value.trim(),
                timestamp: new Date().toISOString(),
                status: 'pending',
                itemType: 'marketplace'
            };

            // Save to Firestore
            const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(db, 'marketplaceReports', reportId), reportData);

            trackEvent('report_submitted', {
                item_id: this.currentListing.id,
                reasons: reportData.reasons,
                item_type: 'marketplace'
            });

            showToast('Thank you for your report. We will review it shortly.', 'success');
            this.closeDrawer();
        } catch (error) {
            console.error('❌ Error submitting report:', error);
            showToast('Failed to submit report. Please try again.', 'error');
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }
}

// Create singleton instance
const marketplaceReporting = new MarketplaceReporting();

// Export function to open report drawer
export function openMarketplaceReportModal(listing) {
    marketplaceReporting.openDrawer(listing);
}

// Setup function for initialization
export function setupMarketplaceReporting() {
    console.log('✅ Marketplace reporting initialized');
}

// Make it globally available for existing code
window.openMarketplaceReportModal = openMarketplaceReportModal;