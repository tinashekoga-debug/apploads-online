// ===========================================
// typing-indicator.js
// ===========================================
// WhatsApp-style typing indicators
// ===========================================

import { db, doc, setDoc, onSnapshot, serverTimestamp } from './firebase-config.js';

const TYPING_TIMEOUT = 3000; // 3 seconds
const typingTimers = new Map();
const typingListeners = new Map();

// =========================
// Send Typing Indicator
// =========================
export function sendTypingIndicator(conversationId, userId) {
    if (!conversationId || !userId) return;
    
    const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
    
    // Clear existing timer
    if (typingTimers.has(conversationId)) {
        clearTimeout(typingTimers.get(conversationId));
    }
    
    // Set typing status
    setDoc(typingRef, {
        isTyping: true,
        timestamp: serverTimestamp()
    }).catch(err => console.error('Typing indicator error:', err));
    
    // Auto-clear after 3 seconds
    const timer = setTimeout(() => {
        clearTypingIndicator(conversationId, userId);
    }, TYPING_TIMEOUT);
    
    typingTimers.set(conversationId, timer);
}

// =========================
// Clear Typing Indicator
// =========================
export function clearTypingIndicator(conversationId, userId) {
    if (!conversationId || !userId) return;
    
    const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
    
    setDoc(typingRef, {
        isTyping: false,
        timestamp: serverTimestamp()
    }).catch(err => console.error('Clear typing error:', err));
    
    if (typingTimers.has(conversationId)) {
        clearTimeout(typingTimers.get(conversationId));
        typingTimers.delete(conversationId);
    }
}

// =========================
// Listen to Typing Status
// =========================
export function listenToTyping(conversationId, currentUserId, callback) {
    if (!conversationId || !currentUserId) return null;
    
    // Clean up existing listener
    if (typingListeners.has(conversationId)) {
        typingListeners.get(conversationId)();
    }
    
    // This is a subcollection, so we need to listen to all typing docs
    import('./firebase-config.js').then(({ db, collection, onSnapshot }) => {
        const typingRef = collection(db, 'conversations', conversationId, 'typing');
        
        const unsubscribe = onSnapshot(typingRef, (snapshot) => {
            const typingUsers = [];
            const now = Date.now();
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const userId = doc.id;
                
                // Ignore current user and expired indicators
                if (userId === currentUserId) return;
                
                const timestamp = data.timestamp?.toMillis?.() || 0;
                const isRecent = (now - timestamp) < TYPING_TIMEOUT;
                
                if (data.isTyping && isRecent) {
                    typingUsers.push(userId);
                }
            });
            
            callback(typingUsers.length > 0);
        });
        
        typingListeners.set(conversationId, unsubscribe);
        return unsubscribe;
    });
}

// =========================
// Cleanup
// =========================
export function cleanupTypingListeners() {
    typingListeners.forEach(unsubscribe => unsubscribe());
    typingListeners.clear();
    typingTimers.forEach(timer => clearTimeout(timer));
    typingTimers.clear();
}

