// =========================
// LOAD NAVIGATION MODULE
// =========================

import { goto, closePopup } from './ui.js';
import { trackEvent } from './firebase-config.js';

export function goToSpecificLoad(loadId) {
    window.selectedLoadId = loadId;
    closePopup();
    goto('loads');

    trackEvent('navigate_to_specific_load', {
        load_id: loadId,
        source: 'other_posts_popup'
    });

    setTimeout(() => {
        const el = document.querySelector(`[data-load-id="${loadId}"]`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 500);
}

window.goToSpecificLoad = goToSpecificLoad;

