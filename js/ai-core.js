// ===========================================
// ai-core.js - AI Core Logic
// ===========================================

import { AI_CONFIG, getApiKey } from './ai-config.js';
import { buildContext } from './ai-context.js'; // ✅ ADD THIS LINE

class AfiAssistant {
    constructor() {
        this.conversationHistory = [];
    }
    
    async chat(message) {
        const apiKey = getApiKey();
        
        if (!apiKey) {
            return "I need a HuggingFace API key to work. Please set it up in Settings.";
        }
        
        try {
            // Add user message to history
            this.conversationHistory.push({
                role: 'user',
                content: message
            });
            
            // Keep only last 6 messages
            if (this.conversationHistory.length > 6) {
                this.conversationHistory = this.conversationHistory.slice(-6);
            }
            
            // ✅ BUILD CONTEXT - NEW!
            const context = buildContext(message);
            
            // Build conversation text
            const conversationText = this.conversationHistory
                .map(msg => `${msg.role === 'user' ? 'User' : 'Afi'}: ${msg.content}`)
                .join('\n');
            
            // ✅ COMBINE CONTEXT + CONVERSATION - UPDATED!
            const prompt = `${context}\n\nConversation:\n${conversationText}\nAfi:`;
            
            // Call HuggingFace API
            const response = await fetch(
                `${AI_CONFIG.HUGGINGFACE_API_URL}/${AI_CONFIG.DEFAULT_MODEL}`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        inputs: prompt,
                        parameters: {
                            max_length: AI_CONFIG.MAX_TOKENS,
                            temperature: AI_CONFIG.TEMPERATURE
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`);
            }
            
            const data = await response.json();
            let reply = data[0]?.generated_text || 'Sorry, I could not generate a response.';
            
            // Clean up response
            reply = reply.replace(prompt, '').trim();
            reply = reply.replace(/^Afi:\s*/, '').trim();
            
            // Add AI response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: reply
            });
            
            return reply;
            
        } catch (error) {
            console.error('AI Error:', error);
            return 'Sorry, I encountered an error. Please check your API key and try again.';
        }
    }
    
    clearHistory() {
        this.conversationHistory = [];
    }
}

export const afi = new AfiAssistant();