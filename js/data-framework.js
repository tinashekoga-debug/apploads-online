// ===========================================
// data-framework.js
// ===========================================
// Handles data privacy, policy, and user consent management:
// - Data policy display
// - AI training consent
// - User data preferences
// ===========================================
// Exports: showDataPolicy, getUserDataPreferences, setAIConsent
// ===========================================

import { state } from './main.js';
import { trackEvent } from './firebase-config.js';
import { showLoading, hideLoading, showToast, closePopup } from './ui.js';

// =========================
// Data Policy Display
// =========================
export function showDataPolicy() {
    const body = document.getElementById('popupBody');
    
    // Check if user has already set AI consent
    const hasAIConsent = state.profile?.aiConsent || false;
    const consentDate = state.profile?.aiConsentDate ? new Date(state.profile.aiConsentDate).toLocaleDateString() : null;
    
    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0;">Data Policy & AI Training</h3>
        </div>
        
        <div style="max-height: 300px; overflow-y: auto; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
            <div style="margin-bottom: 16px; padding: 12px; background: #f8f9fa; border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0; font-size: 15px; font-weight: 600;">AI Training Program</h4>
                <p style="margin: 0 0 8px 0;">We're developing an AI assistant to help match loads, optimize routes, and improve logistics in the SADC region.</p>
                <p style="margin: 0;">By opting in, your anonymized data helps train better AI models for the entire trucking community.</p>
            </div>
            
            <p><strong>Data Storage:</strong> All user data is stored securely with encryption at rest.</p>
            <p><strong>Privacy Protection:</strong> We comply with applicable data protection regulations including GDPR where applicable.</p>
            <p><strong>Account Data:</strong> Your profile information is only visible to users you choose to contact through listings.</p>
            <p><strong>AI Training Data:</strong> If you opt in, we use anonymized, aggregated data to train our AI model Afi. No personally identifiable information is used.</p>
            <p><strong>Data Retention:</strong> You can delete your account at any time, which permanently removes all your data from our systems.</p>
            <p><strong>Security:</strong> All communications are encrypted using industry-standard SSL/TLS protocols.</p>
        </div>
        
        <!-- AI Consent Toggle -->
        <div style="margin-bottom: 24px; padding: 16px; background: #f0f7ff; border-radius: 10px; border-left: 4px solid #0b7d62;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div>
                    <h4 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600;">AI Training Consent</h4>
                    <p style="margin: 0; font-size: 13px; color: #666;">
                        Allow anonymized data to help train our AI assistant
                    </p>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" id="aiConsentToggle" ${hasAIConsent ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
            ${consentDate ? `<p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">Consent given on: ${consentDate}</p>` : ''}
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">
                You can change this setting anytime. Your data is always anonymized before AI training.
            </p>
        </div>
        
        <div class="button-row">
            <button class="btn" onclick="saveDataPreferences()">Save Preferences</button>
        </div>
    `;
    
    document.getElementById('popup').style.display = 'flex';
    
    // Track data policy view
    trackEvent('data_policy_viewed', {
        timestamp: Date.now(),
        user_id: state.currentUser?.uid || 'anonymous',
        has_ai_consent: hasAIConsent
    });
}

// =========================
// Save Data Preferences
// =========================
export async function saveDataPreferences() {
    if (!state.currentUser) {
        showToast('Please sign in to save preferences', 'error');
        return;
    }
    
    const aiConsent = document.getElementById('aiConsentToggle')?.checked || false;
    
    showLoading('Saving preferences...');
    
    try {
        // Import Firebase functions
        const { doc, updateDoc } = await import('./firebase-config.js');
        const { db } = await import('./main.js');
        
        // Update user profile with AI consent
        await updateDoc(doc(db, 'profiles', state.currentUser.uid), {
            aiConsent: aiConsent,
            aiConsentDate: aiConsent ? Date.now() : null,
            dataPreferencesUpdated: Date.now()
        });
        
        // Update local state
        state.profile = {
            ...state.profile,
            aiConsent: aiConsent,
            aiConsentDate: aiConsent ? Date.now() : null
        };
        
        // Track the consent change
        trackEvent('ai_consent_updated', {
            user_id: state.currentUser.uid,
            consent_given: aiConsent,
            timestamp: Date.now()
        });
        
        showToast(aiConsent ? 'Thank you for helping train Afi' : 'Preferences saved', 'success');
        closePopup();
        
    } catch (error) {
        console.error('Error saving data preferences:', error);
        showToast('Failed to save preferences. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// Get User Data Preferences
// =========================
export function getUserDataPreferences() {
    if (!state.profile) {
        return {
            aiConsent: false,
            aiConsentDate: null,
            dataPreferencesSet: false
        };
    }
    
    return {
        aiConsent: state.profile.aiConsent || false,
        aiConsentDate: state.profile.aiConsentDate || null,
        dataPreferencesSet: !!state.profile.dataPreferencesUpdated,
        lastUpdated: state.profile.dataPreferencesUpdated || null
    };
}

// =========================
// Set AI Consent (Programmatic)
// =========================
export async function setAIConsent(consent, userId = null) {
    const uid = userId || state.currentUser?.uid;
    if (!uid) {
        throw new Error('User not authenticated');
    }
    
    showLoading('Updating consent...');
    
    try {
        const { doc, updateDoc } = await import('./firebase-config.js');
        const { db } = await import('./main.js');
        
        await updateDoc(doc(db, 'profiles', uid), {
            aiConsent: consent,
            aiConsentDate: consent ? Date.now() : null,
            dataPreferencesUpdated: Date.now()
        });
        
        // Update local state if it's the current user
        if (state.currentUser && state.currentUser.uid === uid) {
            state.profile = {
                ...state.profile,
                aiConsent: consent,
                aiConsentDate: consent ? Date.now() : null
            };
        }
        
        trackEvent('ai_consent_set_programmatic', {
            user_id: uid,
            consent_given: consent,
            timestamp: Date.now()
        });
        
        return true;
    } catch (error) {
        console.error('Error setting AI consent:', error);
        showToast('Failed to update consent', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// =========================
// Check if User Needs Consent Prompt
// =========================
export function shouldShowConsentPrompt() {
    if (!state.profile) return false;
    
    // Show prompt if user has never been asked about AI consent
    return state.profile.aiConsent === undefined && 
           state.currentUser && 
           !state.profile.dataPreferencesUpdated;
}

// =========================
// Initialize Data Framework
// =========================
export function initializeDataFramework() {
    // Check if we should show consent prompt on first login
    if (shouldShowConsentPrompt()) {
        // Optional: Show welcome modal with consent option
        // Could be called after user signs up or first login
        console.log('User needs AI consent prompt');
    }
}

// =========================
// Global Functions
// =========================
window.showDataPolicy = showDataPolicy;
window.saveDataPreferences = saveDataPreferences;
window.getUserDataPreferences = getUserDataPreferences;

