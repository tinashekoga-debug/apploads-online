// ===========================================
// ADMIN HELPERS
// Extracted safely from main.js
// ===========================================

import { state } from './main.js';

// -------------------------------------------
// Fixed admin email list
// -------------------------------------------
export const ADMIN_EMAILS = [
    'tinaleinvestments@gmail.com',
    'tinashekoga@gmail.com',
    'admin@apploads-online.web.app'
];

// -------------------------------------------
// Check if active user is admin
// -------------------------------------------
export function isAdminUser() {
    if (!state || (!state.currentUser && !state.profile)) return false;

    const email = (
        state.currentUser?.email ||
        state.profile?.email ||
        ''
    ).trim().toLowerCase();

    return ADMIN_EMAILS.includes(email);
}

