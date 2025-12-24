
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
    
    if (!hasApiKey()) {
        console.log('⚠️ Afi AI: No API key configured');
    } else {
        console.log('✅ Afi AI: Ready to use');
    }

    // Open Afi chat
    document.addEventListener('click', function(e) {
        const openBtn = e.target.closest('[data-action="open-afi-chat"]');
        if (openBtn) {
            e.preventDefault();
            afiUI.openChat();
        }
    });

    // 🔥 THIS IS THE CRITICAL PART
    afiUI.onUserMessage(async (userMessage) => {
        try {
            afiUI.showTyping?.();

            const reply = await afi.chat(userMessage);

            afiUI.renderAssistantMessage(reply);
        } catch (err) {
            console.error('Afi AI error:', err);
            afiUI.renderAssistantMessage(
                'Sorry, something went wrong.'
            );
        } finally {
            afiUI.hideTyping?.();
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
