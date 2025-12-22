// ===========================================
// admin.js
// ===========================================
// Handles admin dashboard functionality:
// - Admin dashboard rendering
// - Admin statistics
// - Admin actions (view all, delete items)
// ===========================================
// Exports: renderAdminDashboard, deleteAdminItem
// ===========================================

import { db, state } from './main.js';
import { isAdminUser } from './ui.js';
import { showToast, escapeHtml, fmtMoney, showLoading, hideLoading, setLoadingError } from './ui.js';
import { deleteDoc, doc } from './firebase-config.js';
import { renderLoads } from './loads.js';
import { renderSales } from './sales.js';

// =========================
// Admin Dashboard Functions
// =========================
export async function renderAdminDashboard() {
    if (!isAdminUser()) return;
    
    // FIXED: Show admin dashboard first
    const adminDashboard = document.getElementById('adminDashboard');
    if (adminDashboard) {
        adminDashboard.style.display = 'block';
    }
    
    try {
        // Load admin stats - FIXED COUNTS
        const loadsCount = state.loads.length;
        const salesCount = state.sales.length;
        
        // Count unique users (IMPROVED) - use actual owner keys from all posts
        const allOwners = new Set();
        state.loads.forEach(load => {
            if (load.owner) allOwners.add(load.owner);
        });
        state.sales.forEach(sale => {
            if (sale.owner) allOwners.add(sale.owner);
        });
        const uniqueUsers = allOwners.size;
        
        // Count today's posts (FIXED) - use proper date comparison
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayTimestamp = todayStart.getTime();
        
        const todaysLoads = state.loads.filter(load => {
            const postedAt = typeof load.postedAt === 'number' ? load.postedAt : 
                           (load.postedAt?.toMillis ? load.postedAt.toMillis() : Date.now());
            return postedAt >= todayTimestamp;
        }).length;
        
        const todaysSales = state.sales.filter(sale => {
            const postedAt = typeof sale.postedAt === 'number' ? sale.postedAt : 
                           (sale.postedAt?.toMillis ? sale.postedAt.toMillis() : Date.now());
            return postedAt >= todayTimestamp;
        }).length;
        
        const todaysPosts = todaysLoads + todaysSales;
        
        console.log('📊 Admin Stats:', {
            loads: loadsCount,
            sales: salesCount,
            users: uniqueUsers,
            todayPosts: todaysPosts,
            todayLoads: todaysLoads,
            todaySales: todaysSales
        });
        
        // Update stats
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[0]) statCards[0].querySelector('div').textContent = loadsCount;
        if (statCards[1]) statCards[1].querySelector('div').textContent = salesCount;
        if (statCards[2]) statCards[2].querySelector('div').textContent = uniqueUsers;
        if (statCards[3]) statCards[3].querySelector('div').textContent = todaysPosts;
        
        // Add event listeners for admin actions - FIXED: Attach after dashboard is visible
        const viewLoadsBtn = document.querySelector('[data-action="view-all-loads"]');
        const viewSalesBtn = document.querySelector('[data-action="view-all-sales"]');
        
        if (viewLoadsBtn) {
            viewLoadsBtn.addEventListener('click', () => viewAllLoads());
        }
        if (viewSalesBtn) {
            viewSalesBtn.addEventListener('click', () => viewAllSales());
        }
         
    } catch (e) {
        console.error('Error loading admin dashboard:', e);
    }
    }  // ← ADD THIS: Closes renderAdminDashboard()

// ← These functions should be OUTSIDE renderAdminDashboard
function viewAllLoads() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = `
        <h4 style="margin:0 0 12px 0;">All Loads (${state.loads.length})</h4>
        <div style="max-height: 400px; overflow-y: auto;">
            ${state.loads.map(load => `
                <div class="card" style="margin-bottom: 8px;">
                    <div class="between">
                        <div>
                            <strong>${escapeHtml(load.cargo)}</strong>
                            <div class="muted">${escapeHtml(load.originCity)} → ${escapeHtml(load.destCity)}</div>
                            <div class="muted" style="font-size: 12px;">Owner: ${load.owner}</div>
                        </div>
                        <span class="price">${fmtMoney(load.price || 0)}</span>
                    </div>
                    <div class="actions mt8" style="display: flex; gap: 4px;">
                        <button class="btn small secondary" data-delete-load="${load.id}">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
   // Add event listeners - FIXED: Use setTimeout to ensure DOM is ready
setTimeout(() => {
    adminContent.querySelectorAll('[data-delete-load]').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAdminItem('load', this.dataset.deleteLoad);
        });
    });
}, 0);
}

function viewAllSales() {
    const adminContent = document.getElementById('adminContent');
    adminContent.innerHTML = `
        <h4 style="margin:0 0 12px 0;">All Sales (${state.sales.length})</h4>
        <div style="max-height: 400px; overflow-y: auto;">
            ${state.sales.map(sale => `
                <div class="card" style="margin-bottom: 8px;">
                    <div class="between">
                        <div>
                            <strong>${escapeHtml(sale.title)}</strong>
                            <div class="muted">${escapeHtml(sale.city)}, ${escapeHtml(sale.country)}</div>
                            <div class="muted" style="font-size: 12px;">Owner: ${sale.owner}</div>
                        </div>
                        <span class="price">${fmtMoney(sale.price || 0)}</span>
                    </div>
                    <div class="actions mt8" style="display: flex; gap: 4px;">
                        <button class="btn small secondary" data-delete-sale="${sale.id}">Delete</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
  // Add event listeners - FIXED: Use setTimeout to ensure DOM is ready
setTimeout(() => {
    adminContent.querySelectorAll('[data-delete-sale]').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAdminItem('sale', this.dataset.deleteSale);
        });
    });
}, 0);
}

export async function deleteAdminItem(itemType, itemId) {
    if (!confirm(`Delete this ${itemType}? This cannot be undone.`)) return;
    
    showLoading('Deleting item...');
    try {
        // FIXED: Use proper Firestore document reference
        await deleteDoc(doc(db, itemType === 'load' ? 'loads' : 'sales', itemId));
        
        // Update local state - FIXED: Proper filtering
        if (itemType === 'load') {
            state.loads = state.loads.filter(l => l.id !== itemId);
            if (typeof renderLoads === 'function') renderLoads();
        } else {
            state.sales = state.sales.filter(s => s.id !== itemId);
            if (typeof renderSales === 'function') renderSales();
        }
        
        // Refresh admin view
        renderAdminDashboard();
        showToast('✅ Item deleted', 'success');
        
    } catch (e) {
        console.error('Error deleting item:', e);
        setLoadingError('Failed to delete item');
        
        // IMPROVED ERROR MESSAGES
        if (e.code === 'permission-denied') {
            showToast('Permission denied: Cannot delete this post', 'error');
        } else if (e.code === 'not-found') {
            showToast('Post not found or already deleted', 'error');
        } else {
            showToast('Error deleting item: ' + (e.message || 'Network error'), 'error');
        }
    } finally {
        hideLoading();
    }
}

