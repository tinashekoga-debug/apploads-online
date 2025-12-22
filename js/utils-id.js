// ===========================================
// ID UTILS (uid + ownerKey)
// Extracted safely from main.js
// ===========================================

import { state } from './main.js';

// -------------------------------------------
// Generate a unique ID string
// -------------------------------------------
export function uid() {
    return (
        Math.random().toString(36).slice(2) +
        Date.now().toString(36)
    );
}

// -------------------------------------------
// Owner key based on authenticated user
// -------------------------------------------
export function ownerKey() {
    if (state.currentUser) {
        return state.currentUser.uid;
    }

    return (
        state.profile?.email ||
        state.profile?.phone ||
        'anonymous'
    ).trim();
}

