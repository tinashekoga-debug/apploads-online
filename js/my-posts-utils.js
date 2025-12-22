// ===========================================
// my-posts-utils.js
// ===========================================
// Utility functions for My Posts section
// Shared functions used by both loads and sales
// ===========================================
// Exports: shareItem, markAsSold, markAsTaken, delItem, 
//          getDaysUntilExpiry, isExpired, getTimeAgo
// ===========================================

import { db, state, doc, deleteDoc } from './main.js';
import { updateDoc } from './firebase-config.js'; // ✅ Import from Firebase
import { showToast, showLoading, hideLoading, showConfirm } from './ui.js';
import { trackEvent } from './firebase-config.js';
// REMOVE THESE IMPORTS - they cause circular dependency
// import { renderLoads, loadShareText } from './loads.js';
// import { renderSales, saleShareText } from './sales.js';

// =========================
// Share Item Function
// =========================
export function shareItem(itemType, itemId) {
    let item, shareText;
    
    if (itemType === 'load') {
        item = state.loads.find(l => l.id === itemId);
        if (item) {
            // Import loadShareText dynamically
            const postUrl = `https://apploads-online.web.app/#load_${itemId}`;
            shareText = `LOAD: ${item.cargo}\nRoute: ${item.originCity}, ${item.originCountry} → ${item.destCity}, ${item.destCountry}\nPrice: $${item.price || 0} ${item.currency || 'USD'}\nContact: ${item.contact?.phone || item.contact?.email || ''}\nView post: ${postUrl}`;
        }
    } else {
        item = state.sales.find(s => s.id === itemId);
        if (item) {
            // Import saleShareText dynamically or use fallback
            const postUrl = `https://apploads-online.web.app/#sale_${itemId}`;
            shareText = `FOR SALE: ${item.title}\nLocation: ${item.city}, ${item.country}\nPrice: $${item.price || 0} ${item.currency || 'USD'}\nContact: ${item.contact?.phone || item.contact?.email || ''}\nView post: ${postUrl}`;
        }
    }
    
    if (!item) {
        showToast('Item not found', 'error');
        return;
    }
    
    // Create WhatsApp share URL
    const encodedText = encodeURIComponent(shareText);
    const whatsappUrl = `https://wa.me/?text=${encodedText}`;
    
    // Open WhatsApp
    const newWin = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    if (!newWin) {
        showToast('Please allow popups to share via WhatsApp', 'warning');
    }
    
    trackEvent('whatsapp_share', {
        item_type: itemType,
        item_id: itemId,
        method: 'whatsapp'
    });
    
    showToast('Opening WhatsApp...', 'success');
}

// =========================
// Mark as Sold
// =========================
export async function markAsSold(saleId) {
    // Use modern confirm dialog
    const confirmed = await showConfirm('Mark this item as sold?', {
    title: 'Mark as Sold',
    confirmText: 'Mark as Sold',
    cancelText: 'Cancel',
    type: 'warning',
    description: 'It will show a SOLD badge and be automatically removed in 7 days.'  // Changed from "3 days"
});
    
    if (!confirmed) return;
    
    showLoading('Marking as sold...');
    try {
        // Import renderMine dynamically to avoid circular dependency
        const { renderMine } = await import('./my-posts.js');
        
        // Import renderSales dynamically
        const { renderSales } = await import('./sales.js');
        
        const saleRef = doc(db, 'sales', saleId);
        await updateDoc(saleRef, {
            status: 'sold',
            soldAt: Date.now()
        });
        
        // Update local state
        const saleIndex = state.sales.findIndex(s => s.id === saleId);
        if (saleIndex !== -1) {
            state.sales[saleIndex] = {
                ...state.sales[saleIndex],
                status: 'sold',
                soldAt: Date.now()
            };
        }
        
        renderMine();
        renderSales();
        showToast('Item marked as sold! It will be automatically removed in 7 days.', 'success');
        
        
        trackEvent('mark_sold', {
            item_type: 'sale',
            item_id: saleId,
            price: state.sales[saleIndex]?.price || 0
        });
        
    } catch (e) {
        console.error('Error marking as sold:', e);
        showToast('Error marking as sold', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// Mark as Taken
// =========================
export async function markAsTaken(loadId) {
    // Use modern confirm dialog
    const confirmed = await showConfirm('Mark this load as taken?', {
    title: 'Mark as Taken',
    confirmText: 'Mark as Taken',
    cancelText: 'Cancel',
    type: 'warning',
    description: 'It will show a TAKEN badge and be automatically removed in 1 day.'  // Changed from "1 hour"
});
    
    if (!confirmed) return;
    
    showLoading('Marking as taken...');
    try {
        // Import renderMine dynamically to avoid circular dependency
        const { renderMine } = await import('./my-posts.js');
        
        // Import renderLoads dynamically
        const { renderLoads } = await import('./loads.js');
        
        const loadRef = doc(db, 'loads', loadId);
        await updateDoc(loadRef, {
            status: 'taken',
            takenAt: Date.now()
        });
        
        // Update local state
        const loadIndex = state.loads.findIndex(l => l.id === loadId);
        if (loadIndex !== -1) {
            state.loads[loadIndex] = {
                ...state.loads[loadIndex],
                status: 'taken',
                takenAt: Date.now()
            };
        }
        
        renderMine();
        renderLoads();
        showToast('Load marked as taken! It will be automatically removed in 1 day.', 'success');
        
        trackEvent('mark_taken', {
            item_type: 'load',
            item_id: loadId,
            price: state.loads[loadIndex]?.price || 0
        });
        
    } catch (e) {
        console.error('Error marking as taken:', e);
        showToast('Error marking as taken', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// Delete Item
// =========================
export async function delItem(kind, id) {
    // Use modern confirm dialog with danger type
    const confirmed = await showConfirm('Delete this post?', {
        title: 'Confirm Deletion',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
        description: 'This action cannot be undone.'
    });
    
    if (!confirmed) return;
    
    if (!id) {
        showToast('Error: Invalid post ID', 'error');
        return;
    }
    
    if (!state.currentUser || !state.profile) {
        showToast('Please sign in to delete posts', 'error');
        return;
    }
    
    showLoading('Deleting post...');
    
    try {
        // Import renderMine dynamically to avoid circular dependency
        const { renderMine } = await import('./my-posts.js');
        
        // Import render functions dynamically
        const { renderLoads } = await import('./loads.js');
        const { renderSales } = await import('./sales.js');
        
        if (kind === 'load') {
            await deleteDoc(doc(db, 'loads', id));
            state.loads = state.loads.filter(x => x.id !== id);
            renderLoads();
        } else {
            await deleteDoc(doc(db, 'sales', id));
            state.sales = state.sales.filter(x => x.id !== id);
            renderSales();
        }
        
        renderMine();
        showToast('Post deleted', 'success');
    } catch (e) {
        console.error('Error deleting item:', e);
        if (e.code === 'permission-denied') {
            showToast('Permission denied: You can only delete your own posts', 'error');
        } else if (e.code === 'not-found') {
            showToast('Post not found or already deleted', 'error');
        } else {
            showToast('Error deleting post: ' + (e.message || 'Network error'), 'error');
        }
    } finally {
        hideLoading();
    }
}

// =========================
// Expiry Helpers
// =========================
export function getDaysUntilExpiry(postedAt, expiryDays) {
    if (!postedAt) return expiryDays;
    const now = Date.now();
    const posted = Number(postedAt);
    const expiryTime = posted + (expiryDays * 24 * 60 * 60 * 1000);
    const timeLeft = expiryTime - now;
    const daysLeft = Math.ceil(timeLeft / (24 * 60 * 60 * 1000));
    return Math.max(0, daysLeft);
}

export function isExpired(postedAt, expiryDays) {
    return getDaysUntilExpiry(postedAt, expiryDays) <= 0;
}

// =========================
// Time Formatting
// =========================
export function getTimeAgo(timestamp) {
    if (!timestamp) return 'Just now';
    
    const posted = typeof timestamp === 'number' ? timestamp : Number(timestamp);
    const now = Date.now();
    const diffMs = now - posted;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    
    const postDate = new Date(posted);
    return postDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
    });
}