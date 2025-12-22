// ===========================================
// sales-posting.js (It still contains functions that are still used by the new marketplace-posting.js)
// ===========================================
// Handles sales posting and management:
// - Posting new trucks/trailers
// - Editing existing sales
// - Reposting sales
// - Form validation and submission
// ===========================================
// Exports: postSale, editSale, repostSale, clearSaleForm
// ===========================================

import { trackEvent } from './firebase-config.js';
import { doc, setDoc, updateDoc } from './firebase-config.js';
import { db, state } from './main.js';
import { uid, ownerKey } from './utils-id.js';
import { showToast, goto, showLoading, hideLoading, setLoadingError, setProgress } from './ui.js';
import { authOpen } from './auth.js';
import { renderMine } from './profile.js';
import { renderSales } from './sales-posts.js';
import { renderHome } from './main.js';
import { showConfirm } from './confirm-modal.js';

import { 
    getSelectedImages, 
    clearSelectedImages,
    handleImageUpload
} from './images.js';

// ADD AT THE VERY TOP of sales-posting.js
console.log('🔍 sales-posting.js LOADED - tracking calls...');

export async function postSale() {
    // ===== DUPLICATE PREVENTION =====
    const submitBtn = document.querySelector('[data-action="submit-truck"]');
    
    // Prevent multiple simultaneous posts
    if (submitBtn.hasAttribute('data-posting')) {
        console.log('Post sale already in progress...');
        return;
    }
    
    // Mark as posting and disable button
    submitBtn.setAttribute('data-posting', 'true');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Posting...';
    // ===== END DUPLICATE PREVENTION =====

    if (!state.profile) {
        authOpen('signin');
        // Clean up if auth fails
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    // ✅ FIX: Use the correct element IDs from the HTML form
    const title = document.getElementById('saleTitle').value.trim();
    const country = document.getElementById('saleCountry').value;
    const city = document.getElementById('saleCity').value.trim();
    const price = Number(document.getElementById('salePrice').value || 0);
    const details = document.getElementById('saleDetails').value.trim();
    const contactOv = document.getElementById('saleContactOverride').value.trim();

    // === ADD VALIDATION ===
    if (!title || title.length < 3) {
        showToast('Please enter a title (min 3 characters)', 'error');
        // Clean up on error
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }
    
    if (!city || city.length < 2) {
        showToast('Please enter a valid city', 'error');
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }
    
    if (!country) {
        showToast('Please select a country', 'error');
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }
    
    if (price < 0) {
        showToast('Price cannot be negative', 'error');
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }
    
    if (price > 500000) {
        showToast('Price seems unusually high. Please verify.', 'error');
        // Continue anyway but warn user
    }
    // === END VALIDATION ===
    
    // Currency handling
    const currencySelect = document.getElementById('saleCurrency');
    const otherCurrencyInput = document.getElementById('saleCurrencyOther');
    let currency = currencySelect?.value || 'USD';
    
    if (currency === 'Other') {
        currency = otherCurrencyInput?.value.trim() || 'USD';
        if (!currency) {
            showToast('Please specify the currency', 'error');
            // Clean up on error
            submitBtn.removeAttribute('data-posting');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
    }

    // Validation
    if (!title || !city || !country) {
        showToast('Please fill Title, City and Country.', 'error');
        // Clean up on error
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    if ((!state.profile.phone && !state.profile.email) && !contactOv) {
        showToast('Please add a contact in My Account or type a contact override.', 'error');
        // Clean up on error
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }

    const contact = contactOv ? { name: state.profile?.name || 'Contact', phone: contactOv, email: '', web: state.profile?.web || '' } : contactFromProfile();

    // Check if we're editing
    const editId = submitBtn.dataset.editId;
    const isEdit = !!editId;

    // Track posting attempt
    trackEvent('post_sale_attempt', {
        is_edit: isEdit,
        edit_id: editId || null
    });

    // Show loading
    showLoading(isEdit ? 'Updating sale...' : 'Posting sale...');

    try {
        // Handle image uploads
        const selectedImages = getSelectedImages();
let uploadedImages = [];

if (selectedImages.length > 0) {
    try {
        // Upload images with progress tracking
        setProgress(0);
        
        // Use the improved handleImageUpload that handles multiple files
        uploadedImages = await handleImageUpload(
            selectedImages, 
            (progress, message) => setProgress(progress, message)
        );
        
        // Check if upload was cancelled or failed
        if (!uploadedImages) {
            // Upload was cancelled
            hideLoading();
            submitBtn.removeAttribute('data-posting');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
            return;
        }
    } catch (uploadError) {
        console.error('❌ Image upload failed:', uploadError);
        showToast(uploadError.message || 'Failed to upload images. Please try again.', 'error');
        hideLoading();
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        return;
    }
}

        const item = {
    id: editId || uid(),
    title,
    country,
    city,
    price,
    currency,
    details,
    contact,
    owner: ownerKey(),
    postedAt: editId ? (state.sales.find(s => s.id === editId)?.postedAt || Date.now()) : Date.now(),
   images: uploadedImages.length > 0 ? uploadedImages : (editId ? state.sales.find(s => s.id === editId)?.images : undefined)
};

        await setDoc(doc(db, 'sales', item.id), item);

        if (isEdit) {
            // Update existing sale
            const index = state.sales.findIndex(s => s.id === editId);
            if (index !== -1) state.sales[index] = item;
            showToast('Sale updated successfully', 'success');

            // Track successful update
            trackEvent('post_sale', {
                success: true,
                is_edit: true,
                sale_id: item.id,
                country: item.country,
                price: item.price,
                currency: item.currency || 'USD',
                has_images: (item.images && item.images.length > 0) || false,
                image_count: (item.images && item.images.length) || 0
            });
        } else {
            // Add new sale
            state.sales.unshift(item);
            showToast('Sale posted successfully', 'success');

            // Track successful post
            trackEvent('post_sale', {
                success: true,
                sale_id: item.id,
                country: item.country,
                price: item.price,
                currency: item.currency || 'USD',
                has_images: (item.images && item.images.length > 0) || false,
                image_count: (item.images && item.images.length) || 0,
                has_contact_override: !!contactOv
            });
        }

        clearSaleForm();
        // Reset button
        submitBtn.textContent = 'Post Truck/Trailer';
        delete submitBtn.dataset.editId;
        goto('sales');
    } catch (e) {
        console.error('Error posting sale:', e);
        setLoadingError('Failed to post sale');

        // Track failed post
        trackEvent('post_sale', {
            success: false,
            error: e.message,
            is_edit: isEdit
        });

        showToast('Error posting sale', 'error');
    } finally {
        hideLoading();
        // Always clean up posting state
        submitBtn.removeAttribute('data-posting');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

export function clearSaleForm() {
    // ✅ FIX: Use the correct element IDs from the HTML form
    ['saleTitle','saleCity','salePrice','saleDetails','saleContactOverride'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset currency
    const currencySelect = document.getElementById('saleCurrency');
    if (currencySelect) currencySelect.value = 'USD';
    
    const otherCurrencyInput = document.getElementById('saleCurrencyOther');
    if (otherCurrencyInput) {
        otherCurrencyInput.style.display = 'none';
        otherCurrencyInput.value = '';
    }
    
    // Clear selected images
    clearSelectedImages();
    
    // ✅ ADD THIS: Reset button text and remove edit ID
    const submitBtn = document.querySelector('[data-action="submit-truck"]');
    if (submitBtn) {
        submitBtn.textContent = 'Post Truck/Trailer';
        delete submitBtn.dataset.editId;
    }
}

export function editSale(saleId) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    // ✅ FIX: Navigate to SALES section where the sale form actually exists
    goto('sales');
    
    showLoading('Loading edit form...');
    
    // Fill form with existing data after navigation is complete
    setTimeout(() => {
        try {
            hideLoading(); // Hide loading once form is ready
        
        // ✅ FIX: Use the correct element IDs from the HTML form
        document.getElementById('saleTitle').value = sale.title || '';
        document.getElementById('saleCountry').value = sale.country || '';
        document.getElementById('saleCity').value = sale.city || '';
        document.getElementById('salePrice').value = sale.price || '';
        document.getElementById('saleDetails').value = sale.details || '';
        document.getElementById('saleContactOverride').value = '';
        
        // Set currency
        const currencySelect = document.getElementById('saleCurrency');
        const otherCurrencyInput = document.getElementById('saleCurrencyOther');
        if (currencySelect) {
            const isStandardCurrency = ['USD', 'ZAR', 'BWP', 'ZWL', 'ZMW', 'MWK', 'TZS'].includes(sale.currency);
            if (isStandardCurrency) {
                currencySelect.value = sale.currency || 'USD';
                if (otherCurrencyInput) otherCurrencyInput.style.display = 'none';
            } else {
                currencySelect.value = 'Other';
                if (otherCurrencyInput) {
                    otherCurrencyInput.style.display = 'block';
                    otherCurrencyInput.value = sale.currency || '';
                }
            }
        }
        
        // Set images for editing
        const images = Array.isArray(sale.images) ? sale.images : (sale.image ? [sale.image] : []);
        // Note: Image preview will be handled by the images.js module
        
        // Scroll to the form at the bottom of sales section
        setTimeout(() => {
            const postAnchor = document.getElementById('postSaleAnchor');
            if (postAnchor) {
                postAnchor.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        }, 600);
        
        // Change button text and store edit ID
        const submitBtn = document.querySelector('[data-action="submit-truck"]');
        if (submitBtn) {
            submitBtn.textContent = 'Update Sale';
            submitBtn.dataset.editId = saleId;
        }
        
        showToast('Editing sale. Update and save.', 'success');
             } catch (error) {
            console.error('Error loading sale edit form:', error);
            hideLoading();
            showToast('Error loading edit form', 'error');
        }
    }, 300); // Increased delay to ensure navigation completes
}

// Then replace the repostSale function:
export async function repostSale(saleId) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    // Use modern confirm dialog instead of native confirm()
    const confirmed = await showConfirm(
        'This will create a new listing with the current date and time, moving it to the top of the marketplace.',
        {
            title: 'Repost Sale',
            confirmText: 'Repost',
            cancelText: 'Cancel',
            type: 'warning',
            description: `${sale.title} • ${sale.city}, ${sale.country} • ${sale.currency || 'USD'} ${sale.price.toLocaleString()}`
        }
    );
    
    if (!confirmed) return;
    
    // Track repost attempt
    trackEvent('repost_sale_attempt', {
        sale_id: saleId
    });
    
    showLoading('Reposting sale...');
    
    try {
        // Create new sale with same data but new ID and timestamp
        const newSale = {
            ...sale,
            id: uid(),
            postedAt: Date.now()
        };
        
        await setDoc(doc(db, 'sales', newSale.id), newSale);
        state.sales.unshift(newSale);
        
        // Track successful repost
        trackEvent('repost_sale', {
            success: true,
            original_sale_id: saleId,
            new_sale_id: newSale.id
        });
        
        showToast('Sale reposted successfully', 'success');
        renderSales();
        renderMine();
    } catch (e) {
        console.error('Error reposting sale:', e);
        
        // Track failed repost
        trackEvent('repost_sale', {
            success: false,
            error: e.message,
            sale_id: saleId
        });
        
        showToast('Error reposting sale', 'error');
    } finally {
        hideLoading();
    }
}

// =========================
// Helper Functions
// =========================
function contactFromProfile() {
    return {
        name: state.profile?.name || '',
        phone: state.profile?.phone || '',
        email: state.profile?.email || '',
        web: state.profile?.web || ''
    };
}

