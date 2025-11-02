// ===========================================
// sales.js
// ===========================================
// Handles truck/trailer sales listings:
// - Rendering sales list with filters
// - Posting new trucks/trailers
// - Editing existing sales
// - Reposting sales
// - Deleting sales
// ===========================================
// Exports: renderSales, postSale, editSale, repostSale, saleShareText, clearSaleForm
// ===========================================

// Add this line to the imports section at the TOP
// Add this to imports
import { skeletonLoader } from './skeleton-loader.js';
import { lazyImageLoader } from './lazy-loading.js';
import { trackEvent } from './firebase-config.js';
import { doc, setDoc, updateDoc, deleteDoc } from './firebase-config.js';
import { db, state, uid, ownerKey, pagination } from './main.js';
import { showToast, goto, fmtMoney, escapeHtml, copyText, openContact, contactLine, showLoading, hideLoading, setLoadingError, setProgress } from './ui.js';
import { authOpen } from './auth.js';
import { renderMine } from './profile.js';
import { renderHome } from './main.js';
import { 
    compressImage, 
    placeholderImage, 
    setupImagePreview, 
    createImageModal, 
    getSelectedImages, 
    clearSelectedImages,
    handleImageUpload,
    setModalImages
} from './images.js';
import { applySaleFilters } from './filters.js';

// =========================
// Sales (with pictures)
// =========================

export function renderSales() {
    const listEl = document.getElementById('salesList');
    listEl.innerHTML = '';
    
    // Show skeletons if no data or very little data
    if (state.sales.length === 0) {
        listEl.innerHTML = `
            <div class="card">
                <h2 style="margin:0 0 12px 0;font-size:1.05rem">Trucks & Sales Listings</h2>
                ${skeletonLoader.createSaleSkeleton(2)}
            </div>
        `;
        return;
    }
    
    // Apply filters BEFORE pagination
    let filteredSales = applySaleFilters(state.sales);
    
    // ✅ FIX: Use pagination state instead of hardcoded limits
    const displayCount = Math.min(filteredSales.length, pagination.sales.displayed);
    const totalCount = filteredSales.length;
    
    let list = filteredSales.slice(0, pagination.sales.displayed);
    
    const empty = document.getElementById('emptySales');
    empty.style.display = list.length ? 'none' : 'block';
    
    list.forEach(s => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Handle backward compatibility: convert single image to array
        const images = Array.isArray(s.images) ? s.images : (s.image ? [s.image] : [placeholderImage(s.title)]);
        
        card.innerHTML = `
            <div class="sale-card">
                <div class="sale-image-gallery" data-sale-id="${s.id}">
                    <!-- Show only 1 image with side navigation -->
                    <img src="${images[0]}" alt="${escapeHtml(s.title)}" 
                         onclick="trackImageClick('${s.id}', 0); openImageModal('${s.id}', 0)" />
                    
                    ${images.length > 1 ? `
                    <div class="gallery-controls-side">
                        <button class="gallery-btn-side" onclick="trackGalleryNav('${s.id}', -1); navGallerySide('${s.id}', -1)">‹</button>
                        <div class="image-counter-side">1 of ${images.length}</div>
                        <button class="gallery-btn-side" onclick="trackGalleryNav('${s.id}', 1); navGallerySide('${s.id}', 1)">›</button>
                    </div>
                    ` : ''}
                </div>
                
                <div class="sale-details">
                    <div class="between">
                        <strong class="sale-title">${escapeHtml(s.title)}</strong>
                        <span class="price">${fmtMoney(s.price || 0, s.currency || 'USD')}</span>
                    </div>
                    <div class="muted mt6 sale-location">${escapeHtml(s.city)}, ${escapeHtml(s.country)}</div>
                    <div class="muted mt6 sale-description">${escapeHtml(s.details || '')}</div>
                    <div class="actions mt8">
                        <button class="btn secondary small" data-act="contact">Contact</button>
                        <button class="btn secondary small" data-act="copy">Copy</button>
                    </div>
                </div>
            </div>
        `;

        // ✅ FIX: Move these lines inside the loop so "card" is defined
        card.setAttribute('data-sale-id', s.id);
        if (window.selectedSaleId === s.id) {
            card.classList.add('highlight-sale');
            // Clear the selection after applying
            setTimeout(() => {
                window.selectedSaleId = null;
            }, 100);
        }
        
        // Contact button
        card.querySelector('[data-act="contact"]').addEventListener('click', () => {
            trackEvent('contact_click', {
                item_type: 'sale',
                item_id: s.id,
                price: s.price,
                currency: s.currency || 'USD',
                has_images: (s.images && s.images.length > 0) || !!s.image
            });
            openContact(s.contact);
        });

        // Copy button
        card.querySelector('[data-act="copy"]').addEventListener('click', () => {
            copyText(saleShareText(s));
            trackEvent('share', {
                item_type: 'sale',
                item_id: s.id,
                method: 'copy',
                price: s.price,
                currency: s.currency || 'USD'
            });
            showToast('Copied to clipboard', 'success');
        });
        
        listEl.appendChild(card);
    });
    
    // ✅ LAZY LOADING: Only apply to initial load, not "Load More"
    setTimeout(() => {
        if (pagination.sales.displayed === pagination.sales.limit) {
            // This is the initial page load - use lazy loading
            console.log('🔸 Initial load - applying lazy loading');
            lazyImageLoader.setupContainer(listEl);
        } else {
            // This is "Load More" - let images load normally (no lazy loading)
            console.log('🔸 Load more - loading images normally');
            // No lazy loading applied = no flashing!
        }
    }, 100);
    
    // Add both pagination buttons
    addSimplePaginationButtons('sales', displayCount, totalCount, pagination.sales.limit);
}
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

    const title = document.getElementById('truckTitle').value.trim();
    const country = document.getElementById('truckCountry').value;
    const city = document.getElementById('truckCity').value.trim();
    const price = Number(document.getElementById('truckPrice').value || 0);
    const details = document.getElementById('truckDetails').value.trim();
    const contactOv = document.getElementById('truckContactOverride').value.trim();

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
    const currencySelect = document.getElementById('truckCurrency');
    const otherCurrencyInput = document.getElementById('truckOtherCurrency');
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
            images: uploadedImages.length > 0 ? uploadedImages : undefined
        };

        await setDoc(doc(db, 'sales', item.id), item);

        if (isEdit) {
            // Update existing sale
            const index = state.sales.findIndex(s => s.id === editId);
            if (index !== -1) state.sales[index] = item;
            showToast('✅ Sale updated successfully', 'success');

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
            showToast('✅ Sale posted successfully', 'success');

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
    ['truckTitle','truckCity','truckPrice','truckDetails','truckContactOverride'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    
    // Reset currency
    const currencySelect = document.getElementById('truckCurrency');
    if (currencySelect) currencySelect.value = 'USD';
    
    const otherCurrencyInput = document.getElementById('truckOtherCurrency');
    if (otherCurrencyInput) {
        otherCurrencyInput.style.display = 'none';
        otherCurrencyInput.value = '';
    }
    
    // Clear selected images
    clearSelectedImages();
}

export function saleShareText(s) {
    const priceDisplay = fmtMoney(s.price || 0, s.currency || 'USD');
    return `FOR SALE: ${s.title}
Location: ${s.city}, ${s.country}
Price: ${priceDisplay}
Details: ${s.details || '—'}
Contact: ${contactLine(s.contact)}
Posted via AppLoads`;
}

function contactFromProfile() {
    return {
        name: state.profile?.name || '',
        phone: state.profile?.phone || '',
        email: state.profile?.email || '',
        web: state.profile?.web || ''
    };
}

export function editSale(saleId) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    // Navigate to post section
    goto('post');
    
    showLoading('Loading edit form...');
    
    // Fill form with existing data
    setTimeout(() => {
        try {
            hideLoading(); // Hide loading once form is ready
        
        document.getElementById('truckTitle').value = sale.title || '';
        document.getElementById('truckCountry').value = sale.country || '';
        document.getElementById('truckCity').value = sale.city || '';
        document.getElementById('truckPrice').value = sale.price || '';
        document.getElementById('truckDetails').value = sale.details || '';
        document.getElementById('truckContactOverride').value = '';
        
        // Set currency
        const currencySelect = document.getElementById('truckCurrency');
        const otherCurrencyInput = document.getElementById('truckOtherCurrency');
        if (currencySelect) {
            const isStandardCurrency = ['USD', 'ZAR', 'BWP', 'ZWL', 'ZMW', 'MWK', 'TZS'].includes(sale.currency);
            if (isStandardCurrency) {
                currencySelect.value = sale.currency || 'USD';
                otherCurrencyInput.style.display = 'none';
            } else {
                currencySelect.value = 'Other';
                otherCurrencyInput.style.display = 'block';
                otherCurrencyInput.value = sale.currency || '';
            }
        }
        
        // Set images for editing
        const images = Array.isArray(sale.images) ? sale.images : (sale.image ? [sale.image] : []);
        setModalImages(images);
        
        // Change button text and store edit ID
        const submitBtn = document.querySelector('[data-action="submit-truck"]');
        submitBtn.textContent = 'Update Sale';
        submitBtn.dataset.editId = saleId;
        
             } catch (error) {
            console.error('Error loading sale edit form:', error);
            hideLoading();
            showToast('Error loading edit form', 'error');
        }
    }, 100);
}

export async function repostSale(saleId) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) {
        showToast('Sale not found', 'error');
        return;
    }
    
    if (!confirm('Repost this sale with a new timestamp?')) return;
    
    // Track repost attempt
    trackEvent('repost_sale_attempt', {
        sale_id: saleId
    });
    
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
        
        showToast('✅ Sale reposted successfully', 'success');
        renderSales();
        renderMine();
    } catch (e) {
        console.error('Error reposting sale:', e);
        showToast('Error reposting sale', 'error');
    }
}

// =========================
// Image Gallery Functions
// =========================
window.trackImageClick = function(saleId, index) {
    trackEvent('image_click', {
        item_type: 'sale',
        item_id: saleId,
        image_index: index
    });
};

window.trackGalleryNav = function(saleId, direction) {
    trackEvent('gallery_navigate', {
        item_type: 'sale',
        item_id: saleId,
        direction: direction > 0 ? 'next' : 'prev'
    });
};

window.navGallerySide = function(saleId, dir) {
    const gallery = document.querySelector(`[data-sale-id="${saleId}"]`);
    if (!gallery) return;
    
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return;
    
    const images = Array.isArray(sale.images) ? sale.images : (sale.image ? [sale.image] : []);
    const currentIndex = parseInt(gallery.querySelector('.image-counter-side').textContent.split(' of ')[0]) - 1;
    let newIndex = currentIndex + dir;
    
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;
    
    gallery.querySelector('img').src = images[newIndex];
    gallery.querySelector('.image-counter-side').textContent = `${newIndex + 1} of ${images.length}`;
};

window.openImageModal = function(saleId, startIndex) {
    const sale = state.sales.find(s => s.id === saleId);
    if (!sale) return;
    
    const images = Array.isArray(sale.images) ? sale.images : (sale.image ? [sale.image] : []);
    
    // ✅ FIX: Set modal images and open the modal
    setModalImages(images, startIndex);
    
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImage');
    const counter = document.querySelector('.modal-counter');
    
    if (modal && modalImg && counter) {
        modalImg.src = images[startIndex];
        counter.textContent = `${startIndex + 1} of ${images.length}`;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Track modal opening
        trackEvent('image_modal_open', {
            item_type: 'sale',
            item_id: saleId,
            image_index: startIndex,
            total_images: images.length
        });
    }
};

// =========================
// Pagination Helper
// =========================
function addSimplePaginationButtons(type, displayedCount, totalCount, limit) {
    const container = document.createElement('div');
    container.className = 'pagination-container';

    // Load More Button
    if (displayedCount < totalCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'pagination-btn';
        loadMoreBtn.textContent = `Load ${displayedCount}/${totalCount}`;
        loadMoreBtn.addEventListener('click', () => {
            if (type === 'sales') {
                pagination.sales.displayed += limit;
                renderSales();
            } else {
                pagination.loads.displayed += pagination.loads.limit;
                renderLoads();
            }
        });
        container.appendChild(loadMoreBtn);
    }

    // Back to Top Button
    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'pagination-btn';
    backToTopBtn.textContent = 'Back to Top';
    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    container.appendChild(backToTopBtn);

    // Append to appropriate list
    if (type === 'sales') {
        document.getElementById('salesList').appendChild(container);
    } else {
        document.getElementById('loadsList').appendChild(container);
    }
}

