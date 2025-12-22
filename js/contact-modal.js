// =========================
// CONTACT MODAL MODULE
// =========================

import { trackEvent } from './firebase-config.js';
import { state } from './main.js';
import { ownerRatingFor } from './ratings.js';
import { escapeHtml } from './ui.js'; 
import { ownerIdFromItem } from './ratings.js';
import { showToast } from './ui.js';

// Needed inside UI
import { closePopup } from './ui.js';

function contactKey(c) {
    return (c?.email || c?.phone || c?.name || '').toString().trim().toLowerCase();
}

export function contactLine(c) {
    const parts = [];
    if (c.phone) parts.push(c.phone);
    if (c.email) parts.push(c.email);
    if (c.web) parts.push(c.web);
    return parts.join(' | ');
}

export function openContact(c, ownerIdPassed) {
    const body = document.getElementById('popupBody');
    const ownerId = ownerIdPassed || contactKey(c);

    trackEvent('contact_popup_open', {
        contact_name: c.name || 'Unknown',
        has_phone: !!c.phone,
        has_email: !!c.email,
        has_website: !!c.web
    });

    const ownerRat = ownerRatingFor(ownerId);
    const ownerLoads = state.loads.filter(l => ownerIdFromItem(l) === ownerId);
    const ownerSales = state.sales.filter(s => ownerIdFromItem(s) === ownerId);
    const totalOtherPosts = ownerLoads.length + ownerSales.length - 1;

        const waButton = c.phone ? `
<div style="margin-bottom: 12px;">
  <a href="https://wa.me/${encodeURIComponent((c.phone || '').replace(/[^\d+]/g, ''))}"
     target="_blank"
     class="whatsapp-btn">

    <svg
      class="wa-icon"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false">
      <path fill="#25D366" d="M16 0C7.163 0 0 7.163 0 16c0 2.82.736 5.573 2.133 8.005L0 32l8.223-2.09A15.9 15.9 0 0 0 16 32c8.837 0 16-7.163 16-16S24.837 0 16 0z"/>
      <path fill="#fff" d="M24.684 19.874c-.368-.184-2.176-1.072-2.512-1.192-.336-.12-.58-.184-.824.184-.244.368-.948 1.192-1.164 1.436-.216.244-.432.276-.8.092-.368-.184-1.556-.572-2.964-1.824-1.096-.976-1.836-2.18-2.052-2.548-.216-.368-.024-.568.16-.752.164-.164.368-.432.552-.648.184-.216.244-.368.368-.612.124-.244.06-.46-.032-.644-.092-.184-.824-1.984-1.128-2.716-.296-.712-.596-.616-.824-.628l-.704-.012c-.244 0-.644.092-.98.46-.336.368-1.288 1.256-1.288 3.064 0 1.808 1.32 3.556 1.504 3.8.184.244 2.6 3.968 6.3 5.56.88.38 1.568.608 2.104.78.884.28 1.688.24 2.324.148.708-.104 2.176-.888 2.484-1.744.308-.856.308-1.592.216-1.744-.092-.152-.336-.244-.704-.428z"/>
    </svg>

    WhatsApp
  </a>
</div>
` : '';

    const tel = c.phone ? `<div style="margin-bottom: 8px;">📞 <a href="tel:${c.phone}" style="color: #0b7d62;">${c.phone}</a></div>` : '';
    const em = c.email ? `<div style="margin-bottom: 8px;">✉️ <a href="mailto:${c.email}" style="color: #0b7d62;">${c.email}</a></div>` : '';
    const web = c.web ? `<div style="margin-bottom: 8px;">🌐 <a href="${c.web}" target="_blank" style="color: #0b7d62;">${c.web}</a></div>` : '';

    const otherPostsButton = totalOtherPosts > 0 ? `
        <div style="margin: 16px 0 12px 0; padding-top: 12px; border-top: 1px solid #eee;">
            <button onclick="viewOtherPosts('${ownerId}', ${JSON.stringify(c).replace(/"/g, '&quot;')})"
                    style="width: 100%; padding: 10px 16px; background: #f8f9fa;
                           border: 1px solid #ddd; border-radius: 8px; color: #0b7d62;">
                Other Posts by Owner (${totalOtherPosts})
            </button>
        </div>` : '';

    body.innerHTML = `
        <div style="margin-bottom: 16px;">
            <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600;">${escapeHtml(c.name || 'Contact')}</p>
            <div style="color: #666; font-size: 14px;">
                ⭐ Rating: <strong>${ownerRat.count ? ownerRat.avg.toFixed(1) : '—'}</strong>
                ${ownerRat.count ? ' ('+ownerRat.count+')' : ''}
            </div>
        </div>
        ${waButton}
        <div style="margin-bottom: 16px;">
            ${tel} ${em} ${web}
        </div>
        ${otherPostsButton}
    `;

    document.getElementById('popup').style.display = 'flex';

    // Store for back-button (Other Posts → Contact)
    window.currentPopupContact = c;
}

export function goBackToContact() {
    const popupBody = document.getElementById('popupBody');
    if (!popupBody) {
        closePopup();
        return;
    }

    if (window.currentContactForOtherPosts && window.currentOwnerIdForOtherPosts) {
        openContact(window.currentContactForOtherPosts, window.currentOwnerIdForOtherPosts);
    } else {
        closePopup();
    }
}

// =========================
// Expose globally for onclick handlers
// =========================
window.goBackToContact = goBackToContact;
window.openContact = openContact;