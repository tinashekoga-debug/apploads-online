
// ===========================================
// ai-integration.js - Afi AI Integration
// ===========================================
// Simple integration that connects Afi to your app
// NO circular dependencies - only imports AI modules
// ===========================================

import { afi } from './ai-core.js';
import { afiUI } from './ai-ui.js';
import { hasApiKey } from './ai-config.js';

// ===========================================
// MAIN SETUP FUNCTION
// ===========================================
// Called once from main.js after DOM is ready
export function setupAfiAI() {
    console.log('🤖 Setting up Afi AI Assistant...');
    
    // Check if API key is configured
    if (!hasApiKey()) {
        console.log('⚠️ Afi AI: No API key configured (user can set it up later)');
    } else {
        console.log('✅ Afi AI: Ready to use');
    }
    
    // Setup global click handler for Afi actions
    document.addEventListener('click', function(e) {
        // Open Afi chat when clicking data-action="open-afi-chat"
        const openBtn = e.target.closest('[data-action="open-afi-chat"]');
        if (openBtn) {
            e.preventDefault();
            afiUI.openChat();
        }
    });
    
    console.log('✅ Afi AI integration complete');
}

// ===========================================
// GLOBAL ACCESS (Optional)
// ===========================================
// Make Afi available globally for console testing
window.Afi = {
    chat: (msg) => afi.chat(msg),
    openChat: () => afiUI.openChat(),
    clearHistory: () => afi.clearHistory()
};
