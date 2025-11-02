// ===========================================
// profile.js
// ===========================================
// Handles profile management and user account:
// - Loading user profile from Firestore
// - Saving/updating profile
// - Rendering account page
// - Displaying user's posts (My Posts section)
// - Logout functionality
// - Deleting user posts
// ===========================================
// Exports: loadUserProfile, saveProfile, renderAccount, renderMine, logout, delItem, getDaysUntilExpiry, isExpired
// ===========================================

import { auth, signOut, doc, setDoc, getDoc, deleteDoc, collection, getDocs, query, orderBy } from './firebase-config.js';
import { db, state, ownerKey } from './main.js';
import { isAdminUser } from './ui.js';
import { showToast, goto, fmtMoney, escapeHtml, escapeAttr, showLoading, hideLoading, setLoadingError } from './ui.js';
import { authOpen } from './auth.js';
import { editLoad, repostLoad } from './loads.js';
import { editSale, repostSale } from './sales.js';
import { renderLoads } from './loads.js';
import { renderSales } from './sales.js';
import { renderHome } from './main.js';

export async function loadUserProfile(uid) {
    try {
        const profileDoc = await getDoc(doc(db, 'profiles', uid));
        if (profileDoc.exists()) {
            state.profile = { uid, ...profileDoc.data() };
            console.log('Profile loaded:', state.profile);
        } else {
            // Create default profile if it doesn't exist
            state.profile = { 
                uid, 
                name: '', 
                phone: '', 
                email: state.currentUser?.email || '', 
                web: '' 
            };
            await setDoc(doc(db, 'profiles', uid), {
                name: state.profile.name,
                phone: state.profile.phone,
                email: state.profile.email,
                web: state.profile.web
            });
            console.log('Created new profile:', state.profile);
        }
    } catch (e) {
        console.error('Error loading profile:', e);
        showToast('Error loading profile', 'error');
        throw e; // Re-throw to handle in caller
    }
}

// =========================
// Account (Auth + Profile + My posts)
// =========================
export function renderAccount() {
    const box = document.getElementById('acctState');
    if (!box) {
        console.error('❌ acctState element not found');
        return;
    }

    const isAuthed = !!state.currentUser && !!state.profile;
    console.log('🔐 renderAccount() - currentUser:', !!state.currentUser, 'profile:', !!state.profile);

    // FEEDBACK SECTION VISIBILITY (defensive)
    try {
        const feedbackSection = document.getElementById('feedbackSection');
        const feedbackSigninPrompt = document.getElementById('feedbackSigninPrompt');
        if (feedbackSection && feedbackSigninPrompt) {
            if (isAuthed) {
                feedbackSection.style.display = 'block';
                feedbackSigninPrompt.style.display = 'none';
            } else {
                feedbackSection.style.display = 'none';
                feedbackSigninPrompt.style.display = 'block';
            }
        }
    } catch (e) {
        console.warn('Could not update feedback section visibility', e);
    }

    // Simple helpers to safely show/hide sections
    const hideMyPosts = () => {
        const myPostsParent = document.getElementById('myPosts')?.parentElement;
        if (myPostsParent) myPostsParent.style.display = 'none';
    };
    const showMyPosts = () => {
        const myPostsParent = document.getElementById('myPosts')?.parentElement;
        if (myPostsParent) myPostsParent.style.display = 'block';
    };
    const hideAdmin = () => {
        const admin = document.getElementById('adminDashboard');
        if (admin) admin.style.display = 'none';
    };
    const showAdminIfNeeded = () => {
        const admin = document.getElementById('adminDashboard');
        if (!admin) return;
        admin.style.display = isAdminUser() ? 'block' : 'none';
        if (isAdminUser() && typeof renderAdminDashboard === 'function') {
            try { renderAdminDashboard(); } catch (e) { console.error('Error rendering admin dashboard', e); }
        }
    };

    // NOT AUTHENTICATED VIEW
    if (!isAuthed) {
        console.log('🔐 Showing unauthenticated state');
        box.dataset.editing = 'false';
        box.innerHTML = `
            <p class="muted">Sign in to post loads or trucks. Browsing is open.</p>
            <div class="button-row">
                <button class="btn" data-action="signin">Sign in</button>
                <button class="btn secondary" data-action="signup">Create account</button>
            </div>
        `;
        box.querySelector('[data-action="signin"]')?.addEventListener('click', () => authOpen('signin'));
        box.querySelector('[data-action="signup"]')?.addEventListener('click', () => authOpen('signup'));

        hideMyPosts();
        hideAdmin();

        // Ensure feedback sign-in prompt (if present) is visible - handled above
    } else {
        // AUTHENTICATED VIEW
        console.log('🔐 Showing authenticated state for:', state.profile?.email || '(no-email)');
        const isEditing = box.dataset.editing === 'true';

        if (isEditing) {
            // Edit form view
            box.innerHTML = `
                <div class="alert success mb12" style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; color: #155724;">
                    <strong>✅ You're logged in!</strong> Update your profile below.
                </div>
                <label>Name / Company</label>
                <input id="profName" value="${escapeAttr(state.profile?.name || '')}" />
                <div class="row mt8">
                    <div><label>Phone (WhatsApp)</label><input id="profPhone" value="${escapeAttr(state.profile?.phone || '')}" /></div>
                    <div><label>Email</label><input id="profEmail" type="email" value="${escapeAttr(state.profile?.email || '')}" /></div>
                </div>
                <label class="mt8">Website (optional)</label>
                <input id="profWeb" value="${escapeAttr(state.profile?.web || '')}" />
                <div class="button-row">
                    <button class="btn" data-action="save-profile">Save Profile</button>
                    <button class="btn secondary" data-action="cancel-edit">Cancel</button>
                </div>
            `;
            box.querySelector('[data-action="save-profile"]')?.addEventListener('click', saveProfile);
            box.querySelector('[data-action="cancel-edit"]')?.addEventListener('click', () => {
                box.dataset.editing = 'false';
                renderAccount();
            });

            // Hide other cards while editing
            hideMyPosts();
            hideAdmin();
            const nextCard1 = document.querySelector('#account .card:has(#acctState)')?.nextElementSibling;
            if (nextCard1) nextCard1.style.display = 'none';
            const nextCard2 = nextCard1?.nextElementSibling;
            if (nextCard2) nextCard2.style.display = 'none';

            // Hide feedback parent while editing (defensive)
            const feedbackParent = document.getElementById('feedbackSection')?.parentElement;
            if (feedbackParent) feedbackParent.style.display = 'none';
        } else {
            // Read-only authenticated view
            box.dataset.editing = 'false';
            box.innerHTML = `
                <div class="alert success mb12" style="padding: 12px; background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; color: #155724;">
                    <strong>✅ You're logged in!</strong>
                </div>
                <div class="button-row">
                    <button class="btn" data-action="edit-profile">Edit Profile</button>
                    <button class="btn secondary" data-action="logout">Sign out</button>
                </div>
            `;

            box.querySelector('[data-action="edit-profile"]')?.addEventListener('click', () => {
                box.dataset.editing = 'true';
                renderAccount();
            });
            box.querySelector('[data-action="logout"]')?.addEventListener('click', logout);

            // Show related sections when signed in
            showMyPosts();
            showAdminIfNeeded();

            // Restore visibility for next cards (defensive)
            const nextCard1 = document.querySelector('#account .card:has(#acctState)')?.nextElementSibling;
            if (nextCard1) nextCard1.style.display = 'block';
            const nextCard2 = nextCard1?.nextElementSibling;
            if (nextCard2) nextCard2.style.display = 'block';

            // Ensure feedback parent visible if exists
            const feedbackParent = document.getElementById('feedbackSection')?.parentElement;
            if (feedbackParent) feedbackParent.style.display = 'block';
        }
    }

    // Render user's posts section (safe)
    try {
        renderMine();
    } catch (e) {
        console.error('Error rendering My Posts:', e);
    }

    // Final admin dashboard render (safe)
    try {
        if (isAdminUser()) {
            const adminDashboard = document.getElementById('adminDashboard');
            if (adminDashboard) {
                adminDashboard.style.display = 'block';
                if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
            }
        } else {
            const adminDashboard = document.getElementById('adminDashboard');
            if (adminDashboard) adminDashboard.style.display = 'none';
        }
    } catch (e) {
        console.error('Error updating admin dashboard visibility', e);
    }
}

export async function saveProfile() {
    if (!state.currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const email = document.getElementById('profEmail').value.trim();
    const web = document.getElementById('profWeb').value.trim();

    // === ADD VALIDATION ===
    if (!name || name.length < 2) {
        showToast('Please enter your name or company name', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (phone && !validatePhone(phone)) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }
    
    if (web && !web.startsWith('http')) {
        showToast('Please enter a valid website URL (include http:// or https://)', 'error');
        return;
    }
    // === END VALIDATION ===
    
    state.profile = {...state.profile, name, phone, email, web};
    
    showLoading('Saving profile...');
    // ... rest of existing code ...
    
 try {
    await setDoc(doc(db, 'profiles', state.currentUser.uid), {
        name, phone, email, web
    });
    showToast('✅ Profile saved', 'success');
    
    // Exit edit mode and show read-only view
    const box = document.getElementById('acctState');
    box.dataset.editing = 'false';
    
    // Re-render to update any displays using profile info
    renderAccount();
    renderMine();
} catch (e) {
    console.error('Error saving profile:', e);
    setLoadingError('Failed to save profile');
    showToast('Error saving profile: ' + (e.message || 'Unknown error'), 'error');
} finally {
    hideLoading();
}try {
    await setDoc(doc(db, 'profiles', state.currentUser.uid), {
        name, phone, email, web
    });
    showToast('✅ Profile saved', 'success');
    
    // Exit edit mode and show read-only view
    const box = document.getElementById('acctState');
    box.dataset.editing = 'false';
    
    // Re-render to update any displays using profile info
    renderAccount();
    renderMine();
} catch (e) {
    console.error('Error saving profile:', e);
    setLoadingError('Failed to save profile');
    showToast('Error saving profile: ' + (e.message || 'Unknown error'), 'error');
} finally {
    hideLoading();
}
}

export async function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        try {
            await signOut(auth);
            state.profile = null;
            state.myVotes = {};
            renderAccount();
            showToast('Signed out successfully', 'success');
        } catch (e) {
            console.error('Error signing out:', e);
            showToast('Error signing out', 'error');
        }
    }
}

// ... existing code ...

export function renderMine() {
    const wrap = document.getElementById('myPosts');
    const empty = document.getElementById('emptyMine');
    
    if (!state.profile) {
        wrap.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    
    const key = ownerKey();
    const my = [];
    
    state.loads.filter(l => (l.owner || '') === key).forEach(l => {
        const daysLeft = getDaysUntilExpiry(l.postedAt, 7);
        const expiryText = daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired';
        const expiryColor = daysLeft <= 2 ? '#dc3545' : daysLeft <= 4 ? '#ff9800' : '#666';
        
        my.push(`
            <div class='card'>
                <div class="between">
                    <div>
                        <strong>${escapeHtml(l.cargo)}</strong>
                        <div class="muted">${escapeHtml(l.originCity)}, ${escapeHtml(l.originCountry)} → ${escapeHtml(l.destCity)}, ${escapeHtml(l.destCountry)}</div>
                        <div class="muted mt6" style="color: ${expiryColor}; font-size: 12px;">⏱️ ${expiryText}</div>
                    </div>
                 <span class='price'>${fmtMoney(s.price || 0, s.currency || 'USD')}</span>
                </div>
                <div class='actions mt8' style='display: flex; gap: 6px; flex-wrap: nowrap;'>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-edit-load="${l.id}">Edit</button>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-repost-load="${l.id}">Repost</button>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-del-load="${l.id}">Delete</button>
                </div>
            </div>
        `);
    });
    
    state.sales.filter(s => (s.owner || '') === key).forEach(s => {
        const daysLeft = getDaysUntilExpiry(s.postedAt, 30);
        const expiryText = daysLeft > 0 ? `Expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` : 'Expired';
        const expiryColor = daysLeft <= 5 ? '#dc3545' : daysLeft <= 10 ? '#ff9800' : '#666';
        
        my.push(`
            <div class='card'>
                <div class="between">
                    <div>
                        <strong>${escapeHtml(s.title)}</strong>
                        <div class="muted">${escapeHtml(s.city)}, ${escapeHtml(s.country)}</div>
                        <div class="muted mt6" style="color: ${expiryColor}; font-size: 12px;">⏱️ ${expiryText}</div>
                    </div>
                    <span class='price'>${fmtMoney(s.price || 0, s.currency || 'USD')}</span>
                </div>
                <div class='actions mt8' style='display: flex; gap: 6px; flex-wrap: nowrap;'>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-edit-sale="${s.id}">Edit</button>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-repost-sale="${s.id}">Repost</button>
                    <button class='btn small secondary' style='flex: 1; min-width: 0; padding: 6px 8px; font-size: 13px;' data-del-sale="${s.id}">Delete</button>
                </div>
            </div>
        `);
    });
    
    wrap.innerHTML = my.join('');
    empty.style.display = my.length ? 'none' : 'block';
    
    // Attach delete handlers
    wrap.querySelectorAll('[data-del-load]').forEach(btn => {
        btn.addEventListener('click', () => delItem('load', btn.dataset.delLoad));
    });
    wrap.querySelectorAll('[data-del-sale]').forEach(btn => {
        btn.addEventListener('click', () => delItem('sale', btn.dataset.delSale));
    });
    
    // Attach edit handlers
    wrap.querySelectorAll('[data-edit-load]').forEach(btn => {
        btn.addEventListener('click', () => editLoad(btn.dataset.editLoad));
    });
    wrap.querySelectorAll('[data-edit-sale]').forEach(btn => {
        btn.addEventListener('click', () => editSale(btn.dataset.editSale));
    });
    
    // Attach repost handlers
    wrap.querySelectorAll('[data-repost-load]').forEach(btn => {
        btn.addEventListener('click', () => repostLoad(btn.dataset.repostLoad));
    });
    wrap.querySelectorAll('[data-repost-sale]').forEach(btn => {
        btn.addEventListener('click', () => repostSale(btn.dataset.repostSale));
    });
}

export async function delItem(kind, id) {
    if (!confirm('Delete this post?')) return;
    
    // === ADD VALIDATION ===
    if (!id) {
        showToast('Error: Invalid post ID', 'error');
        return;
    }
    
    showLoading('Deleting post...');
    
    try {
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
        // === IMPROVED ERROR MESSAGES ===
        if (e.code === 'permission-denied') {
            showToast('Permission denied: Cannot delete this post', 'error');
        } else if (e.code === 'not-found') {
            showToast('Post not found or already deleted', 'error');
        } else {
            showToast('Error deleting post: ' + (e.message || 'Network error'), 'error');
        }
    } finally {
        hideLoading(); // === ADD THIS ===
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
// Admin Dashboard Functions
// =========================
export async function renderAdminDashboard() {
    if (!isAdminUser()) return;
    
    try {
        // Load admin stats
        const loadsCount = state.loads.length;
        const salesCount = state.sales.length;
        
        // Count unique users (simplified)
        const loadOwners = new Set(state.loads.map(l => l.owner));
        const saleOwners = new Set(state.sales.map(s => s.owner));
        const uniqueUsers = new Set([...loadOwners, ...saleOwners]);
        
        // Count today's posts
        const today = new Date().setHours(0,0,0,0);
        const todaysPosts = state.loads.filter(l => l.postedAt >= today).length + 
                          state.sales.filter(s => s.postedAt >= today).length;
        
        // Update stats
        const statCards = document.querySelectorAll('.stat-card');
        if (statCards[0]) statCards[0].querySelector('div').textContent = loadsCount;
        if (statCards[1]) statCards[1].querySelector('div').textContent = salesCount;
        if (statCards[2]) statCards[2].querySelector('div').textContent = uniqueUsers.size;
        if (statCards[3]) statCards[3].querySelector('div').textContent = todaysPosts;
        
        // Add event listeners for admin actions
        document.querySelector('[data-action="view-all-loads"]')?.addEventListener('click', () => viewAllLoads());
        document.querySelector('[data-action="view-all-sales"]')?.addEventListener('click', () => viewAllSales());
        document.querySelector('[data-action="clean-expired"]')?.addEventListener('click', () => cleanExpiredPosts());
        
    } catch (e) {
        console.error('Error loading admin dashboard:', e);
    }
}

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
    
    // Add event listeners
    adminContent.querySelectorAll('[data-delete-load]').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAdminItem('load', this.dataset.deleteLoad);
        });
    });
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
    
    // Add event listeners
    adminContent.querySelectorAll('[data-delete-sale]').forEach(btn => {
        btn.addEventListener('click', function() {
            deleteAdminItem('sale', this.dataset.deleteSale);
        });
    });
}

async function cleanExpiredPosts() {
    if (!confirm('Clean all expired posts? Loads >7 days, Sales >30 days.')) return;
    
    showLoading('Cleaning expired posts...');
    try {
        let deletedLoads = 0;
        let deletedSales = 0;
        
        // Delete expired loads
        for (const load of state.loads) {
            if (isExpired(load.postedAt, 7)) {
                await deleteDoc(doc(db, 'loads', load.id));
                deletedLoads++;
            }
        }
        
        // Delete expired sales
        for (const sale of state.sales) {
            if (isExpired(sale.postedAt, 30)) {
                await deleteDoc(doc(db, 'sales', sale.id));
                deletedSales++;
            }
        }
        
        // Reload data
        const loadsSnapshot = await getDocs(query(collection(db, 'loads'), orderBy('postedAt', 'desc')));
        state.loads = loadsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const salesSnapshot = await getDocs(query(collection(db, 'sales'), orderBy('postedAt', 'desc')));
        state.sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
            renderAdminDashboard();
    showToast(`✅ Cleaned ${deletedLoads} expired loads and ${deletedSales} expired sales`, 'success');
    
} catch (e) {
    console.error('Error cleaning expired posts:', e);
    setLoadingError('Failed to clean posts');
    showToast('Error cleaning expired posts', 'error');
} finally {
    hideLoading();
}
}

async function deleteAdminItem(itemType, itemId) {
    if (!confirm(`Delete this ${itemType}? This cannot be undone.`)) return;
    
    showLoading('Deleting item...');
    try {
        await deleteDoc(doc(db, itemType === 'load' ? 'loads' : 'sales', itemId));
        
        // Update local state
        if (itemType === 'load') {
            state.loads = state.loads.filter(l => l.id !== itemId);
        } else {
            state.sales = state.sales.filter(s => s.id !== itemId);
        }
        
    showToast('✅ Item deleted', 'success');
    renderAdminDashboard(); // Refresh the view
    
} catch (e) {
    console.error('Error deleting item:', e);
    setLoadingError('Failed to delete item');
    showToast('Error deleting item', 'error');
} finally {
    hideLoading();
}
}