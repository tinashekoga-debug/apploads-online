// ===========================================
// EXIT PREVENTION (Double-tap back to exit)
// Extracted safely from main.js
// ===========================================

import { showToast } from './ui.js';

let backButtonPressed = false;
let backButtonTimer = null;

// -------------------------------------------
// Call this once during DOMContentLoaded
// -------------------------------------------
export function setupExitPrevention() {
    window.addEventListener('popstate', function (e) {
        if (!backButtonPressed) {
            // First back button press
            backButtonPressed = true;
            showToast('Press back again to exit', 'warning');

            // Reset after 3 seconds
            backButtonTimer = setTimeout(() => {
                backButtonPressed = false;
            }, 3000);

            // Prevent immediate exit
            history.pushState(null, null, window.location.href);
        } else {
            // Second press: allow exit
            if (backButtonTimer) clearTimeout(backButtonTimer);
        }
    });

    // Initial push to prevent instant exit
    history.pushState(null, null, window.location.href);
}

