// ===========================================
// messages-tab.js
// ===========================================
// Renders the Messages tab in Account section
// Includes AI assistant (Afi) and conversation list
// ===========================================

import { state } from './main.js';
import { getUserConversations } from './conversation-model.js';
import { openChatScreen } from './chat-controller.js';
import { escapeHtml, showToast, getTimeAgo } from './ui.js';
import { updateUnreadBadge } from './chat-controller.js';
import { afiUI } from './ai-ui.js'; // ✅ ADD THIS IMPORT

// =========================
// Render Messages Tab
// =========================
export async function renderMessagesTab() {
    const container = document.getElementById('messagesTabContent');
    if (!container) return;
    
    // Show loading
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <div>Loading messages...</div>
        </div>
    `;
    
    try {
        if (!state.currentUser) {
            renderSignInPrompt();
            return;
        }
        
        // Get conversations
        const conversations = await getUserConversations(state.currentUser.uid);
        
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
        
        // Render
        container.innerHTML = renderConversationsList(conversationsWithData);
        
        // Add event listeners
        setupConversationListeners();
        
        // Update unread badge
        updateUnreadBadge();
        
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = `
            <div class="error-state">
                <div>Failed to load messages</div>
                <button onclick="renderMessagesTab()" class="btn small secondary">Retry</button>
            </div>
        `;
    }
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
// Render Conversations List
// =========================
function renderConversationsList(conversations) {
    // ✅ ADD AFI CARD AT THE TOP (using real afiUI component)
    let html = afiUI.renderAssistantCard();
    
    if (conversations.length === 0) {
        html += `
            <div class="empty-conversations">
                <div class="empty-conversations-icon">💬</div>
                <h3>No messages yet</h3>
                <p>Message load owners from load cards to start a conversation</p>
            </div>
        `;
        return html;
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
    
    // Add conversations list
    html += `
        <div class="conversations-list">
            ${Object.entries(grouped).map(([label, convs]) => `
                <div class="conversation-group">
                    <div class="conversation-group-label">${escapeHtml(label)}</div>
                    ${convs.map(conv => renderConversationItem(conv)).join('')}
                </div>
            `).join('')}
        </div>
    `;
    
    return html;
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
    // Conversation items
    document.querySelectorAll('.conversation-item').forEach(item => {
        item.addEventListener('click', async function() {
            const conversationId = this.dataset.conversationId;
            const loadId = this.dataset.loadId;
            
            try {
                // Get load data
                const loadData = await getLoadData(loadId);
                openChatScreen(conversationId, loadData);
            } catch (error) {
                console.error('Error opening conversation:', error);
                showToast('Failed to open conversation', 'error');
            }
        });
    });
    
    // ✅ REMOVE THE OLD AFI LISTENER - it's now handled by ai-integration.js
    // The data-action="open-afi-chat" in the card will be handled globally
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