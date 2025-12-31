// ===========================================
// conversation-model.js
// ===========================================
// Firestore data model for conversations and messages
// Optimized for free-tier usage
// ===========================================

import { db, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp, increment } from './firebase-config.js';

// =========================
// Generate Deterministic Conversation ID
// =========================
export function generateConversationId(loadId, userA, userB) {
    // Sort user IDs alphabetically to ensure consistency
    const sortedUsers = [userA, userB].sort();
    return `${loadId}_${sortedUsers[0]}_${sortedUsers[1]}`.replace(/[^a-zA-Z0-9_]/g, '_');
}

// =========================
// Create New Conversation
// =========================
export async function createConversation(loadId, currentUserUid, ownerUid) {
    if (currentUserUid === ownerUid) {
        throw new Error('Cannot message yourself');
    }

    const conversationId = generateConversationId(loadId, currentUserUid, ownerUid);
    const conversationRef = doc(db, 'conversations', conversationId);
    
    const conversationData = {
        loadId,
        participants: [currentUserUid, ownerUid],
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: {
            [currentUserUid]: 0,
            [ownerUid]: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    
    try {
        // Create conversation (will fail silently if already exists with merge)
        await setDoc(conversationRef, conversationData, { merge: true });
    } catch (error) {
        console.error('Error creating conversation:', error);
        throw error;
    }
    
    return conversationId;
}

// =========================
// Send Message
// =========================
export async function sendMessage(conversationId, senderUid, text) {
    if (!text.trim()) return;
    
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const messageId = Date.now().toString();
    
    const messageData = {
        senderId: senderUid,
        text: text.trim(),
        createdAt: serverTimestamp(),
        read: false
    };
    
    // Add message
    await setDoc(doc(messagesRef, messageId), messageData);
    
   // Update conversation metadata (do this after message is saved)
    try {
        const conversationRef = doc(db, 'conversations', conversationId);
        const conversationDoc = await getDoc(conversationRef);
        
        if (conversationDoc.exists()) {
            const conversationData = conversationDoc.data();
            const participants = conversationData.participants || [];
            
            // Increment unread count for all participants except sender
            const unreadCount = { ...conversationData.unreadCount };
            participants.forEach(participant => {
                if (participant !== senderUid) {
                    unreadCount[participant] = (unreadCount[participant] || 0) + 1;
                }
            });
            
            await setDoc(conversationRef, {
                lastMessage: text.trim(),
                lastMessageAt: serverTimestamp(),
                unreadCount,
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
    } catch (error) {
        console.error('Error updating conversation metadata:', error);
        // Don't throw - message was already sent successfully
    }
}

// =========================
// Get Messages for Conversation
// =========================
export async function getMessages(conversationId, limitCount = 50) {
    const messagesRef = collection(db, 'conversations', conversationId, 'messages');
    const q = query(
        messagesRef,
        orderBy('createdAt', 'asc'), // Match real-time listener ordering
        limit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// =========================
// Mark Messages as Read
// =========================
export async function markConversationAsRead(conversationId, userUid) {
    const conversationRef = doc(db, 'conversations', conversationId);
    const conversationDoc = await getDoc(conversationRef);
    
    if (conversationDoc.exists()) {
        const conversationData = conversationDoc.data();
        const unreadCount = { ...conversationData.unreadCount };
        unreadCount[userUid] = 0;
        
        await setDoc(conversationRef, {
            unreadCount,
            updatedAt: serverTimestamp()
        }, { merge: true });
    }
}

// =========================
// Get User's Conversations
// =========================
export async function getUserConversations(userUid) {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
        conversationsRef,
        where('participants', 'array-contains', userUid),
        orderBy('lastMessageAt', 'desc')
    );
    
    try {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
    }
}

// =========================
// Get Unread Count for User
// =========================
export async function getUnreadCount(userUid) {
    const conversations = await getUserConversations(userUid);
    return conversations.reduce((total, conv) => {
        return total + (conv.unreadCount?.[userUid] || 0);
    }, 0);
}
