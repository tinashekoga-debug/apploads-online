// =========================
// OTHER POSTS MODAL MODULE
// =========================

import { state } from './main.js';
import { ownerIdFromItem, loadRatingFor } from './ratings.js';
import { escapeHtml, fmtMoney } from './ui.js';
import { trackEvent } from './firebase-config.js';
import { goToSpecificLoad } from './goto-load.js';
import { goToSpecificListing } from './goto-marketplace.js';
import { showToast } from './ui.js';

export function viewOtherPosts(ownerId, currentContact = null) {
    const popup = document.getElementById('popup');
    const popupBody = document.getElementById('popupBody');

    if (!popup || !popupBody) {
        showToast('Popup not available', 'error');
        return;
    }

    popup.style.display = 'flex';
    trackEvent('view_other_posts', {
        owner_id: ownerId,
        contact_name: currentContact?.name || 'Unknown'
    });

    const ownerLoads = state.loads.filter(l => ownerIdFromItem(l) === ownerId);
    const ownerSales = state.sales.filter(s => ownerIdFromItem(s) === ownerId);

    if (ownerLoads.length === 0 && ownerSales.length === 0) {
        popupBody.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p>No other posts found for this owner.</p>
                <button class="btn" onclick="goBackToContact()" style="margin-top: 12px;">Contact</button>
            </div>
        `;
        return;
    }

    window.currentOwnerIdForOtherPosts = ownerId;
    window.currentContactForOtherPosts = currentContact;

    popupBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; justify-content: center;">
                <div style="width: 40px; display: flex; align-items: center; justify-content: center;">
                    <button onclick="goBackToContact()" 
                            style="background: none; border: none; cursor: pointer; padding: 8px; display: flex; align-items: center; justify-content: center;">
                        <svg width="26" height="26" fill="none" stroke="#0b7d62" stroke-width="2.4">
                            <path d="M19 12H5M12 19l-7-7 7-7"/>
                        </svg>
                    </button>
                </div>
                <div style="flex: 1; display: flex; align-items: center; justify-content: center;">
                    <h3 style="margin: 0; font-size: 18px; font-weight: 700; line-height: 1;">Other Posts by Owner</h3>
                </div>
                <div style="width: 40px;"></div>
            </div>
            <div style="border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-top: 5px;"></div>
        </div>

        <div style="max-height: 400px; overflow-y: auto;">
            ${ownerLoads.map(load => {
                const rat = loadRatingFor(load.id);
                return `
                <div class="card" style="margin-bottom: 8px; cursor: pointer;"
                     onclick="goToSpecificLoad('${load.id}')">
                    <div class="between">
                        <div style="flex: 1;">
                            <strong>${escapeHtml(load.cargo)}</strong>
                            <div class="muted">${escapeHtml(load.originCity)} → ${escapeHtml(load.destCity)}</div>
                            <div class="muted" style="font-size: 12px;">
                                ⭐ ${rat.count ? rat.avg.toFixed(1) : '—'}${rat.count ? ' ('+rat.count+')' : ''}
                            </div>
                        </div>
                        <span class="price">${fmtMoney(load.price || 0, load.currency || 'USD', load.pricingType || 'total')}</span>
                    </div>
                </div>`;
            }).join('')}

            ${ownerSales.map(sale => `
                <div class="card" style="margin-bottom: 8px; cursor: pointer;"
                     onclick="goToSpecificListing('${sale.id}')">
                    <div class="between">
                        <div style="flex: 1;">
                            <strong>${escapeHtml(sale.title)}</strong>
                            <div class="muted">${escapeHtml(sale.city)}, ${escapeHtml(sale.country)}</div>
                        </div>
                        <span class="price">${fmtMoney(sale.price || 0, sale.currency || 'USD')}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

window.viewOtherPosts = viewOtherPosts;