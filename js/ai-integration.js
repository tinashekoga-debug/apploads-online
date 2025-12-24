// ===========================================
// ai-integration.js - Afi AI Integration
// ===========================================

import { hasApiKey } from './ai-config.js';
import { afi } from './ai-core.js';
import { AfiUI } from './ai-ui.js';

export const afiUI = new AfiUI(afi);

// ===========================================
// MAIN SETUP FUNCTION
// ===========================================
export function setupAfiAI() {
    console.log('🤖 Setting up Afi AI Assistant...');
    
    if (!hasApiKey()) {
        console.log('⚠️ Afi AI: No API key configured');
    } else {
        console.log('✅ Afi AI: Ready to use');
    }

    // Open Afi chat when clicking the assistant card
    document.addEventListener('click', function(e) {
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
window.Afi = {
    chat: (msg) => afi.chat(msg),
    openChat: () => afiUI.openChat(),
    clearHistory: () => afi.clearHistory()
};