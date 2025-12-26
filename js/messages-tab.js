// ===========================================
// messages-tab.js - FIXED (No Spinner)
// ===========================================
// Renders the Messages tab in Account section
// Includes AI assistant (Afi) and conversation list
// NOW: Shows content immediately, loads data in background
// ===========================================

import { state } from './main.js';
import { getUserConversations } from './conversation-model.js';
import { openChatScreen } from './chat-controller.js';
import { escapeHtml, showToast, getTimeAgo } from './ui.js';
import { updateUnreadBadge } from './chat-controller.js';

// =========================
// Render Messages Tab
// =========================
export async function renderMessagesTab() {
    const container = document.getElementById('messagesTabContent');
    if (!container) return;
    
    // Cleanup existing listener when re-rendering
    if (conversationsUnsubscribe) {
        conversationsUnsubscribe();
        conversationsUnsubscribe = null;
    }
    
    // Check if user is signed in
    if (!state.currentUser) {
        renderSignInPrompt();
        return;
    }
    
    // Show Afi + empty state IMMEDIATELY (no spinner)
    container.innerHTML = `
        <div class="afi-assistant-card" id="afiAssistant">
            <div class="afi-avatar">A</div>
            <div class="afi-content">
                <div class="afi-name">Afi <span class="afi-badge">AI</span></div>
                <div class="afi-description">Your logistics assistant. Coming soon!</div>
            </div>
        </div>
        
        <div class="conversations-list">
            <!-- Conversations load here -->
        </div>
    `;
    
    // Setup Afi click listener immediately
    setupAfiListener();
    
    // Load conversations in background
    loadConversationsInBackground(container);
}

// =========================
// Load Conversations (Background)
// =========================
async function loadConversationsInBackground(container) {
    // Setup real-time listener instead of one-time load
    setupConversationsListener(container);
}

// =========================
// Get Load Data
// =========================
async function getLoadData(loadId) {
    // Try to find in state first
    const loadFromState = state.loads.find(l => l.id === loadId) || 
                         state.sales.find(s => s.id === loadId);
    
    if (loadFromState) return loadFromState;
    
    // If not found, fetch from Firestore
    try {
        const { db, doc, getDoc } = await import('./firebase-config.js');
        const loadDoc = await getDoc(doc(db, 'loads', loadId));
        
        if (loadDoc.exists()) {
            return { id: loadId, ...loadDoc.data() };
        }
        
        // Try marketplace
        const saleDoc = await getDoc(doc(db, 'marketplace', loadId));
        if (saleDoc.exists()) {
            return { id: loadId, ...saleDoc.data() };
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching load data:', error);
        return null;
    }
}

// =========================
// Render Conversations HTML
// =========================
function renderConversationsHTML(conversations) {
    if (conversations.length === 0) {
        return `
            <div class="empty-conversations">
                <div class="empty-conversations-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Message load owners from load cards to start a conversation</p>
            </div>
        `;
    }
    
    // Group by date
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    const grouped = conversations.reduce((acc, conv) => {
        const date = conv.lastMessageAt?.toDate ? 
            conv.lastMessageAt.toDate().toDateString() : 
            new Date(conv.lastMessageAt || conv.createdAt || Date.now()).toDateString();
        
        let label;
        if (date === today) label = 'Today';
        else if (date === yesterday) label = 'Yesterday';
        else label = new Date(date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: new Date().getFullYear() !== new Date(date).getFullYear() ? 'numeric' : undefined
        });
        
        if (!acc[label]) acc[label] = [];
        acc[label].push(conv);
        return acc;
    }, {});
    
    // Render grouped conversations
    return Object.entries(grouped).map(([label, convs]) => `
        <div class="conversation-group">
            <div class="conversation-group-label">${escapeHtml(label)}</div>
            ${convs.map(conv => renderConversationItem(conv)).join('')}
        </div>
    `).join('');
}

// =========================
// Render Conversation Item
// =========================
function renderConversationItem(conv) {
    const loadData = conv.loadData;
    const otherParticipant = conv.participants?.find(p => p !== state.currentUser?.uid) || 'User';
    const unreadCount = conv.unreadCount?.[state.currentUser?.uid] || 0;
    const lastMessageTime = conv.lastMessageAt?.toDate ? 
        conv.lastMessageAt.toDate() : 
        new Date(conv.lastMessageAt || conv.createdAt || Date.now());
    
    let title = 'Unknown Load';
    let route = '';
    
    if (loadData) {
        title = loadData.cargo || loadData.title || 'Load';
        if (loadData.originCity && loadData.destCity) {
            route = `${loadData.originCity} → ${loadData.destCity}`;
        } else if (loadData.city && loadData.country) {
            route = `${loadData.city}, ${loadData.country}`;
        }
    }
    
    // Get initial for avatar
    const initial = otherParticipant.charAt(0).toUpperCase();
    
    return `
        <div class="conversation-item" data-conversation-id="${escapeHtml(conv.id)}" data-load-id="${escapeHtml(conv.loadId)}">
            <div class="conversation-avatar">${initial}</div>
            <div class="conversation-content">
                <div class="conversation-header">
                    <div class="conversation-title">${escapeHtml(title)}</div>
                    <div class="conversation-time">${getTimeAgo(lastMessageTime.getTime())}</div>
                </div>
                ${route ? `<div class="conversation-route">${escapeHtml(route)}</div>` : ''}
                <div class="conversation-preview">${escapeHtml(conv.lastMessage || 'No messages yet')}</div>
            </div>
            ${unreadCount > 0 ? '<div class="conversation-unread"></div>' : ''}
        </div>
    `;
}

// =========================
// Setup Conversation Listeners
// =========================
function setupConversationListeners() {
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', async function() {
            const conversationId = this.dataset.conversationId;
            const loadId = this.dataset.loadId;
            
            try {
                const loadData = await getLoadData(loadId);
                openChatScreen(conversationId, loadData);
            } catch (error) {
                console.error('Error opening conversation:', error);
                showToast('Failed to open conversation', 'error');
            }
        });
    });
}

// =========================
// Setup Afi Listener
// =========================
function setupAfiListener() {
    const afiCard = document.getElementById('afiAssistant');
    if (afiCard) {
        afiCard.addEventListener('click', function() {
            showToast('Afi is coming soon!', 'info');
            // Future: Open AI assistant interface
        });
    }
}

// =========================
// Setup Real-time Conversations Listener
// =========================
let conversationsUnsubscribe = null;

async function setupConversationsListener(container) {
    // Clean up existing listener
    if (conversationsUnsubscribe) {
        conversationsUnsubscribe();
        conversationsUnsubscribe = null;
    }
    
    if (!state.currentUser) return;
    
    try {
        const { db, collection, query, where, orderBy, onSnapshot } = await import('./firebase-config.js');
        const conversationsRef = collection(db, 'conversations');
        const q = query(
            conversationsRef,
            where('participants', 'array-contains', state.currentUser.uid),
            orderBy('lastMessageAt', 'desc')
        );
        
        conversationsUnsubscribe = onSnapshot(q, async (snapshot) => {
            const conversations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Get load data for each conversation
            const conversationsWithData = await Promise.all(
                conversations.map(async (conv) => {
                    try {
                        const loadData = await getLoadData(conv.loadId);
                        return { ...conv, loadData };
                    } catch (error) {
                        return { ...conv, loadData: null };
                    }
                })
            );
            
            // Find the conversations list container
            const listContainer = container.querySelector('.conversations-list');
            if (!listContainer) return;
            
            // Render conversations
            if (conversationsWithData.length === 0) {
                listContainer.innerHTML = `
                    <div class="empty-conversations">
                        <div class="empty-conversations-icon">💬</div>
                        <h3>No messages yet</h3>
                        <p>Message load owners from load cards to start a conversation</p>
                    </div>
                `;
            } else {
                listContainer.innerHTML = renderConversationsHTML(conversationsWithData);
                setupConversationListeners();
            }
            
            // Update unread badge
            updateUnreadBadge();
        }, (error) => {
            console.error('Conversations listener error:', error);
        });
        
    } catch (error) {
        console.error('Error setting up conversations listener:', error);
    }
}

// =========================
// Render Sign-In Prompt
// =========================
function renderSignInPrompt() {
    const container = document.getElementById('messagesTabContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-conversations">
            <div class="empty-conversations-icon">🔒</div>
            <h3>Sign in to view messages</h3>
            <p>Sign in to start conversations with load owners</p>
            <button class="btn" onclick="window.authOpen('signin')" style="margin-top: 16px;">
                Sign In
            </button>
        </div>
    `;
}

// =========================
// Initialize Messages Tab
// =========================
export function initializeMessagesTab() {
    // This will be called when the Account section is rendered
    // The actual rendering happens when the tab is activated
}

// =========================
// Cleanup (for sign out)
// =========================
export function cleanupMessagesTab() {
    if (conversationsUnsubscribe) {
        conversationsUnsubscribe();
        conversationsUnsubscribe = null;
    }
}

// Export for window access
window.renderMessagesTab = renderMessagesTab;