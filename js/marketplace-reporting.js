// ===========================================
// marketplace-reporting.js
// ===========================================
// Handles marketplace-specific reporting functionality
// ===========================================

import { trackEvent } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from './firebase-config.js';
import { db } from './main.js';
import { showToast } from './ui.js';
import { authOpen } from './auth.js'; // ADD THIS IMPORT TOO

// Marketplace-specific reporting reasons
const MARKETPLACE_REPORT_REASONS = {
    'scam_fraud': 'Scam or fraudulent listing',
    'wrong_category': 'Wrong category',
    'prohibited_item': 'Prohibited or illegal item',
    'fake_images': 'Fake or stolen images',
    'price_misleading': 'Price is misleading',
    'contact_issues': "Can't contact seller",
    'sold_available': 'Already sold but still listed',
    'spam': 'Spam or duplicate listing',
    'harassment': 'Harassment or inappropriate behavior',
    'other': 'Other reason'
};

class MarketplaceReporting {
    constructor() {
        this.currentListing = null;
        this.selectedReasons = new Set();
        this.init();
    }

    init() {
        this.createReportModal();
        this.bindEvents();
    }

    createReportModal() {
        // Check if modal already exists
        if (document.getElementById('marketplaceReportModal')) return;

        const modalHTML = `
            <div id="marketplaceReportModal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 style="margin:0">Report Listing</h3>
                        <button class="modal-close" data-action="close-report-modal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                                <path d="M18 6L6 18M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="report-listing-info" id="reportListingInfo" style="margin-bottom: 20px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                            <strong id="reportItemTitle"></strong>
                            <div class="muted" id="reportItemDetails" style="margin-top: 4px; font-size: 0.9rem;"></div>
                        </div>

                        <div class="report-section">
                            <h4 style="margin: 0 0 12px 0; font-size: 1rem;">Why are you reporting this listing?</h4>
                            <p class="muted" style="margin: 0 0 16px 0; font-size: 0.9rem;">Select all that apply</p>
                            
                            <div class="report-reasons-list">
                                ${Object.entries(MARKETPLACE_REPORT_REASONS).map(([key, label]) => `
                                    <label class="report-reason-item">
                                        <input type="checkbox" name="reportReason" value="${key}" />
                                        <span class="checkmark"></span>
                                        <span class="reason-label">${label}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>

                        <div class="report-section" id="otherReasonSection" style="display: none; margin-top: 16px;">
                            <label style="display: block; margin-bottom: 8px; font-weight: 600;">Please provide more details</label>
                            <textarea id="otherReasonDetails" placeholder="Please describe the issue..." rows="3" style="width: 100%; padding: 12px; border: 1px solid var(--line); border-radius: 8px; resize: vertical;"></textarea>
                        </div>

                        <div class="modal-actions" style="margin-top: 20px;">
                            <button class="btn secondary" data-action="cancel-report">Cancel</button>
                            <button class="btn warning" data-action="submit-report" disabled>Submit Report</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.bindModalEvents();
    }

    bindEvents() {
        // Global event listener for report buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('#reportBtn')) {
                this.openReportModal();
            }
        });
    }

    bindModalEvents() {
        const modal = document.getElementById('marketplaceReportModal');
        if (!modal) return;

        // Close buttons
        modal.querySelector('[data-action="close-report-modal"]').addEventListener('click', () => this.closeReportModal());
        modal.querySelector('[data-action="cancel-report"]').addEventListener('click', () => this.closeReportModal());

        // Reason checkboxes
        modal.querySelectorAll('input[name="reportReason"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => this.handleReasonChange(e.target));
        });

        // Other reason textarea
        const otherTextarea = modal.querySelector('#otherReasonDetails');
        if (otherTextarea) {
            otherTextarea.addEventListener('input', () => this.validateForm());
        }

        // Submit button
        modal.querySelector('[data-action="submit-report"]').addEventListener('click', () => this.submitReport());
    }

    openReportModal(listingData = null) {
    // Check if user is logged in
    if (!window.state?.currentUser) {
        showToast('Please sign in to report listings', 'warning');
        
        // Open auth modal instead
        if (typeof authOpen === 'function') {
            authOpen();
        }
        return;
    }

    if (listingData) {
        this.currentListing = listingData;
    } else if (window.marketplaceListing && window.marketplaceListing.currentListing) {
        this.currentListing = window.marketplaceListing.currentListing;
    } else {
        console.error('No listing data available for reporting');
        showToast('Unable to report this listing', 'error');
        return;
    }

    // Populate listing info
    const titleEl = document.getElementById('reportItemTitle');
    const detailsEl = document.getElementById('reportItemDetails');
    
    if (titleEl) titleEl.textContent = this.currentListing.title || 'Unknown Listing';
    if (detailsEl) {
        const location = `${this.currentListing.city || ''}, ${this.currentListing.country || ''}`.replace(/^, |, $/g, '');
        const price = this.currentListing.price ? `• ${this.currentListing.price} ${this.currentListing.currency || ''}` : '';
        detailsEl.textContent = `${location} ${price}`.trim();
    }

    // Reset form
    this.selectedReasons.clear();
    document.querySelectorAll('input[name="reportReason"]').forEach(cb => cb.checked = false);
    document.getElementById('otherReasonDetails').value = '';
    document.getElementById('otherReasonSection').style.display = 'none';
    document.querySelector('[data-action="submit-report"]').disabled = true;

    // Show modal
    const modal = document.getElementById('marketplaceReportModal');
    modal.classList.add('show');
}

    closeReportModal() {
        const modal = document.getElementById('marketplaceReportModal');
        modal.classList.remove('show');
        this.selectedReasons.clear();
        this.currentListing = null;
    }

    handleReasonChange(checkbox) {
        if (checkbox.checked) {
            this.selectedReasons.add(checkbox.value);
        } else {
            this.selectedReasons.delete(checkbox.value);
        }

        // Show/hide other reason textarea
        const otherSection = document.getElementById('otherReasonSection');
        if (this.selectedReasons.has('other')) {
            otherSection.style.display = 'block';
        } else {
            otherSection.style.display = 'none';
        }

        this.validateForm();
    }

    validateForm() {
        const submitBtn = document.querySelector('[data-action="submit-report"]');
        const hasReasons = this.selectedReasons.size > 0;
        const otherDetails = document.getElementById('otherReasonDetails').value.trim();
        
        if (this.selectedReasons.has('other') && !otherDetails) {
            submitBtn.disabled = true;
        } else {
            submitBtn.disabled = !hasReasons;
        }
    }

    async submitReport() {
        if (!this.currentListing || this.selectedReasons.size === 0) return;

        const otherDetails = document.getElementById('otherReasonDetails').value.trim();
        const reasons = Array.from(this.selectedReasons);
        
        try {
            // Save report to Firestore
            const reportId = `marketplace_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await setDoc(doc(db, 'marketplace_reports', reportId), {
                listing_id: this.currentListing.id,
                listing_title: this.currentListing.title,
                listing_type: this.currentListing.type || 'sale',
                category: this.currentListing.category,
                seller_contact: this.currentListing.contact,
                reasons: reasons,
                other_details: otherDetails,
                reported_at: serverTimestamp(),
                status: 'pending',
                reporter_uid: window.state?.currentUser?.uid || 'anonymous'
            });

            // Track event
            trackEvent('marketplace_item_reported', {
                item_id: this.currentListing.id,
                item_type: this.currentListing.type || 'sale',
                reasons: reasons,
                has_other_details: !!otherDetails
            });

            // Success feedback
            showToast('Report submitted successfully', 'success');
            this.closeReportModal();

        } catch (error) {
            console.error('Error submitting marketplace report:', error);
            showToast('Failed to submit report. Please try again.', 'error');
        }
    }
}

// Create singleton instance
const marketplaceReporting = new MarketplaceReporting();

// Export functions
export function openMarketplaceReportModal(listingData = null) {
    marketplaceReporting.openReportModal(listingData);
}

export function setupMarketplaceReporting() {
    // Already initialized via singleton
    console.log('🛡️ Marketplace reporting initialized');
}

// Make globally available
window.openMarketplaceReportModal = openMarketplaceReportModal;

