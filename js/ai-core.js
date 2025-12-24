// ===========================================
// ai-core.js — Conversation & memory only
// ===========================================

import { askAfi } from './afi-ai.js'

class AfiAssistant {
    constructor() {
        this.history = []
    }

    async chat(message, onToken) {
        // Store user message
        this.history.push({
            role: 'user',
            content: message
        })

        // Keep last 3 exchanges
        if (this.history.length > 6) {
            this.history = this.history.slice(-6)
        }

        let finalReply = ""

        finalReply = await askAfi(message, (token) => {
            onToken?.(token)
        })

        // Store assistant reply
        this.history.push({
            role: 'assistant',
            content: finalReply
        })

        return finalReply
    }

    clearHistory() {
        this.history = []
    }
}

export const afi = new AfiAssistant()