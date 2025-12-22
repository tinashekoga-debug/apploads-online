// ===========================================
// load-posting.js
// ===========================================
// Handles load posting and management:
// - Posting new loads
// - Editing existing loads
// - Reposting loads
// - Form validation and submission
// ===========================================
// Exports: postLoad, editLoad, repostLoad, clearPostForm
// ===========================================

import { trackEvent } from './firebase-config.js';
import { doc, setDoc, updateDoc } from './firebase-config.js';
import { db, state } from './main.js';
import { uid, ownerKey } from './utils-id.js';
import { showToast, goto, showLoading, hideLoading, setLoadingError, withTimeout } from './ui.js';
import { authOpen } from './auth.js';
import { renderMine } from './profile.js';
import { renderLoads } from './load-posts.js';
import { renderHome } from './main.js';
import { countries } from './countries.js';
import { showConfirm } from './confirm-modal.js';


export async function postLoad() {
    const submitBtn = document.querySelector('[data-action="submit-load"]');
    
    if (submitBtn.hasAttribute('data-posting')) {
        console.log('Post load already in progress...');
        return;
    }
    
    submitBtn.setAttribute('data-posting', 'true');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';

    try {
        // ===== AUTH CHECK =====
        if (!state.currentUser || !state.currentUser.uid) {
            authOpen('signin');
            submitBtn.removeAttribute('data-posting');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }

        // 🔥 FIX: Get form element correctly
        const form = document.getElementById('postLoadForm') || document.getElementById('post');
        const editingId = form?.dataset.editingId;
        
        trackEvent('post_load_attempt', {
            is_edit: !!editingId,
            edit_id: editingId || null
        });
        
        // 🔥 FIX: Show correct loading message based on editingId
        const loadingMessage = editingId ? 'Updating Load...' : 'Posting Load...';
        showLoading(loadingMessage);
        
        const originCountryEl = document.getElementById('originCountry');
        const destCountryEl = document.getElementById('destCountry');
        
        if (editingId) {
            // Handle update
            const originCity = document.getElementById('originCity').value.trim();
            const destCity = document.getElementById('destCity').value.trim();
            const cargo = document.getElementById('cargo').value.trim();
            const price = Number(document.getElementById('price').value || 0);
            const ready = document.getElementById('ready').value;

            // Get currency and pricing type for edit mode
            const currencySelect = document.getElementById('currency');
            const otherCurrencyInput = document.getElementById('otherCurrency');
            let currency = currencySelect?.value || 'USD';
            
            if (currency === 'Other') {
                currency = otherCurrencyInput?.value.trim() || 'USD';
                if (!currency) {
                    showToast('Please specify the currency', 'error');
                    submitBtn.removeAttribute('data-posting');
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                    hideLoading();
                    return;
                }
            }
            
            const pricingTypeRadios = document.querySelectorAll('input[name="pricingType"]');
            let pricingType = 'total';
            pricingTypeRadios.forEach(radio => {
                if (radio.checked) {
                    pricingType = radio.value;
                }
            });
            
            // Validation
            if (!originCity || originCity.length < 2) {
                showToast('Please enter a valid origin city', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
            
            if (!destCity || destCity.length < 2) {
                showToast('Please enter a valid destination city', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
            
            if (!cargo || cargo.length < 3) {
                showToast('Please describe the cargo (min 3 characters)', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
            
            if (!price || price <= 0) {
                showToast('Please enter a valid price', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
            
            if (price > 1000000) {
                showToast('Price seems too high. Please verify the amount.', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
            
            // Handle "Other" values
            let originCountry = originCountryEl.value;
            if (originCountry === 'Other') {
                originCountry = document.getElementById('originCountryOther').value.trim();
            }

            let destCountry = destCountryEl.value;
            if (destCountry === 'Other') {
                destCountry = document.getElementById('destCountryOther').value.trim();
            }

            let termsValue = document.getElementById('terms').value;
            if (termsValue === 'Other') {
                termsValue = document.getElementById('termsOther').value.trim();
            }
            
            try {
                const updatedLoad = {
                    originCountry: originCountry,
                    originCity: originCity,
                    destCountry: destCountry,
                    destCity: destCity,
                    cargo: cargo,
                    price: Number(price),
                    currency: currency,
                    pricingType: pricingType,
                    terms: termsValue,
                    ready: ready,
                    contact: contactFromProfile(),
                    owner: ownerKey()
                };
                
                await withTimeout(
                    updateDoc(doc(db, 'loads', editingId), updatedLoad),
                    30000,
                    'Update load'
                );
                
                const idx = state.loads.findIndex(l => l.id === editingId);
                if (idx !== -1) {
                    state.loads[idx] = { ...state.loads[idx], ...updatedLoad };
                }
                
                showToast('Load updated successfully', 'success');
                
                // 🔥 FIX: Clear edit state properly
                if (form) delete form.dataset.editingId;
                
                clearPostForm();
                
                renderLoads();
                renderMine();
                renderHome();
                goto('account');
                
                // 🔥 FIX: Reset UI to default post mode
                const postBtn = document.getElementById('postLoadBtn');
                const editActions = document.getElementById('editLoadActions');
                if (postBtn) postBtn.style.display = 'block';
                if (editActions) editActions.style.display = 'none';
                
            } catch (e) {
                console.error('Error updating load:', e);
                
                if (e.message.includes('timed out')) {
                    setLoadingError('Connection timeout. Please check your internet and try again.');
                    showToast('Update timed out. Please try again.', 'error', { duration: 5000 });
                } else {
                    setLoadingError('Failed to update load');
                    showToast('Error updating load', 'error');
                }
                
                trackEvent('post_load', {
                    success: false,
                    error: e.message,
                    is_edit: true,
                    is_timeout: e.message.includes('timed out')
                });
            } finally {
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
            }
            return;
        }
        
        // NEW POST (not editing)
        if (!state.currentUser || !state.currentUser.uid) {
            hideLoading();
            authOpen('signin');
            submitBtn.removeAttribute('data-posting');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
        
        const originCity = document.getElementById('originCity').value.trim();
        const destCity = document.getElementById('destCity').value.trim();
        const cargo = document.getElementById('cargo').value.trim();
        const price = Number(document.getElementById('price').value || 0);
        const ready = document.getElementById('ready').value;
        
        // Handle "Other" values
        let originCountry = originCountryEl.value;
        if (originCountry === 'Other') {
            originCountry = document.getElementById('originCountryOther').value.trim();
        }

        let destCountry = destCountryEl.value;
        if (destCountry === 'Other') {
            destCountry = document.getElementById('destCountryOther').value.trim();
        }

        let termsValue = document.getElementById('terms').value;
        if (termsValue === 'Other') {
            termsValue = document.getElementById('termsOther').value.trim();
        }
        
        // Get currency and pricing type
        const currencySelect = document.getElementById('currency');
        const otherCurrencyInput = document.getElementById('otherCurrency');
        let currency = currencySelect?.value || 'USD';
        
        if (currency === 'Other') {
            currency = otherCurrencyInput?.value.trim() || 'USD';
            if (!currency) {
                showToast('Please specify the currency', 'error');
                submitBtn.removeAttribute('data-posting');
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                hideLoading();
                return;
            }
        }
        
        const pricingTypeRadios = document.querySelectorAll('input[name="pricingType"]');
        let pricingType = 'total';
        pricingTypeRadios.forEach(radio => {
            if (radio.checked) {
                pricingType = radio.value;
            }
        });
        
        if (!originCity || !destCity || !cargo) {
            showToast('Please fill Origin City, Destination City and Cargo.', 'error');
            submitBtn.removeAttribute('data-posting');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            hideLoading();
            return;
        }
        
       // Check if user has at least one contact method
const hasContact = (state.profile?.phone || state.profile?.email || state.currentUser?.email) ? true : false;
if (!hasContact) {
    showToast('Please add a contact in My Account.', 'error');
    submitBtn.removeAttribute('data-posting');
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
    hideLoading();
    return;
}

const contact = contactFromProfile();
        
        const editId = submitBtn.dataset.editId;
        
        const item = {
            id: editId || uid(),
            originCountry: originCountry,
            originCity,
            destCountry: destCountry,
            destCity,
            cargo,
            price,
            currency: currency,
            pricingType: pricingType,
            terms: termsValue,
            ready,
            contact,
            owner: ownerKey(),
            postedAt: editId ? (state.loads.find(l => l.id === editId)?.postedAt || Date.now()) : Date.now()
        };
        
        await withTimeout(
            setDoc(doc(db, 'loads', item.id), item),
            30000,
            'Post load'
        );
        
        if (editId) {
            const index = state.loads.findIndex(l => l.id === editId);
            if (index !== -1) state.loads[index] = item;
            showToast('Load updated successfully', 'success');
            
            trackEvent('post_load', {
                success: true,
                is_edit: true,
                load_id: item.id,
                origin_country: item.originCountry,
                destination_country: item.destCountry,
                price: item.price,
                currency: item.currency || 'USD',
                pricing_type: item.pricingType || 'total'
            });
        } else {
            state.loads.unshift(item);
            showToast('Load posted successfully', 'success');
            
           trackEvent('post_load', {
    success: true,
    load_id: item.id,
    origin_country: item.originCountry,
    destination_country: item.destCountry,
    price: item.price,
    currency: item.currency || 'USD',
    pricing_type: item.pricingType || 'total'
});
        }
        
        clearPostForm();
        submitBtn.textContent = 'Post Load';
        delete submitBtn.dataset.editId;
        goto('loads');
        
    } catch (e) {
        console.error('Error posting load:', e);
        
        if (e.message.includes('timed out')) {
            setLoadingError('Connection timeout. Please check your internet and try again.');
            showToast('Post timed out. Please try again.', 'error', { duration: 5000 });
        } else {
            setLoadingError('Failed to post load');
            showToast('Error posting load', 'error');
        }
        
        trackEvent('post_load', {
            success: false,
            error: e.message,
            is_edit: !!form?.dataset.editingId,
            is_timeout: e.message.includes('timed out')
        });
        
    } finally {
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        hideLoading();
    }
}

export function clearPostForm() {
   ['originCity','destCity','cargo','price','ready'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
});
    
    // Reset currency and pricing type
    const currencySelect = document.getElementById('currency');
    if (currencySelect) currencySelect.value = 'USD';
    
    const otherCurrencyInput = document.getElementById('otherCurrency');
    if (otherCurrencyInput) {
        otherCurrencyInput.style.display = 'none';
        otherCurrencyInput.value = '';
    }
    
    const totalPriceRadio = document.querySelector('input[name="pricingType"][value="total"]');
    if (totalPriceRadio) totalPriceRadio.checked = true;
    
    // 🔥 FIX: Clear edit state from both possible form elements
    const form = document.getElementById('postLoadForm') || document.getElementById('post');
    if (form) delete form.dataset.editingId;
    
    const submitBtn = document.querySelector('[data-action="submit-load"]');
    if (submitBtn) {
        submitBtn.textContent = 'Post Load';
        delete submitBtn.dataset.editId;
    }
    
    // 🔥 FIX: Reset UI to default state
    const postBtn = document.getElementById('postLoadBtn');
    const editActions = document.getElementById('editLoadActions');
    if (postBtn) postBtn.style.display = 'block';
    if (editActions) editActions.style.display = 'none';
}

export function editLoad(loadId) {
    const load = state.loads.find(l => l.id === loadId);
    if (!load) {
        showToast('Load not found', 'error');
        return;
    }
    
    // Navigate to post section FIRST
    goto('post');

    // 🔥 FIX: Set edit state on the correct form element
    setTimeout(() => {
        const submitBtn = document.querySelector('[data-action="submit-load"]');
        const postBtn = document.getElementById('postLoadBtn');
        const editActions = document.getElementById('editLoadActions');
        const form = document.getElementById('postLoadForm') || document.getElementById('post');

        if (submitBtn) {
            submitBtn.textContent = 'Update Load';
            submitBtn.dataset.editId = loadId;
        }

        // 🔥 FIX: Set editingId on the form element
        if (form) {
            form.dataset.editingId = loadId;
        }

        if (postBtn) postBtn.style.display = 'none';
        if (editActions) editActions.style.display = 'flex';
    }, 0);
    
    showLoading('Loading edit form...');
    
    // Fill form with existing data after navigation is complete
    setTimeout(() => {
        try {
            hideLoading();
            
            const originCountryEl = document.getElementById('originCountry');
            const destCountryEl = document.getElementById('destCountry');
            
            if (!originCountryEl || !destCountryEl) {
                showToast('Error: Form elements not found', 'error');
                return;
            }
            
            originCountryEl.value = load.originCountry || '';
            document.getElementById('originCity').value = load.originCity || '';
            destCountryEl.value = load.destCountry || '';
            document.getElementById('destCity').value = load.destCity || '';
            document.getElementById('cargo').value = load.cargo || '';
            document.getElementById('price').value = load.price || '';
            
            // Set currency
            const currencySelect = document.getElementById('currency');
            const otherCurrencyInput = document.getElementById('otherCurrency');
            if (currencySelect) {
                const isStandardCurrency = ['USD', 'ZAR', 'BWP', 'ZWL', 'NAD', 'ZMW', 'MWK', 'TZS'].includes(load.currency);
                if (isStandardCurrency) {
                    currencySelect.value = load.currency || 'USD';
                    if (otherCurrencyInput) otherCurrencyInput.style.display = 'none';
                } else {
                    currencySelect.value = 'Other';
                    if (otherCurrencyInput) {
                        otherCurrencyInput.style.display = 'block';
                        otherCurrencyInput.value = load.currency || '';
                    }
                }
            }
            
            // Set pricing type
            const pricingTypeRadios = document.querySelectorAll('input[name="pricingType"]');
            pricingTypeRadios.forEach(radio => {
                if (radio.value === (load.pricingType || 'total')) {
                    radio.checked = true;
                }
            });
            
            document.getElementById('terms').value = load.terms || '';
            document.getElementById('ready').value = load.ready || '';
            
          // Handle "Other" values in edit mode
            if (load.originCountry && !countries.includes(load.originCountry)) {
                originCountryEl.value = 'Other';
                const originOther = document.getElementById('originCountryOther');
                if (originOther) {
                    originOther.style.display = 'block';
                    originOther.value = load.originCountry;
                }
            }

            if (load.destCountry && !countries.includes(load.destCountry)) {
                destCountryEl.value = 'Other';
                const destOther = document.getElementById('destCountryOther');
                if (destOther) {
                    destOther.style.display = 'block';
                    destOther.value = load.destCountry;
                }
            }
            
        } catch (error) {
            console.error('Error filling edit form:', error);
            showToast('Error loading form data', 'error');
        }
    }, 100);
}

// Helper function to get contact from profile
function contactFromProfile() {
    if (!state.profile) {
        console.error('No profile found in state');
        return {
            name: state.currentUser?.displayName || 'User',
            email: state.currentUser?.email || '',
            phone: state.profile?.phone || ''
        };
    }
    
    return {
        name: state.profile.name || state.currentUser?.displayName || 'User',
        email: state.profile.email || state.currentUser?.email || '',
        phone: state.profile.phone || ''
    };
}

export async function repostLoad(loadId) {
    const load = state.loads.find(l => l.id === loadId);
    if (!load) {
        showToast('Load not found', 'error');
        return;
    }
    
    const confirmed = await showConfirm(
        'This will create a new post with the current date and time, moving it to the top of the list.',
        {
            title: 'Repost Load',
            confirmText: 'Repost',
            cancelText: 'Cancel',
            type: 'warning',
            description: `${load.originCity} → ${load.destCity} • ${load.cargo}`
        }
    );
    
    if (!confirmed) return;
    
    trackEvent('repost_load_attempt', {
        load_id: loadId
    });
    
    showLoading('Reposting load...');
    
    try {
    // Create a new load object without the 'status' field
    const { status, ...loadWithoutStatus } = load;
    const newLoad = {
        ...loadWithoutStatus,
        id: uid(),
        postedAt: Date.now()
    };
        
        // ✅ WRAP WITH TIMEOUT
        await withTimeout(
            setDoc(doc(db, 'loads', newLoad.id), newLoad),
            30000,
            'Repost load'
        );
        
        state.loads.unshift(newLoad);

        trackEvent('repost_load', {
            success: true,
            original_load_id: loadId,
            new_load_id: newLoad.id
        });

        showToast('Load reposted successfully', 'success');
        renderLoads();
        renderMine();
        
    } catch (e) {
        console.error('Error reposting load:', e);
        
        if (e.message.includes('timed out')) {
            setLoadingError('Connection timeout. Please try again.');
            showToast('Repost timed out. Please try again.', 'error', { duration: 5000 });
        } else {
            showToast('Error reposting load', 'error');
        }
        
        trackEvent('repost_load', {
            success: false,
            error: e.message,
            load_id: loadId,
            is_timeout: e.message.includes('timed out')
        });
        
    } finally {
        hideLoading();
    }
}