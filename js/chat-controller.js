// ===========================================
// chat-controller.js
// ===========================================
// Main controller for chat functionality
// Handles opening chats, sending messages, and real-time updates
// ===========================================

import { state } from './main.js';
import { escapeHtml, showToast } from './ui.js';
import { authOpen } from './auth.js';
import { 
    createConversation, 
    sendMessage, 
    getMessages, 
    markConversationAsRead,
    getUnreadCount 
} from './conversation-model.js';

// Real-time listeners cache
let messageListeners = new Map();

// =========================
// Open Chat from Load Card
// =========================
export async function openLoadChat(loadData) {
    if (!state.currentUser) {
        // Show sign-in modal
        authOpen('signin', () => {
            // Retry after sign-in
            if (state.currentUser) {
                openLoadChat(loadData);
            }
        });
        return;
    }
    
    // Create or get conversation
    try {
        const ownerUid = loadData.owner || loadData.ownerKey || 'unknown';
        const conversationId = await createConversation(loadData.id, state.currentUser.uid, ownerUid);
        
        // Open chat screen
        openChatScreen(conversationId, loadData);
    } catch (error) {
        console.error('Error opening chat:', error);
        showToast(error.message || 'Failed to start conversation', 'error');
    }
}

// =========================
// Open Chat Screen
// =========================
export function openChatScreen(conversationId, loadData = null) {
    // Create chat screen HTML
    const chatHTML = `
        <div class="chat-screen" id="chatScreen">
            <div class="chat-screen-header">
                <button class="chat-back-btn" id="chatBackBtn">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                </button>
                <div class="chat-header-title">Message</div>
            </div>
            
            ${loadData ? renderLoadHeader(loadData) : ''}
            
            <div class="chat-container">
                <div class="chat-messages" id="chatMessages">
                    <div class="loading-message">Loading messages...</div>
                </div>
                
                <div class="chat-input-container">
                    <div class="chat-input-wrapper">
                        <textarea 
                            class="chat-input" 
                            id="chatInput" 
                            placeholder="Type your message..." 
                            rows="1"
                        ></textarea>
                    </div>
                    <button class="chat-send-btn" id="chatSendBtn" disabled>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add to body
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay';
    overlay.innerHTML = chatHTML;
    document.body.appendChild(overlay);
    
    // Initialize chat
    initializeChat(conversationId, loadData);
}

// =========================
// Render Load Header
// =========================
function renderLoadHeader(loadData) {
    return `
        <div class="chat-header">
            <div class="chat-header-compact">
                <div class="chat-load-title">${escapeHtml(loadData.cargo || 'Load')}</div>
                <div class="chat-load-route">
                    <span>${escapeHtml(loadData.originCity || '')}, ${escapeHtml(loadData.originCountry || '')}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span>${escapeHtml(loadData.destCity || '')}, ${escapeHtml(loadData.destCountry || '')}</span>
                </div>
                <div class="chat-load-meta">
                    ${loadData.price ? `<span class="chat-load-price">${escapeHtml(loadData.currency || 'USD')} ${loadData.price.toLocaleString()}</span>` : ''}
                    <span class="chat-load-id">#${escapeHtml(loadData.id?.substring(0, 8) || '')}</span>
                </div>
            </div>
        </div>
    `;
}

// =========================
// Initialize Chat
// =========================
async function initializeChat(conversationId, loadData) {
    const messagesContainer = document.getElementById('chatMessages');
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    const backBtn = document.getElementById('chatBackBtn');
    
    if (!messagesContainer || !input || !sendBtn || !backBtn) return;
    
    let messages = [];
    
    // Load existing messages
    async function loadChatMessages() {
        try {
            messages = await getMessages(conversationId);
            renderMessages();
            
            // Mark as read
            if (state.currentUser) {
                await markConversationAsRead(conversationId, state.currentUser.uid);
                updateUnreadBadge();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            messagesContainer.innerHTML = '<div class="error-message">Failed to load messages</div>';
        }
    }
    
    // Render messages
    function renderMessages() {
        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-conversations">
                    <div class="empty-conversations-icon">💬</div>
                    <h3>Start a conversation</h3>
                    <p>Send a message about this load</p>
                </div>
            `;
            return;
        }
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message-bubble ${msg.senderId === state.currentUser?.uid ? 'message-sent' : 'message-received'}">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-timestamp">${formatMessageTime(msg.createdAt)}</div>
            </div>
        `).join('');
        
        // Scroll to bottom
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
    
    // Format timestamp
    function formatMessageTime(timestamp) {
        if (!timestamp) return '';
        
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Send message
    async function sendChatMessage() {
        const text = input.value.trim();
        if (!text || !state.currentUser) return;
        
        try {
            await sendMessage(conversationId, state.currentUser.uid, text);
            input.value = '';
            input.style.height = 'auto';
            sendBtn.disabled = true;
            
            // Reload messages
            await loadChatMessages();
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
        }
    }
    
    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = !this.value.trim();
    });
    
    // Send on Enter (Shift+Enter for new line)
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Button events
    sendBtn.addEventListener('click', sendChatMessage);
    backBtn.addEventListener('click', closeChatScreen);
    
    // Close on Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeChatScreen();
        }
    });
    
    // Initial load
    await loadChatMessages();
    
    // Setup real-time listener
    setupMessageListener(conversationId);
}

// =========================
// Setup Real-time Listener
// =========================
function setupMessageListener(conversationId) {
    // Clean up existing listener
    if (messageListeners.has(conversationId)) {
        messageListeners.get(conversationId)();
    }
    
    // Import Firestore onSnapshot here to avoid initial bundle size
    import('./firebase-config.js').then(({ db, collection, query, orderBy, limit, onSnapshot }) => {
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(1));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                // New message received
                const newMsg = snapshot.docs[0].data();
                if (newMsg.senderId !== state.currentUser?.uid) {
                    // Mark as read if user is viewing the chat
                    markConversationAsRead(conversationId, state.currentUser.uid);
                    updateUnreadBadge();
                    
                    // Reload messages
                    const messagesContainer = document.getElementById('chatMessages');
                    if (messagesContainer) {
                        initializeChat(conversationId);
                    }
                }
            }
        });
        
        messageListeners.set(conversationId, unsubscribe);
    });
}

// =========================
// Close Chat Screen
// =========================
export function closeChatScreen() {
    // Clean up all listeners
    messageListeners.forEach(unsubscribe => unsubscribe());
    messageListeners.clear();
    
    // Remove chat screen
    const chatScreen = document.getElementById('chatScreen');
    const overlay = document.querySelector('.chat-overlay');
    
    if (chatScreen) {
        chatScreen.style.animation = 'slideOutDown 0.3s ease';
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
}

// =========================
// Update Unread Badge
// =========================
export async function updateUnreadBadge() {
    if (!state.currentUser) return;
    
    try {
        const unreadCount = await getUnreadCount(state.currentUser.uid);
        const badge = document.querySelector('.tab-count-badge.unread');
        
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error updating unread badge:', error);
    }
}

// =========================
// Export for Load Cards
// =========================
window.openLoadChat = openLoadChat;

