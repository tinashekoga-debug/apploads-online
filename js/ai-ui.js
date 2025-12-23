// ===========================================
// ai-ui.js - Afi AI Chat Interface
// ===========================================
// This file handles the visual chat interface for Afi AI Assistant
// Uses existing chat-ui.css for styling
// NO imports from main.js to avoid circular dependencies
// ===========================================

import { afi } from './ai-core.js';
import { hasApiKey } from './ai-config.js';

// ===========================================
// HELPER: Get app state safely from window
// ===========================================
function getAppState() {
    return window.appState || { currentUser: null, profile: null };
}

// ===========================================
// HELPER: Escape HTML for security
// ===========================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===========================================
// HELPER: Show toast notification
// ===========================================
function showToast(message, type = 'info') {
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// ===========================================
// CLASS: AfiUI - Manages chat interface
// ===========================================
export class AfiUI {
    constructor() {
        this.isOpen = false;
        this.isThinking = false;
    }
    
    // ===========================================
    // RENDER: Afi assistant card for Messages tab
    // ===========================================
    // Uses existing .afi-assistant-card CSS class
    renderAssistantCard() {
        const hasKey = hasApiKey();
        const statusText = hasKey ? '✅ Available' : '⚙️ Setup Required';
        
        return `
            <div class="afi-assistant-card" data-action="open-afi-chat">
                <div class="afi-avatar">
                    <div style="color: white; font-weight: 700; font-size: 20px;">A</div>
                </div>
                <div class="afi-content">
                    <div class="afi-name">
                        Afi <span class="afi-badge">AI</span>
                    </div>
                    <div style="font-size: 12px; color: #64748b; margin-bottom: 4px;">
                        ${statusText}
                    </div>
                    <div class="afi-description">
                        Ask about SADC routes, pricing, documents & logistics
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===========================================
    // RENDER: Full chat interface overlay
    // ===========================================
    // Uses existing chat-ui.css classes
    renderChatInterface() {
        return `
            <div class="chat-screen" id="afiChatScreen">
                <!-- Header -->
                <div class="chat-screen-header">
                    <button class="chat-back-btn" data-action="close-afi-chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                    <div class="chat-header-title">Afi AI Assistant</div>
                </div>
                
                <!-- Messages Container -->
                <div class="chat-container">
                    <div class="chat-messages" id="afiMessages">
                        <!-- Welcome Message -->
                        <div class="message-bubble message-received">
                            <div>Hi! I'm Afi, your logistics assistant. Ask me about:</div>
                            <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
                                <button class="btn small secondary afi-quick-btn" data-question="Best route from Johannesburg to Harare?" style="font-size: 12px; padding: 6px 12px;">
                                    📍 Routes
                                </button>
                                <button class="btn small secondary afi-quick-btn" data-question="Estimate price for 20-ton cargo?" style="font-size: 12px; padding: 6px 12px;">
                                    💰 Pricing
                                </button>
                                <button class="btn small secondary afi-quick-btn" data-question="Border documents for Zimbabwe?" style="font-size: 12px; padding: 6px 12px;">
                                    📄 Documents
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Input Area -->
                    <div class="chat-input-container">
                        <div class="chat-input-wrapper">
                            <textarea 
                                id="afiInput"
                                class="chat-input"
                                placeholder="Ask about routes, pricing, documents..."
                                rows="1"
                            ></textarea>
                        </div>
                        <button id="afiSendBtn" class="chat-send-btn" disabled>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    // ===========================================
    // METHOD: Open chat window
    // ===========================================
    openChat() {
        // Check if API key exists
        if (!hasApiKey()) {
            showToast('⚙️ Please set up your HuggingFace API key first', 'warning');
            return;
        }
        
        if (this.isOpen) return;
        
        this.isOpen = true;
        document.body.insertAdjacentHTML('beforeend', this.renderChatInterface());
        this.setupChatListeners();
    }
    
    // ===========================================
    // METHOD: Setup event listeners for chat
    // ===========================================
    setupChatListeners() {
        const input = document.getElementById('afiInput');
        const sendBtn = document.getElementById('afiSendBtn');
        const closeBtn = document.querySelector('[data-action="close-afi-chat"]');
        
        if (!input || !sendBtn) return;
        
        // Auto-resize textarea
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            sendBtn.disabled = !this.value.trim();
        });
        
        // Send on Enter (Shift+Enter for new line)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        // Send button
        sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeChat());
        }
        
        // Quick question buttons
        document.querySelectorAll('.afi-quick-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.dataset.question || e.target.closest('.afi-quick-btn').dataset.question;
                if (question) {
                    input.value = question;
                    input.dispatchEvent(new Event('input'));
                    this.sendMessage();
                }
            });
        });
        
        // Focus input
        setTimeout(() => input.focus(), 100);
    }
    
    // ===========================================
    // METHOD: Send message to AI
    // ===========================================
    async sendMessage() {
        const input = document.getElementById('afiInput');
        const message = input.value.trim();
        
        if (!message || this.isThinking) return;
        
        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        document.getElementById('afiSendBtn').disabled = true;
        
        // Show thinking
        this.showThinking();
        
        try {
            // Call AI
            const response = await afi.chat(message);
            
            // Remove thinking
            this.removeThinking();
            
            // Add AI response
            this.addMessage(response, 'afi');
            
        } catch (error) {
            console.error('Chat error:', error);
            this.removeThinking();
            this.addMessage('Sorry, I encountered an error. Please try again.', 'afi');
        }
    }
    
    // ===========================================
    // METHOD: Add message to chat
    // ===========================================
    // Uses existing .message-bubble CSS classes
    addMessage(text, sender) {
        const messagesContainer = document.getElementById('afiMessages');
        if (!messagesContainer) return;
        
        const bubbleClass = sender === 'user' ? 'message-sent' : 'message-received';
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageHTML = `
            <div class="message-bubble ${bubbleClass}">
                <div>${escapeHtml(text)}</div>
                <div class="message-timestamp">${time}</div>
            </div>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // ===========================================
    // METHOD: Show thinking indicator
    // ===========================================
    showThinking() {
        this.isThinking = true;
        const messagesContainer = document.getElementById('afiMessages');
        if (!messagesContainer) return;
        
        const thinkingHTML = `
            <div class="message-bubble message-received" id="afiThinking">
                <div style="display: flex; gap: 4px;">
                    <span style="animation: blink 1.4s infinite;">●</span>
                    <span style="animation: blink 1.4s 0.2s infinite;">●</span>
                    <span style="animation: blink 1.4s 0.4s infinite;">●</span>
                </div>
            </div>
            <style>
                @keyframes blink {
                    0%, 60%, 100% { opacity: 0.3; }
                    30% { opacity: 1; }
                }
            </style>
        `;
        
        messagesContainer.insertAdjacentHTML('beforeend', thinkingHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    // ===========================================
    // METHOD: Remove thinking indicator
    // ===========================================
    removeThinking() {
        this.isThinking = false;
        const thinking = document.getElementById('afiThinking');
        if (thinking) thinking.remove();
    }
    
    // ===========================================
    // METHOD: Close chat window
    // ===========================================
    closeChat() {
        this.isOpen = false;
        const chatScreen = document.getElementById('afiChatScreen');
        if (chatScreen) chatScreen.remove();
    }
}

// ===========================================
// EXPORT: Create singleton instance
// ===========================================
export const afiUI = new AfiUI();