// ===========================================
// loads.js
// ===========================================
// Handles load posting and management:
// - Rendering the loads list with filters
// - Posting new loads
// - Editing existing loads
// - Reposting loads
// - Deleting loads
// - Load filtering (by country, search text, popularity, recency)
// ===========================================
// Exports: renderLoads, postLoad, editLoad, repostLoad, loadShareText, clearPostForm
// ===========================================

// Add this to imports
import { skeletonLoader } from './skeleton-loader.js';
import { trackEvent } from './firebase-config.js';
import { pagination } from './main.js';
import { doc, setDoc, updateDoc } from './firebase-config.js';
import { db, state, uid, ownerKey, countries } from './main.js';
import { showToast, goto, fmtMoney, escapeHtml, copyText, openContact, contactLine, showLoading, hideLoading, setLoadingError } from './ui.js';
import { loadRatingFor, ownerRatingFor, ownerIdFromItem, myVote, buildStarBar } from './ratings.js';
import { authOpen } from './auth.js';
import { renderMine } from './profile.js';
import { renderHome } from './main.js';
import { applyLoadFilters } from './filters.js';

// =========================
// Loads (browse + post) + Ratings UI
// =========================
const loadsList = document.getElementById('loadsList');
const emptyLoads = document.getElementById('emptyLoads');

export function renderLoads() {
    loadsList.innerHTML = '';
    
    // Show skeletons if no data or very little data
    if (state.loads.length === 0) {
        loadsList.innerHTML = `
            <div class="card">
                <h2 style="margin:0 0 12px 0;font-size:1.05rem">Available Loads</h2>
                ${skeletonLoader.createLoadSkeleton(3)}
            </div>
        `;
        return;
    }
    
    // Apply filters BEFORE pagination
    let filteredLoads = applyLoadFilters(state.loads, countries, ownerRatingFor, ownerIdFromItem);
    
    // Calculate display range
    const displayCount = Math.min(filteredLoads.length, pagination.loads.displayed);
    const totalCount = filteredLoads.length;
    
    let list = filteredLoads.slice(0, pagination.loads.displayed);
    
    emptyLoads.style.display = list.length ? 'none' : 'block';
    
    // Render items
    list.forEach(l => {
        loadsList.appendChild(loadItem(l));
    });
    
    // Add load more button if needed
    addPaginationButtons('loads', displayCount, totalCount);
    
    // INSERT THE SCROLLING CODE RIGHT HERE:
    // After rendering all items, scroll to highlighted load
    setTimeout(() => {
        if (window.selectedLoadId) {
            const highlightedLoad = document.querySelector(`[data-load-id="${window.selectedLoadId}"]`);
            if (highlightedLoad) {
                highlightedLoad.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Add a more prominent highlight
                highlightedLoad.classList.add('highlight-load');
                
                // Remove highlight after 4 seconds
                setTimeout(() => {
                    highlightedLoad.classList.remove('highlight-load');
                    window.selectedLoadId = null;
                }, 4000);
            }
        }
    }, 300);
}

function addPaginationButtons(type, displayedCount, totalCount) {
    const container = document.createElement('div');
    container.className = 'pagination-container';

    // Load More Button
    if (displayedCount < totalCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'pagination-btn';
        loadMoreBtn.textContent = `Load ${displayedCount}/${totalCount}`;
        loadMoreBtn.addEventListener('click', () => {
            if (type === 'loads') {
                pagination.loads.displayed += pagination.loads.limit;
                renderLoads();
            } else {
                pagination.sales.displayed += pagination.sales.limit;
                renderSales();
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
    if (type === 'loads') {
        loadsList.appendChild(container);
    } else {
        document.getElementById('salesList').appendChild(container);
    }
}

function loadItem(l) {
    const card = document.createElement('div');
    card.className = 'card';
    
    // Add data attribute for targeting
    card.setAttribute('data-load-id', l.id);
    
    // Check if this is the selected load to highlight
    if (window.selectedLoadId === l.id) {
        card.classList.add('highlight-load');
        // Clear the selection after applying
        setTimeout(() => {
            window.selectedLoadId = null;
        }, 100);
    }
    
    const d = document.createElement('details');
    d.className = 'load';
    d.open = false;
    
    const ownerId = ownerIdFromItem(l);
    const loadRat = loadRatingFor(l.id);
    const ownerRat = ownerRatingFor(ownerId);
    const ratingChip = `<span class="chip rating">⭐ ${loadRat.count ? loadRat.avg.toFixed(1) : '—'}${loadRat.count ? ' ('+loadRat.count+')' : ''}</span>`;
    
    const sum = document.createElement('summary');
    sum.innerHTML = `
        <div class="load-head">
            <div>
                <div class="load-title">${escapeHtml(l.cargo)}</div>
                <div class="load-sub">${escapeHtml(l.originCity)}, ${escapeHtml(l.originCountry)} → ${escapeHtml(l.destCity)}, ${escapeHtml(l.destCountry)}</div>
                <div class="load-meta">
                    <span class="chip terms">${escapeHtml(l.terms || '—')}</span>
                    ${l.ready ? `<span class="chip now">Ready: ${escapeHtml(l.ready)}</span>` : ''}
                    ${ratingChip}
                </div>
            </div>
            <div class="price">${fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total')}</div>
        </div>
    `;
    
    const inner = document.createElement('div');
    inner.className = 'mt10';
    inner.innerHTML = `
        <div class="muted">Posted via AppLoads</div>
        <div class="actions mt8">
            <button class="btn secondary small" data-act="contact">Contact</button>
            <button class="btn secondary small" data-act="copy">Copy</button>
        </div>
        <div class="rating-widget">
            <div class="rating-prompt">Rate this load:</div>
            <div class="mt6" data-starbar></div>
            <div class="rating-summary">
                Your rating: ${myVote(l.id) ? (myVote(l.id) + '★') : 'Not rated yet'} • 
                Owner avg: ${ownerRat.count ? ownerRat.avg.toFixed(1) + '★ (' + ownerRat.count + ')' : '—'}
            </div>
        </div>
    `;
    
    d.appendChild(sum);
    d.appendChild(inner);
    card.appendChild(d);
    
    // Interactive star bar
    const barHost = inner.querySelector('[data-starbar]');
    barHost.appendChild(buildStarBar(l.id, myVote(l.id)));
    
    // Actions
    card.querySelector('[data-act="contact"]').addEventListener('click', () => {
        trackEvent('contact_click', {
            item_type: 'load',
            item_id: l.id,
            owner_id: ownerId,
            price: l.price,
            currency: l.currency || 'USD'
        });
        openContact(l.contact, ownerId);
    });
    card.querySelector('[data-act="copy"]').addEventListener('click', () => {
        copyText(loadShareText(l));
        trackEvent('share', {
            item_type: 'load',
            item_id: l.id,
            method: 'copy'
        });
        showToast('Copied to clipboard', 'success');
    });
    
    return card;
}

// ... rest of the file remains unchanged until the clearPostForm function ...

export async function postLoad() {
    const form = document.getElementById('postLoadForm');
    const editingId = form?.dataset.editingId;
    
    // Track load posting attempt
    trackEvent('post_load_attempt', {
        is_edit: !!editingId,
        edit_id: editingId || null
    });
    
    // Show appropriate loading message for new post vs edit
    const loadingMessage = editingId ? 'Updating load...' : 'Posting load...';
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
    const contactOv = document.getElementById('contactOverride').value.trim();

    // === ADD VALIDATION ===
    if (!originCity || originCity.length < 2) {
        showToast('Please enter a valid origin city', 'error');
        return;
    }
    
    if (!destCity || destCity.length < 2) {
        showToast('Please enter a valid destination city', 'error');
        return;
    }
    
    if (!cargo || cargo.length < 3) {
        showToast('Please describe the cargo (min 3 characters)', 'error');
        return;
    }
    
    if (!price || price <= 0) {
        showToast('Please enter a valid price', 'error');
        return;
    }
    
    if (price > 1000000) {
        showToast('Price seems too high. Please verify the amount.', 'error');
        return;
    }
    // === END VALIDATION ===
    
    // Handle "Other" values
    let originCountry = originCountryEl.value;
        
        if (!oC || !oCi || !dC || !dCi || !cg || !pr) {
            showToast('Please fill all required fields', 'error');
            return;
        }
        
        try {
            const updatedLoad = {
                originCountry: oC,
                originCity: oCi,
                destCountry: dC,
                destCity: dCi,
                cargo: cg,
                price: Number(pr),
                terms: tm,
                ready: rd,
                contact: contactFromProfile(),
                owner: ownerKey()
            };
            
            await updateDoc(doc(db, 'loads', editingId), updatedLoad);
            
            const idx = state.loads.findIndex(l => l.id === editingId);
            if (idx !== -1) {
                state.loads[idx] = { ...state.loads[idx], ...updatedLoad };
            }
            
            showToast('Load updated successfully', 'success');
            
            delete form.dataset.editingId;
            const submitBtn = document.querySelector('[data-action="submit-load"]');
            if (submitBtn) submitBtn.textContent = 'Post Load';
            
            originCountryEl.value = '';
            document.getElementById('originCity').value = '';
            destCountryEl.value = '';
            document.getElementById('destCity').value = '';
            document.getElementById('cargo').value = '';
            document.getElementById('price').value = '';
            document.getElementById('terms').value = '';
            document.getElementById('ready').value = '';
            
            renderLoads();
            renderMine();
            renderHome();
            goto('account');
        } catch (e) {
            console.error('Error updating load:', e);
            showToast('Error updating load', 'error');
        }
        return;
    }
    
    if (!state.profile) {
        authOpen('signin');
        return;
    }
    
const originCity = document.getElementById('originCity').value.trim();
const destCity = document.getElementById('destCity').value.trim();
const cargo = document.getElementById('cargo').value.trim();
const price = Number(document.getElementById('price').value || 0);
const ready = document.getElementById('ready').value;
const contactOv = document.getElementById('contactOverride').value.trim();

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
        return;
    }
    
    if ((!state.profile.phone && !state.profile.email) && !contactOv) {
        showToast('Please add a contact in My Account or type a contact override.', 'error');
        return;
    }
    
    const contact = contactOv ? { name: state.profile?.name || 'Contact', phone: contactOv, email: '', web: state.profile?.web || '' } : contactFromProfile();
    
    // Check if we're editing
    const submitBtn = document.querySelector('[data-action="submit-load"]');
    const editId = submitBtn.dataset.editId;
    
const item = {
    id: editId || uid(),
    originCountry: originCountry,  // Use the variable we created
    originCity,
    destCountry: destCountry,     // Use the variable we created  
    destCity,
    cargo,
    price,
    currency: currency,
    pricingType: pricingType,
    terms: termsValue,            // Use the variable we created
    ready,
    contact,
    owner: ownerKey(),
    postedAt: editId ? (state.loads.find(l => l.id === editId)?.postedAt || Date.now()) : Date.now()
};
    
    try {
        await setDoc(doc(db, 'loads', item.id), item);
        
 if (editId) {
    // Update existing
    const index = state.loads.findIndex(l => l.id === editId);
    if (index !== -1) state.loads[index] = item;
    showToast('✅ Load updated successfully', 'success');
    
    // Track load update
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
    // Add new
    state.loads.unshift(item);
    showToast('✅ Load posted successfully', 'success');
    
    // Track successful load post
    trackEvent('post_load', {
        success: true,
        load_id: item.id,
        origin_country: item.originCountry,
        destination_country: item.destCountry,
        price: item.price,
        currency: item.currency || 'USD',
        pricing_type: item.pricingType || 'total',
        has_contact_override: !!contactOv
    });
}
        
        clearPostForm();
        // Reset button
        submitBtn.textContent = 'Post Load';
        delete submitBtn.dataset.editId;
        goto('loads');
  } catch (e) {
    console.error('Error posting load:', e);
    setLoadingError('Failed to post load');
    
    // Track failed load post
    trackEvent('post_load', {
        success: false,
        error: e.message,
        is_edit: !!editId
    });
    
    showToast('Error posting load', 'error');
} finally {
    hideLoading();
}
}

function clearPostForm() {
    ['originCity','destCity','cargo','price','ready','contactOverride'].forEach(id => {
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
}

export function loadShareText(l) {
    const priceDisplay = fmtMoney(l.price || 0, l.currency || 'USD', l.pricingType || 'total');
    return `LOAD: ${l.cargo}
Route: ${l.originCity}, ${l.originCountry} → ${l.destCity}, ${l.destCountry}
Rate: ${priceDisplay} | Terms: ${l.terms || '—'}${l.ready ? ' | Ready: '+l.ready : ''}
Contact: ${contactLine(l.contact)}
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

export function editLoad(loadId) {
    const load = state.loads.find(l => l.id === loadId);
    if (!load) {
        showToast('Load not found', 'error');
        return;
    }
    
    // Navigate to post section
    goto('post');
    
    showLoading('Loading edit form...');
    
    // Fill form with existing data
    setTimeout(() => {
        try {
            hideLoading(); // Hide loading once form is ready
            
            const originCountryEl = document.getElementById('originCountry');
            const destCountryEl = document.getElementById('destCountry');
            
            // === ADD VALIDATION FOR FORM ELEMENTS ===
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
                const isStandardCurrency = ['USD', 'ZAR', 'BWP', 'ZWL', 'ZMW', 'MWK', 'TZS'].includes(load.currency);
                if (isStandardCurrency) {
                    currencySelect.value = load.currency || 'USD';
                    otherCurrencyInput.style.display = 'none';
                } else {
                    currencySelect.value = 'Other';
                    otherCurrencyInput.style.display = 'block';
                    otherCurrencyInput.value = load.currency || '';
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
            document.getElementById('contactOverride').value = '';

            // Handle "Other" values in edit mode
            if (load.originCountry && !countries.includes(load.originCountry)) {
                originCountryEl.value = 'Other';
                document.getElementById('originCountryOther').style.display = 'block';
                document.getElementById('originCountryOther').value = load.originCountry;
            }

            if (load.destCountry && !countries.includes(load.destCountry)) {
                destCountryEl.value = 'Other';
                document.getElementById('destCountryOther').style.display = 'block';
                document.getElementById('destCountryOther').value = load.destCountry;
            }

            const standardTerms = ['Cash on Delivery','Upfront','50/50','70/30','80/20','7 Days','14 Days','30 Days'];
            if (load.terms && !standardTerms.includes(load.terms)) {
                document.getElementById('terms').value = 'Other';
                document.getElementById('termsOther').style.display = 'block';
                document.getElementById('termsOther').value = load.terms;
            }

            // Change button text and store edit ID
            const submitBtn = document.querySelector('[data-action="submit-load"]');
            submitBtn.textContent = 'Update Load';
            submitBtn.dataset.editId = loadId;
            
            showToast('Editing load. Update and save.', 'success');
        } catch (error) {
            console.error('Error loading edit form:', error);
            hideLoading();
            showToast('Error loading edit form', 'error');
        }
    }, 100);
}
    
export async function repostLoad(loadId) {
    const load = state.loads.find(l => l.id === loadId);
    if (!load) {
        showToast('Load not found', 'error');
        return;
    }
    
    if (!confirm('Repost this load with a new timestamp?')) return;
    
    // Track repost attempt
    trackEvent('repost_load_attempt', {
        load_id: loadId
    });
    
    try {
        // Create new load with same data but new ID and timestamp
        const newLoad = {
            ...load,
            id: uid(),
            postedAt: Date.now()
        };
        
       await setDoc(doc(db, 'loads', newLoad.id), newLoad);
state.loads.unshift(newLoad);

// Track successful repost
trackEvent('repost_load', {
    success: true,
    original_load_id: loadId,
    new_load_id: newLoad.id
});

showToast('✅ Load reposted successfully', 'success');
        renderLoads();
        renderMine();
    } catch (e) {
        console.error('Error reposting load:', e);
        showToast('Error reposting load', 'error');
    }
}
