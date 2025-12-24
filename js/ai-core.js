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
    
    try {
        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: message
        });
        
        // Keep only last 6 messages (3 exchanges)
        if (this.conversationHistory.length > 6) {
            this.conversationHistory = this.conversationHistory.slice(-6);
        }
        
        // ✅ BUILD CONTEXT
        const context = buildContext(message);
        
        // Build conversation text for Qwen3
        const conversationText = this.conversationHistory
            .slice(0, -1)
            .map(msg => `<|im_start|>${msg.role === 'user' ? 'user' : 'assistant'}\n${msg.content}<|im_end|>`)
            .join('\n');
        
        // ✅ QWEN3 PROMPT FORMAT
        const prompt = `<|im_start|>system
You are Afi, an AI logistics assistant for AppLoads, a trucking platform in Southern Africa (SADC region).

${context}<|im_end|>
${conversationText ? conversationText + '\n' : ''}<|im_start|>user
${message}<|im_end|>
<|im_start|>assistant
`;
        
        // ✅ CALL NETLIFY FUNCTION (instead of HuggingFace directly)
        const response = await fetch('/.netlify/functions/huggingface', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: AI_CONFIG.DEFAULT_MODEL,
                inputs: prompt,
                parameters: {
                    max_new_tokens: AI_CONFIG.MAX_TOKENS,
                    temperature: AI_CONFIG.TEMPERATURE,
                    return_full_text: false,
                    do_sample: true,
                    top_p: 0.95
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('API Error:', response.status, errorData);
            
            if (response.status === 503) {
                return 'Afi is warming up (first use takes 20 seconds). Please try again shortly.';
            }
            
            throw new Error(`API request failed: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Qwen3 response:', data);
        
        // ✅ QWEN3 RESPONSE PARSING
        let reply = '';
        
        if (Array.isArray(data) && data[0]?.generated_text) {
            reply = data[0].generated_text;
        } else if (data.generated_text) {
            reply = data.generated_text;
        } else if (data.error) {
            console.error('API returned error:', data.error);
            return 'Sorry, I encountered an error. Please try again.';
        } else {
            console.error('Unexpected response format:', data);
            return 'Sorry, I could not generate a response.';
        }
        
        // Clean up response
        reply = reply.trim();
        reply = reply.replace(/<\|im_end\|>.*$/s, '').trim();
        reply = reply.replace(/^<\|im_start\|>assistant\s*/i, '').trim();
        
        // Add AI response to history
        this.conversationHistory.push({
            role: 'assistant',
            content: reply
        });
        
        return reply;
        
    } catch (error) {
        console.error('AI Error:', error);
        return 'Sorry, I encountered an error. Please check your connection and try again.';
    }
}
    
    clearHistory() {
        this.conversationHistory = [];
    }
}

export const afi = new AfiAssistant();