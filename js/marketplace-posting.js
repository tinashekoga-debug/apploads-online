// ===========================================
// marketplace-posting.fixed.js (UPDATED FOR NEW HTML)
// ===========================================

import { trackEvent } from './firebase-config.js';
import { db, doc, setDoc } from './firebase-config.js';
import { state } from './main.js';
import { uid, ownerKey } from './utils-id.js';
import { showToast, showLoading, hideLoading } from './ui.js';
import { authOpen } from './auth.js';
import { renderSales } from './sales-posts.js';
import { renderMine } from './profile.js';
import {
    handleImageUpload,
    placeholderImage,
    setupImagePreview,
    getSelectedImages,
    clearSelectedImages
} from './images.js';

let currentPostType = null;
let currentCategory = null;
let currentStep = 1;
let _initialized = false;

// Helper function to safely get countries data with fallbacks
function getCountries() {
    if (window.countries && Array.isArray(window.countries) && window.countries.length > 0) {
        return window.countries;
    }

    return [
        'Angola', 'Botswana', 'DR Congo', 'Eswatini', 'Lesotho',
        'Malawi', 'Mozambique', 'Namibia', 'South Africa',
        'Tanzania', 'Zambia', 'Zimbabwe'
    ];
}

export function initMarketplacePosting() {
    if (_initialized) return;
    _initialized = true;

    console.log('🎯 Initializing marketplace posting...');
    setupPostModalEvents();
    fillCountrySelect();
}

function setupPostModalEvents() {
    document.addEventListener('click', function (e) {
        const openBtn = e.target.closest('[data-action="open-post-modal"]');
        const closeBtn = e.target.closest('[data-action="close-post-modal"]');
        const prevBtn = e.target.closest('[data-action="post-prev-step"]');
        const submitBtn = e.target.closest('[data-action="submit-post"]');
        const categoryBtn = e.target.closest('.new-category-card');

        if (openBtn) {
            e.preventDefault();
            openPostModal();
            return;
        }

        if (closeBtn) {
            e.preventDefault();
            closePostModal();
            return;
        }

        if (prevBtn) {
            e.preventDefault();
            prevStep();
            return;
        }

        if (submitBtn) {
            e.preventDefault();
            submitPost();
            return;
        }

        if (categoryBtn) {
            e.preventDefault();

            // Remove selection from all category cards
            document.querySelectorAll('.new-category-card').forEach(b => {
                b.classList.remove('selected');
                b.setAttribute('aria-pressed', 'false');
            });

            // Add selection to clicked card
            categoryBtn.classList.add('selected');
            categoryBtn.setAttribute('aria-pressed', 'true');

            currentPostType = categoryBtn.dataset.type;
            currentCategory = categoryBtn.dataset.category;

            const labelElement = categoryBtn.querySelector('span');
            const categoryLabel = labelElement?.textContent?.trim() || currentCategory || 'Item';
            
            const titleEl = document.getElementById('newFormTitle');
            if (titleEl) {
                titleEl.textContent = `Post ${categoryLabel}`;
            }

            const saleFields = document.getElementById('newSaleFields');
            const serviceFields = document.getElementById('newServiceFields');

            if (currentPostType === 'sale') {
                if (saleFields) {
                    saleFields.style.display = 'block';
                }
                if (serviceFields) {
                    serviceFields.style.display = 'none';
                }
            } else if (currentPostType === 'service') {
                if (saleFields) {
                    saleFields.style.display = 'none';
                }
                if (serviceFields) {
                    serviceFields.style.display = 'block';
                }
            }

            setTimeout(() => {
                goToFormStep();
            }, 160);

            return;
        }
    });

    // Handle overlay clicks to close modal
    const overlay = document.querySelector('.new-post-overlay');
    if (overlay) {
        overlay.addEventListener('click', closePostModal);
    }

    try {
        setupImagePreview('newPostImages', 'newPostImagePreview');
    } catch (err) {
        console.warn('Image preview setup failed:', err);
    }
}

function openPostModal() {
    if (!state.currentUser || !state.profile) {
        authOpen('signin');
        return;
    }

    const modal = document.getElementById('newPostModal');
    if (modal) {
        modal.classList.add('active');
        resetPostForm();

        trackEvent('post_modal_open', {
            source: 'fab'
        });
    }
}

function closePostModal() {
    const modal = document.getElementById('newPostModal');
    if (modal) {
        modal.classList.remove('active');
        resetPostForm();
    }
}

function resetPostForm() {
    currentStep = 1;
    currentPostType = null;
    currentCategory = null;
    clearSelectedImages();

    const step1 = document.getElementById('newPostStep1');
    const step2 = document.getElementById('newPostStep2');
    const formActions = document.getElementById('newFormActions');

    if (step1) step1.classList.add('active');
    if (step2) step2.classList.remove('active');
    if (formActions) {
        formActions.classList.remove('active');
        formActions.style.display = 'none';
    }

    // Remove selection from all category cards
    document.querySelectorAll('.new-category-card').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
    });

    const saleFields = document.getElementById('newSaleFields');
    const serviceFields = document.getElementById('newServiceFields');

    if (saleFields) saleFields.style.display = 'none';
    if (serviceFields) serviceFields.style.display = 'none';

    // Clear all form fields
    const fields = [
        'newPostTitle', 'newPostCountry', 'newPostCity', 'newPostPrice',
        'newPostServiceDesc', 'newPostBusinessName', 'newPostServiceAddress', 
        'newPostServiceHours', 'newPostServiceAreas',
        'newPostDescription', 'newPostContactOverride', 'newPostImages'
    ];

    fields.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        if (el.tagName === 'SELECT') el.selectedIndex = 0;
        else if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
        else el.value = '';
    });

    const currency = document.getElementById('newPostCurrency');
    if (currency) currency.value = 'USD';

    // Clear image preview
    const imagePreview = document.getElementById('newPostImagePreview');
    if (imagePreview) imagePreview.innerHTML = '';

    // Reset submit button
    const submitBtn = document.querySelector('[data-action="submit-post"]');
    if (submitBtn) {
        submitBtn.textContent = 'Post to Marketplace';
        delete submitBtn.dataset.editId;
    }
}

function goToFormStep() {
    if (!currentPostType || !currentCategory) {
        showToast('Please select a category', 'error');
        return;
    }

    currentStep = 2;

    const step1 = document.getElementById('newPostStep1');
    const step2 = document.getElementById('newPostStep2');
    const formActions = document.getElementById('newFormActions');

    if (step1) step1.classList.remove('active');
    if (step2) step2.classList.add('active');
    if (formActions) {
        formActions.classList.add('active');
        formActions.style.display = 'flex';
    }
}

function prevStep() {
    if (currentStep === 2) {
        currentStep = 1;

        const step1 = document.getElementById('newPostStep1');
        const step2 = document.getElementById('newPostStep2');
        const formActions = document.getElementById('newFormActions');

        if (step1) step1.classList.add('active');
        if (step2) step2.classList.remove('active');
        if (formActions) {
            formActions.classList.remove('active');
            formActions.style.display = 'none';
        }
    }
}

function fillCountrySelect() {
    const select = document.getElementById('newPostCountry');
    if (!select) {
        console.warn('⚠️ newPostCountry select not available');
        return;
    }

    const countriesData = getCountries();

    if (!countriesData || countriesData.length === 0) {
        console.warn('⚠️ countries data not available yet, retrying...');
        setTimeout(fillCountrySelect, 100);
        return;
    }

    select.innerHTML = '<option value="">Select country</option>';

    countriesData.forEach(country => {
        const option = document.createElement('option');
        option.value = country;
        option.textContent = country;
        select.appendChild(option);
    });

    console.log('✅ Filled country select with', countriesData.length, 'countries');
}

async function submitPost() {
    // Check if we're editing FIRST
    const submitBtn = document.querySelector('[data-action="submit-post"]');
    const editId = submitBtn?.dataset.editId;
    
    // Show appropriate loading message
    const loadingMessage = editId ? 'Updating item...' : 'Posting to marketplace...';
    showLoading(loadingMessage);

    // FORCE browser to paint the spinner NOW
    document.body.offsetHeight;

    if (!currentPostType || !currentCategory) {
        showToast('Please select a valid category', 'error');
        return;
    }

    const title = document.getElementById('newPostTitle')?.value.trim();
    const country = document.getElementById('newPostCountry')?.value;
    const city = document.getElementById('newPostCity')?.value.trim();
    
    if (!title || title.length < 3) {
        showToast('Please enter a title (min 3 characters)', 'error');
        return;
    }

    if (!country) {
        showToast('Please select a country', 'error');
        return;
    }

    if (!city || city.length < 2) {
        showToast('Please enter a valid city', 'error');
        return;
    }

    if (currentPostType === 'sale') {
        const priceEl = document.getElementById('newPostPrice');
        const price = Number(priceEl?.value || 0);
        if (price <= 0) {
            showToast('Please enter a valid price', 'error');
            return;
        }
    }

    if (currentPostType === 'service') {
        const serviceDescEl = document.getElementById('newPostServiceDesc');
        const serviceDesc = serviceDescEl?.value.trim() || '';
        if (serviceDesc.length < 10) {
            showToast('Please provide a detailed service description (min 10 characters)', 'error');
            return;
        }
    }

    const contactOverride = document.getElementById('newPostContactOverride')?.value.trim();
    
    let contact;
    if (contactOverride) {
        if (contactOverride.length < 3) {
            showToast('Contact override must be at least 3 characters', 'error');
            return;
        }
        contact = {
            name: state.profile?.name || 'Contact',
            phone: contactOverride,
            email: '',
            web: state.profile?.web || ''
        };
    } else {
        contact = contactFromProfile();
    }
    
    const hasValidContact = (contact.phone && contact.phone.trim().length > 0) ||
                           (contact.email && contact.email.trim().length > 0);
    
    if (!hasValidContact) {
        showToast('Please add contact info in My Account or provide a contact override', 'error');
        return;
    }
    
    let uploadedImages = [];
    try {
        const selectedImages = getSelectedImages();

        if (selectedImages.length > 0) {
            try {
                uploadedImages = await handleImageUpload(selectedImages);
                if (!uploadedImages || uploadedImages.length === 0) {
                    hideLoading();
                    showToast('Image upload failed or was cancelled', 'warning');
                    return;
                }
            } catch (uploadError) {
                console.error('Image upload error:', uploadError);
                hideLoading();
                showToast('Failed to upload images. Please try again.', 'error');
                return;
            }
        }
        
        const item = {
            id: editId || uid(),
            type: currentPostType,
            category: currentCategory,
            title,
            country,
            city,
            contact,
            owner: ownerKey(),
            postedAt: Date.now(),
            images: uploadedImages.length > 0 ? uploadedImages : []
        };

        if (currentPostType === 'sale') {
            item.price = Number(document.getElementById('newPostPrice')?.value || 0);
            item.currency = document.getElementById('newPostCurrency')?.value || 'USD';
            
            const saleDesc = document.getElementById('newPostDescription')?.value.trim();
            if (saleDesc) {
                item.description = saleDesc;
            }
        } else if (currentPostType === 'service') {
            item.serviceDescription = document.getElementById('newPostServiceDesc')?.value.trim() || '';
            
            const businessName = document.getElementById('newPostBusinessName')?.value.trim();
            if (businessName) {
                item.businessName = businessName;
            }
            
            const serviceAddress = document.getElementById('newPostServiceAddress')?.value.trim();
            if (serviceAddress) {
                item.serviceAddress = serviceAddress;
            }
            
            const serviceHours = document.getElementById('newPostServiceHours')?.value.trim();
            if (serviceHours) {
                item.serviceHours = serviceHours;
            }

            const serviceAreas = document.getElementById('newPostServiceAreas')?.value.trim();
            if (serviceAreas) {
                item.serviceAreas = serviceAreas;
            }
        }

        await setDoc(doc(db, 'sales', item.id), item);

        if (!Array.isArray(state.sales)) state.sales = [];
        
        if (editId) {
            const index = state.sales.findIndex(s => s.id === editId);
            if (index !== -1) state.sales[index] = item;
            showToast('Updated successfully!', 'success');
        } else {
            state.sales.unshift(item);
            showToast('Posted to marketplace successfully!', 'success');
        }

        if (typeof renderSales === 'function') renderSales();
        if (typeof renderMine === 'function') renderMine();

        trackEvent('marketplace_post', {
            type: currentPostType,
            category: currentCategory,
            has_images: uploadedImages.length > 0,
            image_count: uploadedImages.length
        });

    } catch (error) {
        console.error('Error posting to marketplace:', error);

        let errorMessage = 'Failed to post. Please try again.';
        if (error?.code === 'permission-denied') {
            errorMessage = 'Permission denied. Please sign in again.';
        } else if (error?.code === 'unavailable') {
            errorMessage = 'Network error. Please check your connection.';
        }

        showToast(errorMessage, 'error');

        trackEvent('marketplace_post_error', {
            error: error?.message || String(error),
            code: error?.code || 'unknown'
        });
    } finally {
    hideLoading();
    closePostModal();
}
}

export function editMarketplaceItem(itemId) {
    console.log('🔍 editMarketplaceItem called with ID:', itemId);
    
    const item = state.sales.find(s => s.id === itemId);
    if (!item) {
        console.error('❌ Item not found in state.sales');
        showToast('Item not found', 'error');
        return;
    }
    
    console.log('✅ Item found:', item);
    
    if (!state.currentUser || !state.profile) {
        authOpen('signin');
        return;
    }
    
    openPostModal();
    
    showLoading('Loading item for editing...');
    
    setTimeout(() => {
        try {
            currentPostType = item.type || 'sale';
            currentCategory = item.category || 'trucks';
            
            const categoryBtn = document.querySelector(
                `.new-category-card[data-type="${currentPostType}"][data-category="${currentCategory}"]`
            );
            
            if (categoryBtn) {
                document.querySelectorAll('.new-category-card').forEach(b => {
                    b.classList.remove('selected');
                    b.setAttribute('aria-pressed', 'false');
                });
                
                categoryBtn.classList.add('selected');
                categoryBtn.setAttribute('aria-pressed', 'true');
            }
            
            const saleFields = document.getElementById('newSaleFields');
            const serviceFields = document.getElementById('newServiceFields');
            
            if (currentPostType === 'sale') {
                if (saleFields) saleFields.style.display = 'block';
                if (serviceFields) serviceFields.style.display = 'none';
            } else if (currentPostType === 'service') {
                if (serviceFields) serviceFields.style.display = 'block';
                if (saleFields) saleFields.style.display = 'none';
            }
            
            goToFormStep();
            
            document.getElementById('newPostTitle').value = item.title || '';
            document.getElementById('newPostCountry').value = item.country || '';
            document.getElementById('newPostCity').value = item.city || '';
            
            if (currentPostType === 'sale') {
                document.getElementById('newPostPrice').value = item.price || '';
                document.getElementById('newPostCurrency').value = item.currency || 'USD';
                const descEl = document.getElementById('newPostDescription');
                if (descEl) descEl.value = item.description || '';
            } else if (currentPostType === 'service') {
                document.getElementById('newPostServiceDesc').value = item.serviceDescription || '';
                const businessNameEl = document.getElementById('newPostBusinessName');
                if (businessNameEl) businessNameEl.value = item.businessName || '';
                const addressEl = document.getElementById('newPostServiceAddress');
                if (addressEl) addressEl.value = item.serviceAddress || '';
                const hoursEl = document.getElementById('newPostServiceHours');
                if (hoursEl) hoursEl.value = item.serviceHours || '';
                const areasEl = document.getElementById('newPostServiceAreas');
                if (areasEl) areasEl.value = item.serviceAreas || '';
            }
            
            const titleEl = document.getElementById('newFormTitle');
            if (titleEl) {
                titleEl.textContent = `Edit ${currentCategory}`;
            }
            
            const submitBtn = document.querySelector('[data-action="submit-post"]');
            if (submitBtn) {
                submitBtn.textContent = 'Update Post';
                submitBtn.dataset.editId = itemId;
            }
            
            hideLoading();
            showToast('Editing item. Update and save.', 'success');
            
        } catch (error) {
            console.error('❌ Error loading edit form:', error);
            hideLoading();
            showToast('Error loading edit form: ' + error.message, 'error');
        }
    }, 400);
}

function contactFromProfile() {
    return {
        name: state.profile?.name || '',
        phone: state.profile?.phone || '',
        email: state.profile?.email || '',
        web: state.profile?.web || ''
    };
}

function initializeWhenReady(retries = 30) {
    const countriesData = getCountries();
    if (countriesData?.length > 0) {
        initMarketplacePosting();
    } else if (retries > 0) {
        setTimeout(() => initializeWhenReady(retries - 1), 100);
    } else {
        console.warn('⚠️ Countries timeout, using fallback');
        initMarketplacePosting();
    }
}

initializeWhenReady();