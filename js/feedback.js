// ===========================================
// feedback.js
// ===========================================
// Feedback form functionality

import { trackEvent } from './firebase-config.js';
import { state } from './main.js';
import { showLoading, hideLoading, showToast, closePopup } from './ui.js';

export function showFeedbackForm() {
    const body = document.getElementById('popupBody');
    
    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0;">Send Feedback</h3>
            <p class="muted">Your feedback helps us improve <strong>AppLoads</strong> for everyone.</p>
        </div>
        
        <div style="margin-bottom: 12px;">
            <label>What's this about?</label>
            <select id="feedbackType" style="margin-bottom: 12px;">
                <option value="bug">Report Errors</option>
                <option value="suggestion">Feature Idea</option>
                <option value="improvement">Improvement</option>
                <option value="general">General Feedback</option>
            </select>
            
            <label>Your Message *</label>
            <textarea id="feedbackMessage" placeholder="Please describe in detail..." 
                      style="min-height: 120px; margin-bottom: 8px;" required></textarea>
            
            <div class="muted" style="font-size: 0.8rem;">
                💡 For Errors: Include steps to reproduce and what you expected to happen
            </div>
        </div>
        
        <div class="button-row">
            <button class="btn" onclick="submitFeedback()">Send Feedback</button>
        </div>
    `;
    
    document.getElementById('popup').style.display = 'flex';
}

export async function submitFeedback() {
    const type = document.getElementById('feedbackType').value;
    const message = document.getElementById('feedbackMessage').value.trim();
    
    if (!message) {
        showToast('Please enter your feedback message', 'error');
        return;
    }
    
    showLoading('Sending feedback...');
    
    try {
        // Store feedback in Firebase
        const feedbackData = {
            type: type,
            message: message,
            userId: state.currentUser.uid,
            userEmail: state.currentUser.email || state.profile?.email || 'unknown',
            userName: state.profile?.name || 'Unknown',
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: Date.now(),
            appVersion: '2025-01-20.06.11',
            status: 'new'
        };
        
        // ✅ FIX: Use the already imported db and Firestore functions
        const { doc, collection, addDoc } = await import('./firebase-config.js');
        const { db } = await import('./main.js');
        
        // Use addDoc for auto-generated ID
        await addDoc(collection(db, 'feedback'), feedbackData);
        
        // Track feedback submission
        trackEvent('feedback_submitted', {
            type: type,
            message_length: message.length,
            user_id: state.currentUser.uid,
            user_name: state.profile?.name || 'Unknown'
        });
        
        showToast('✅ Thank you! Your feedback has been sent.', 'success');
        closePopup();
        
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showToast('Failed to send feedback. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Make it globally available
window.showFeedbackForm = showFeedbackForm;
window.submitFeedback = submitFeedback;

