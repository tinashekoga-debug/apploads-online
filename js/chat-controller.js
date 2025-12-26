// ===========================================
// chat-controller.js - ACTUALLY FIXED NOW
// ===========================================
// Fixed: Messages now persist and sync properly
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
let currentMessages = [];
let currentConversationId = null;

// =========================
// Open Chat from Load Card
// =========================
export async function openLoadChat(loadData) {
    if (!state.currentUser) {
        authOpen('signin', () => {
            if (state.currentUser) {
                openLoadChat(loadData);
            }
        });
        return;
    }
    
    try {
        const ownerUid = loadData.owner || loadData.ownerKey || 'unknown';
        const conversationId = await createConversation(loadData.id, state.currentUser.uid, ownerUid);
        openChatScreen(conversationId, loadData);
    } catch (error) {
        console.error('Error opening chat:', error);
        showToast(error.message || 'Failed to start conversation', 'error');
    }
}

// =========================
// Open Chat Screen
// =========================
export async function openChatScreen(conversationId, loadData = null) {
    currentConversationId = conversationId;
    currentMessages = []; // Reset messages
    
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
                    <!-- Messages load instantly -->
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
    
    const overlay = document.createElement('div');
    overlay.className = 'chat-overlay';
    overlay.innerHTML = chatHTML;
    document.body.appendChild(overlay);
    
   // Mark as read IMMEDIATELY (optimistic update)
    markAsReadOptimistic(conversationId);
    
    // Load existing messages first, then setup listener
    await loadInitialMessages(conversationId);
    
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
// Mark as Read (Optimistic)
// =========================
function markAsReadOptimistic(conversationId) {
    if (!state.currentUser) return;
    
    // Update badge IMMEDIATELY
    const badge = document.querySelector('.tab-count-badge.unread');
    if (badge) {
        badge.style.display = 'none';
    }
    
    // Also remove unread indicator from conversation item
    const convItem = document.querySelector(`[data-conversation-id="${conversationId}"]`);
    if (convItem) {
        const unreadDot = convItem.querySelector('.conversation-unread');
        if (unreadDot) {
            unreadDot.remove();
        }
    }
    
    // Then update Firestore in background (debounced)
    clearTimeout(window._markReadTimeout);
    window._markReadTimeout = setTimeout(() => {
        markConversationAsRead(conversationId, state.currentUser.uid)
            .then(() => updateUnreadBadge())
            .catch(err => console.error('Failed to mark as read:', err));
    }, 1000);
}
    
    // =========================
    // Load Initial Messages
    // =========================
async function loadInitialMessages(conversationId) {
    try {
        const messages = await getMessages(conversationId);
        currentMessages = messages.map(msg => ({
            id: msg.id,
            ...msg
        }));
    } catch (error) {
        console.error('Error loading initial messages:', error);
        currentMessages = [];
    }
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
    
    // Show empty state immediately
    messagesContainer.innerHTML = `
        <div class="empty-conversations">
            <div class="empty-conversations-icon"></div>
            <h3>Start a conversation</h3>
            <p>Send a message about this post</p>
        </div>
    `;
    
    // Setup real-time listener FIRST (this will update currentMessages)
    setupMessageListener(conversationId, messagesContainer);
    
    // Send message handler
    async function sendChatMessage() {
        const text = input.value.trim();
        if (!text || !state.currentUser) return;
        
        // Optimistic update - add message immediately to UI
        const optimisticMsg = {
            id: `temp_${Date.now()}`,
            senderId: state.currentUser.uid,
            text: text,
            createdAt: new Date(),
            _sending: true
        };
        
        // Add to current messages and render
        currentMessages.push(optimisticMsg);
        renderMessages(messagesContainer);
        
        // Clear input
        input.value = '';
        input.style.height = 'auto';
        sendBtn.disabled = true;
        
        try {
            // Send to Firestore (real-time listener will update automatically)
            await sendMessage(conversationId, state.currentUser.uid, text);
            
            // Don't remove optimistic message - listener will replace it with real one
            
        } catch (error) {
            console.error('Error sending message:', error);
            showToast('Failed to send message', 'error');
            
            // Mark as failed instead of removing
            const msg = currentMessages.find(m => m.id === optimisticMsg.id);
            if (msg) {
                msg._failed = true;
                delete msg._sending;
                renderMessages(messagesContainer);
            }
        }
    }
    
    // Auto-resize textarea
    input.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = !this.value.trim();
    });
    
    // Send on Enter
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    sendBtn.addEventListener('click', sendChatMessage);
    backBtn.addEventListener('click', closeChatScreen);
    
    // Close on Escape
    const escapeHandler = (e) => {
        if (e.key === 'Escape') closeChatScreen();
    };
    document.addEventListener('keydown', escapeHandler);
    
    // Cleanup
    messagesContainer._cleanupEscape = () => {
        document.removeEventListener('keydown', escapeHandler);
    };
}

// =========================
// Render Messages
// =========================
function renderMessages(container) {
    if (currentMessages.length === 0) {
        container.innerHTML = `
            <div class="empty-conversations">
                <div class="empty-conversations-icon"></div>
                <h3>Start a conversation</h3>
                <p>Send a message about this post</p>
            </div>
        `;
        return;
    }
    
    const wasScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
    
    container.innerHTML = currentMessages.map(msg => {
        const isSent = msg.senderId === state.currentUser?.uid;
        const statusIcon = msg._sending ? `<span class="msg-status">⏱️</span>` : 
                          msg._failed ? `<span class="msg-status msg-failed">❌ Failed</span>` : '';
        
        return `
            <div class="message-bubble ${isSent ? 'message-sent' : 'message-received'}">
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-timestamp">
                    ${formatMessageTime(msg.createdAt)}
                    ${statusIcon}
                </div>
            </div>
        `;
    }).join('');
    
    // Auto-scroll if user was at bottom
    if (wasScrolledToBottom) {
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 0);
    }
}

// =========================
// Format Timestamp
// =========================
function formatMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
    
    // =========================
// Get Timestamp (helper)
// =========================
function getTimestamp(timestamp) {
    if (!timestamp) return 0;
    if (timestamp.toDate) return timestamp.toDate().getTime();
    if (timestamp instanceof Date) return timestamp.getTime();
    return new Date(timestamp).getTime();
}

// =========================
// Setup Real-time Listener
// =========================
function setupMessageListener(conversationId, container) {
    // Clean up existing listener
    if (messageListeners.has(conversationId)) {
        messageListeners.get(conversationId)();
    }
    
    import('./firebase-config.js').then(({ db, collection, query, orderBy, onSnapshot }) => {
        const messagesRef = collection(db, 'conversations', conversationId, 'messages');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Get all messages from Firestore
            const firestoreMessages = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Keep only optimistic messages that don't match any Firestore message
            // Match by text AND senderId AND timestamp within 5 seconds
            const optimisticMessages = currentMessages.filter(m => {
                if (!m.id.startsWith('temp_')) return false;
                
                return !firestoreMessages.some(fm => 
                    fm.text === m.text && 
                    fm.senderId === m.senderId &&
                    Math.abs(getTimestamp(fm.createdAt) - getTimestamp(m.createdAt)) < 5000
                );
            });
            
            // Combine: Firestore messages + remaining optimistic messages
            currentMessages = [...firestoreMessages, ...optimisticMessages];
            
            renderMessages(container);
        }, (error) => {
            console.error('Message listener error:', error);
        });
        
        messageListeners.set(conversationId, unsubscribe);
    });
}

// =========================
// Close Chat Screen
// =========================
export function closeChatScreen() {
    messageListeners.forEach(unsubscribe => unsubscribe());
    messageListeners.clear();
    
    const messagesContainer = document.getElementById('chatMessages');
    if (messagesContainer?._cleanupEscape) {
        messagesContainer._cleanupEscape();
    }
    
    const overlay = document.querySelector('.chat-overlay');
    if (overlay) {
        const chatScreen = overlay.querySelector('.chat-screen');
        if (chatScreen) {
            chatScreen.style.animation = 'slideOutDown 0.3s ease';
        }
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 300);
    }
    
    currentMessages = [];
    currentConversationId = null;
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

// Export for load cards
window.openLoadChat = openLoadChat;