// ===========================================
// auth.js
// ===========================================
// Handles all authentication functionality:
// - Sign in (email/password and Google)
// - Sign up (create new accounts)
// - Sign out
// - Forgot password / password reset
// - Auth popup management
// ===========================================
// Exports: authOpen, authClose, switchAuth, doSignup, doSignin, doGoogleSignin
// ===========================================

// Add this import at the top with other imports
import { sendPasswordResetEmail } from './firebase-config.js';
import { trackEvent } from './firebase-config.js';
import { auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, doc, setDoc, getDoc } from './firebase-config.js';
import { db, state } from './main.js';
import { showToast, goto, showLoading, hideLoading, setLoadingError } from './ui.js';

// =========================
// Validation Helpers
// =========================
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePhone(phone) {
    // Basic phone validation - allows international format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return !phone || phoneRegex.test(phone.replace(/\s/g, ''));
}

function validatePassword(password) {
    return password && password.length >= 6;
}

let authCallback = null;

export function authOpen(mode, callback = null) {
    authCallback = callback;
    document.getElementById('auth').style.display = 'flex';
    switchAuth(mode || 'signin');
    
    // Hide the tab buttons
    const tabButtons = document.querySelector('.row.mt10');
    if (tabButtons) {
        tabButtons.style.display = 'none';
    }
}

export function authClose() {
    document.getElementById('auth').style.display = 'none';
    const cb = authCallback;
    authCallback = null;
    if (cb) {
        // Delay callback to ensure auth state has updated
        setTimeout(cb, 150);
    }
}

export function switchAuth(mode) {
    const c = document.getElementById('authForms');
    const signinBtn = document.getElementById('signinTabBtn');
    const signupBtn = document.getElementById('signupTabBtn');
    
    // Update tab styles
    if (mode === 'signup') {
        signinBtn?.classList.remove('active');
        signupBtn?.classList.add('active');
    } else {
        signinBtn?.classList.add('active');
        signupBtn?.classList.remove('active');
    }
    
    if (mode === 'signup') {
        c.innerHTML = `
            <form id="signupForm" autocomplete="off">
                <label>Name / Company</label>
                <input id="a_name" placeholder="e.g. Global Logistics" autocomplete="name" />
                <div class="row mt8">
                    <div>
                        <label>Phone (WhatsApp)</label>
                        <input id="a_phone" type="tel" placeholder="+263…" autocomplete="tel" />
                    </div>
                    <div>
                        <label>Email</label>
                        <input id="a_email" type="email" placeholder="you@email.com" required autocomplete="email" />
                    </div>
                </div>
                <label class="mt8">Password</label>
                <div style="position: relative;">
    <input id="a_pw" type="password" placeholder="Minimum 6 characters" required autocomplete="new-password" minlength="6" style="width: 100%; padding-right: 40px;" />
    <button type="button" id="toggleSignupPassword" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; color: #666;">👁️</button>
</div>
                <button type="submit" class="btn mt12" id="signupBtn">
                    <span class="btn-text">Create Account</span>
                    <span class="btn-loader" style="display:none;">Creating...</span>
                </button>
                <p class="hint mt8">Your data will be securely stored in the cloud.</p>
            </form>
        `;
        
        document.getElementById('signupForm').addEventListener('submit', function(e) {
            e.preventDefault();
            doSignup();
        });
        // Add password toggle functionality for signup
const toggleSignupPassword = document.getElementById('toggleSignupPassword');
const signupPasswordInput = document.getElementById('a_pw');
if (toggleSignupPassword && signupPasswordInput) {
    toggleSignupPassword.addEventListener('click', function() {
        const type = signupPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        signupPasswordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '🙈';
    });
}
    } else {
  c.innerHTML = `
    <form id="signinForm" autocomplete="on">
        <label>Email</label>
        <input id="s_user" type="email" placeholder="your email" required autocomplete="email" />
        <label class="mt8">Password</label>
        <div style="position: relative;">
            <input id="s_pw" type="password" placeholder="••••" required autocomplete="current-password" style="width: 100%; padding-right: 40px;" />
            <button type="button" id="togglePassword" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 14px; color: #666;">👁️</button>
        </div>
        <button type="submit" class="btn mt12" id="signinBtn">
            <span class="btn-text">Sign in</span>
            <span class="btn-loader" style="display:none;">Signing in...</span>
        </button>
        <p class="hint mt8" style="text-align: center;">
            <a href="#" id="forgotPassword" style="color: #0b7d62; text-decoration: none;">Forgot your password?</a>
        </p>
        <p class="hint mt8" style="text-align: center;">
            Don't have an account yet? <a href="#" id="switchToSignup" style="color: #0b7d62; text-decoration: none; font-weight: 500;">Create one</a>
        </p>
    </form>
`;
        
        document.getElementById('signinForm').addEventListener('submit', function(e) {
            e.preventDefault();
            doSignin();
        });
        // Add password toggle functionality
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('s_pw');
if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function() {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

// Add forgot password handler
const forgotPassword = document.getElementById('forgotPassword');
if (forgotPassword) {
    forgotPassword.addEventListener('click', function(e) {
        e.preventDefault();
        doForgotPassword();
    });
}

// Add switch to signup handler
const switchToSignup = document.getElementById('switchToSignup');
if (switchToSignup) {
    switchToSignup.addEventListener('click', function(e) {
        e.preventDefault();
        switchAuth('signup');
    });
}
    }
}

// Helper to show/hide button loading state
function setButtonLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    
    if (loading) {
        btn.disabled = true;
        if (text) text.style.display = 'none';
        if (loader) loader.style.display = 'inline';
    } else {
        btn.disabled = false;
        if (text) text.style.display = 'inline';
        if (loader) loader.style.display = 'none';
    }
}

export async function doSignup() {
    const name = document.getElementById('a_name').value.trim();
    const phone = document.getElementById('a_phone').value.trim();
    const email = document.getElementById('a_email').value.trim();
    const pw = document.getElementById('a_pw').value;

    // === ADD VALIDATION ===
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!validatePassword(pw)) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    if (!validatePhone(phone)) {
        showToast('Please enter a valid phone number', 'error');
        return;
    }
    // === END VALIDATION ===
    
    // Track signup attempt
    trackEvent('signup_attempt', {
        method: 'email',
        has_name: !!name,
        has_phone: !!phone,
        email_provided: !!email
    });
    
    if (!email || !pw) {
        showToast('Please provide email and password.', 'error');
        return;
    }
    
    if (pw.length < 6) {
        showToast('Password must be at least 6 characters.', 'error');
        return;
    }
    
setButtonLoading('signupBtn', true);
showLoading('Creating account...');
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pw);
        const user = userCredential.user;
        
        // Create profile
        await setDoc(doc(db, 'profiles', user.uid), {
            name: name || '',
            phone: phone || '',
            email: email,
            web: ''
        });
        
     showToast('✅ Account created successfully', 'success');

// Track successful signup
trackEvent('signup', {
    method: 'email',
    user_id: user.uid,
    timestamp: Date.now()
});

authClose();
// Navigate to account tab and show edit form for new users
setTimeout(() => {
    const box = document.getElementById('acctState');
    box.dataset.editing = 'true';
    goto('account');
}, 500);
} catch (e) {
    console.error('Error creating account:', e);
    setLoadingError('Failed to create account');
    setButtonLoading('signupBtn', false);
    
    if (e.code === 'auth/email-already-in-use') {
        showToast('This email is already registered. Try signing in instead.', 'error');
    } else if (e.code === 'auth/invalid-email') {
        showToast('Invalid email address', 'error');
    } else if (e.code === 'auth/weak-password') {
        showToast('Password is too weak. Use at least 6 characters.', 'error');
    } else if (e.code === 'auth/operation-not-allowed') {
        showToast('Email/password sign-up is not enabled', 'error');
    } else {
        showToast('Error creating account: ' + (e.message || 'Unknown error'), 'error');
    }
} finally {
    setButtonLoading('signupBtn', false);
    hideLoading();
}
}

export async function doSignin() {
    const email = document.getElementById('s_user').value.trim();
    const pw = document.getElementById('s_pw').value;

    // === ADD VALIDATION ===
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    if (!pw) {
        showToast('Please enter your password', 'error');
        return;
    }
    // === END VALIDATION ===
    
    // Track signin attempt
    trackEvent('signin_attempt', {
        method: 'email',
        email_provided: !!email
    });
    
    if (!email || !pw) {
        showToast('Please enter email and password', 'error');
        return;
    }
    
    setButtonLoading('signinBtn', true);
showLoading('Signing in...');
    
    try {
        await signInWithEmailAndPassword(auth, email, pw);
 showToast('✅ Signed in successfully', 'success');

// Track successful signin
trackEvent('signin', {
    method: 'email',
    user_id: user.uid,
    timestamp: Date.now()
});

authClose();
// Navigate to account tab in read-only mode
setTimeout(() => {
    const box = document.getElementById('acctState');
    box.dataset.editing = 'false';
    goto('account');
}, 500);
} catch (e) {
    console.error('Error signing in:', e);
    setLoadingError('Sign in failed');
    setButtonLoading('signinBtn', false);
    
    if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        showToast('Incorrect email or password', 'error');
    } else if (e.code === 'auth/invalid-email') {
        showToast('Invalid email address', 'error');
    } else if (e.code === 'auth/too-many-requests') {
        showToast('Too many failed attempts. Please try again later.', 'error');
    } else if (e.code === 'auth/user-disabled') {
        showToast('This account has been disabled', 'error');
    } else {
        showToast('Error signing in: ' + (e.message || 'Unknown error'), 'error');
    }
} finally {
    setButtonLoading('signinBtn', false);
    hideLoading();
}
}

export async function doGoogleSignin() {
    const provider = new GoogleAuthProvider();
    
    // Track Google signin attempt
    trackEvent('signin_attempt', {
        method: 'google'
    });
    
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Check if profile exists, if not create it
        const profileDoc = await getDoc(doc(db, 'profiles', user.uid));
        if (!profileDoc.exists()) {
            await setDoc(doc(db, 'profiles', user.uid), {
                name: user.displayName || '',
                phone: '',
                email: user.email || '',
                web: ''
            });
        }
        
   showToast('✅ Signed in with Google', 'success');

// Track successful Google signin
trackEvent('signin', {
    method: 'google',
    user_id: user.uid,
    timestamp: Date.now()
});

authClose();
// Navigate to account tab - edit mode for new users, read-only for existing
setTimeout(() => {
    const box = document.getElementById('acctState');
    // Show edit form if profile is incomplete
    const isIncomplete = !state.profile.name || !state.profile.phone;
    box.dataset.editing = isIncomplete ? 'true' : 'false';
    goto('account');
}, 500);
      } catch (e) {
        console.error('Error with Google sign-in:', e);
        hideLoading(); // === ADD THIS ===
        
        if (e.code === 'auth/popup-closed-by-user') {
            showToast('Sign-in cancelled', 'warning');
        } else if (e.code === 'auth/popup-blocked') {
            showToast('Popup was blocked. Please allow popups for this site.', 'error');
        } else if (e.code === 'auth/unauthorized-domain') {
            showToast('This domain is not authorized for Google sign-in', 'error');
        } else {
            showToast('Error signing in with Google: ' + (e.message || 'Unknown error'), 'error');
        }
    } finally {
        hideLoading(); // === ADD THIS FOR SAFETY ===
    }
}
async function doForgotPassword() {
    const email = document.getElementById('s_user')?.value.trim();
    
    if (!email) {
        showToast('Please enter your email address to reset password', 'error');
        return;
    }
    
    // Track password reset request
    trackEvent('password_reset_request', {
        email_provided: !!email
    });
    
    try {
        await sendPasswordResetEmail(auth, email);
showToast('✅ Password reset email sent! Check your inbox.', 'success');

// Track successful password reset request
trackEvent('password_reset_sent', {
    email: email
});
    } catch (e) {
        console.error('Error sending password reset:', e);
        
        if (e.code === 'auth/user-not-found') {
            showToast('No account found with this email', 'error');
        } else if (e.code === 'auth/invalid-email') {
            showToast('Invalid email address', 'error');
        } else if (e.code === 'auth/too-many-requests') {
            showToast('Too many attempts. Please try again later.', 'error');
        } else {
            showToast('Error sending reset email: ' + (e.message || 'Unknown error'), 'error');
        }
    }
}

