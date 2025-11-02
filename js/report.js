// ===========================================
// report.js
// ===========================================
// Handles item reporting functionality
// ===========================================

import { trackEvent } from './firebase-config.js';
import { doc, setDoc, serverTimestamp } from './firebase-config.js';
import { db } from './main.js';

export function setupReportFunctionality() {
    console.log('📊 Reporting functionality initialized');
}

export function reportItem(itemType, itemId, reason, additionalDetails = '') {
    // Track report_item event
    trackEvent('report_item', {
        item_type: itemType,
        item_id: itemId,
        reason: reason,
        additional_details: additionalDetails,
        timestamp: Date.now()
    });
    
    // Save report to Firestore for admin review
    try {
        const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setDoc(doc(db, 'reports', reportId), {
            item_type: itemType,
            item_id: itemId,
            reason: reason,
            additional_details: additionalDetails,
            reported_at: serverTimestamp(),
            status: 'pending'
        });
        
        console.log(`Reported ${itemType} ${itemId}: ${reason}`, additionalDetails);
        return true;
    } catch (error) {
        console.error('Error saving report:', error);
        return false;
    }
}

// Global function for reporting with modal
window.reportItemWithModal = function(itemType, itemId, itemTitle = '') {
    const reason = prompt(`Why are you reporting this ${itemType}?\n\n"${itemTitle}"\n\nPlease provide details:`, '');
    
    if (reason && reason.trim()) {
        const success = reportItem(itemType, itemId, 'user_reported', reason.trim());
        if (success) {
            alert('Thank you for your report. We will review it shortly.');
        } else {
            alert('There was an error submitting your report. Please try again.');
        }
    }
};

// Global function for quick reporting
window.reportItem = reportItem;