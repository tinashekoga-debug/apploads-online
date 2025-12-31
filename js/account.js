// ===========================================
// account.js (Fixed)
// ===========================================
// Handles user profile management - FIXED IMPORTS
// ===========================================

import { auth, signOut, doc, setDoc, getDoc } from './firebase-config.js';
import { db, state } from './main.js';
import { ownerKey } from './utils-id.js';
import { isAdminUser } from './ui.js';
import { showToast, escapeHtml, escapeAttr, showLoading, hideLoading, setLoadingError } from './ui.js';
import { authOpen } from './auth.js';
import { updateAccountInstallButton } from './install-prompt.js';
import { openSettingsDrawer } from './settings.js';

// =========================
// Validation Helpers
// =========================
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return !phone || phoneRegex.test(phone.replace(/\s/g, ''));
}

// =========================
// Load User Profile
// =========================
export async function loadUserProfile(uid) {
    try {
        const profileDoc = await getDoc(doc(db, 'profiles', uid));
        if (profileDoc.exists()) {
            state.profile = { uid, ...profileDoc.data() };
            console.log('Profile loaded:', state.profile);
        } else {
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
        throw e;
    }
}

// =========================
// Render Account Section
// =========================
export function renderAccount() {
    const box = document.getElementById('acctState');
    if (!box) {
        console.error('❌ acctState element not found');
        return;
    }

    const isAuthed = !!state.currentUser && !!state.profile;
    console.log('🔐 renderAccount() - currentUser:', !!state.currentUser, 'profile:', !!state.profile);

    // Helper functions
    const hideMyPosts = () => {
        const myPostsContainer = document.getElementById('myPostsContainer');
        if (myPostsContainer) myPostsContainer.style.display = 'none';
    };
    const showMyPosts = () => {
        const myPostsContainer = document.getElementById('myPostsContainer');
        if (myPostsContainer) myPostsContainer.style.display = 'block';
    };
    const hideAdmin = () => {
        const admin = document.getElementById('adminDashboard');
        if (admin) admin.style.display = 'none';
    };
    const showAdminIfNeeded = async () => {
        const admin = document.getElementById('adminDashboard');
        if (!admin) return;
        admin.style.display = isAdminUser() ? 'block' : 'none';
        if (isAdminUser()) {
            try {
                const { renderAdminDashboard } = await import('./admin.js');
                if (typeof renderAdminDashboard === 'function') {
                    renderAdminDashboard();
                }
            } catch (e) {
                console.error('Error rendering admin dashboard', e);
            }
        }
    };

    // NOT AUTHENTICATED VIEW
    if (!isAuthed) {
        console.log('🔐 Showing unauthenticated state');
        box.dataset.editing = 'false';
        box.innerHTML = `
            <div class="button-row">
                <button class="btn" data-action="signin">Sign in</button>
                <button class="btn secondary" data-action="signup">Sign Up</button>
            </div>
            <p class="muted" style="margin-top: 12px;">Sign in to post loads and to marketplace.</p>
        `;
        box.querySelector('[data-action="signin"]')?.addEventListener('click', () => authOpen('signin'));
        box.querySelector('[data-action="signup"]')?.addEventListener('click', () => authOpen('signup'));

        hideMyPosts();
        hideAdmin();
    } else {
        // AUTHENTICATED VIEW
        console.log('🔐 Showing authenticated state for:', state.profile?.email || '(no-email)');
        const isEditing = box.dataset.editing === 'true';

        if (isEditing) {
            // Force-hide My Posts while editing
            const myPostsContainer = document.getElementById('myPostsContainer');
            if (myPostsContainer) {
                myPostsContainer.style.display = 'none';
            }

            box.innerHTML = `
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

            hideMyPosts();
            hideAdmin();
        } else {
            // Read-only authenticated view
            box.dataset.editing = 'false';
            
            const displayPhone = state.profile?.phone || 'No phone number';
            const displayName = state.profile?.name || state.profile?.email || 'User';
            
            box.innerHTML = `
                <div class="card" style="margin-bottom: 0; padding: 16px;">
                    <div class="between" style="align-items: center;">
                        <div style="flex: 1;">
                            <div style="font-weight: 800; font-size: 1.05rem; margin-bottom: 4px;">
                                ${escapeHtml(displayName)}
                            </div>
                            <div class="muted" style="font-size: 0.9rem;">
                                ${escapeHtml(displayPhone)}
                            </div>
                        </div>

                    <button
    class="settings-gear-btn"
    data-action="open-settings"
    aria-label="Open settings"
    title="Settings"
>
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="24"
        height="24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
    >
        <!-- Outer gear -->
        <path d="
            M19.4 15
            a1.65 1.65 0 0 0 .33 1.82
            l.06.06
            a2 2 0 1 1-2.83 2.83
            l-.06-.06
            a1.65 1.65 0 0 0-1.82-.33
            a1.65 1.65 0 0 0-1 1.51V21
            a2 2 0 1 1-4 0
            v-.09
            a1.65 1.65 0 0 0-1-1.51
            a1.65 1.65 0 0 0-1.82.33
            l-.06.06
            a2 2 0 1 1-2.83-2.83
            l.06-.06
            a1.65 1.65 0 0 0 .33-1.82
            a1.65 1.65 0 0 0-1.51-1H3
            a2 2 0 1 1 0-4
            h.09
            a1.65 1.65 0 0 0 1.51-1
            a1.65 1.65 0 0 0-.33-1.82
            l-.06-.06
            a2 2 0 1 1 2.83-2.83
            l.06.06
            a1.65 1.65 0 0 0 1.82.33
            h.09
            a1.65 1.65 0 0 0 1-1.51V3
            a2 2 0 1 1 4 0
            v.09
            a1.65 1.65 0 0 0 1 1.51
            a1.65 1.65 0 0 0 1.82-.33
            l.06-.06
            a2 2 0 1 1 2.83 2.83
            l-.06.06
            a1.65 1.65 0 0 0-.33 1.82
            v.09
            a1.65 1.65 0 0 0 1.51 1H21
            a2 2 0 1 1 0 4
            h-.09
            a1.65 1.65 0 0 0-1.51 1z
        "></path>

        <!-- Inner circle -->
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
</button>
                    </div>
                </div>
            `;
            
            // Add event listener for settings gear button
            setTimeout(() => {
                const settingsBtn = box.querySelector('[data-action="open-settings"]');
                if (settingsBtn) {
                    settingsBtn.addEventListener('click', openSettingsDrawer);
                }
            }, 100);

            showMyPosts();
            showAdminIfNeeded();
        }
    }

    // Render user's posts section - use dynamic import to avoid circular dependency
    setTimeout(async () => {
        try {
            const { renderMine } = await import('./my-posts.js');
            if (typeof renderMine === 'function') {
                renderMine();
            }
        } catch (e) {
            console.error('Error rendering My Posts:', e);
        }
    }, 100);

    // Final admin dashboard render
    setTimeout(() => {
        try {
            if (isAdminUser()) {
                const adminDashboard = document.getElementById('adminDashboard');
                if (adminDashboard) {
                    adminDashboard.style.display = 'block';
                    import('./admin.js').then(({ renderAdminDashboard }) => {
                        if (typeof renderAdminDashboard === 'function') renderAdminDashboard();
                    });
                }
            } else {
                const adminDashboard = document.getElementById('adminDashboard');
                if (adminDashboard) adminDashboard.style.display = 'none';
            }
        } catch (e) {
            console.error('Error updating admin dashboard visibility', e);
        }
    }, 150);

    // Update install button visibility
    if (typeof updateAccountInstallButton === 'function') {
        setTimeout(updateAccountInstallButton, 100);
    }
}

// =========================
// Save Profile
// =========================
export async function saveProfile() {
    if (!state.currentUser) {
        showToast('Please sign in first', 'error');
        return;
    }
    
    const name = document.getElementById('profName').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const email = document.getElementById('profEmail').value.trim();
    const web = document.getElementById('profWeb').value.trim();

    // Validation
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
    
    state.profile = {...state.profile, name, phone, email, web};
    
    showLoading('Saving profile...');
    
    try {
        await setDoc(doc(db, 'profiles', state.currentUser.uid), {
            name, phone, email, web
        });
        showToast('Profile saved', 'success');
        
        const box = document.getElementById('acctState');
        box.dataset.editing = 'false';
        
        renderAccount();
        
        // Use dynamic import for renderMine
        setTimeout(async () => {
            try {
                const { renderMine } = await import('./my-posts.js');
                if (typeof renderMine === 'function') {
                    renderMine();
                }
            } catch (e) {
                console.error('Error rendering My Posts:', e);
            }
        }, 100);
    } catch (e) {
        console.error('Error saving profile:', e);
        setLoadingError('Failed to save profile');
        showToast('Error saving profile: ' + (e.message || 'Unknown error'), 'error');
    } finally {
        hideLoading();
    }
}