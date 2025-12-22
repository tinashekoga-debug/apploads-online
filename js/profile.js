// ===========================================
// profile.js
// ===========================================
// Backward compatibility file - re-exports all profile-related functionality
// from the new modular structure
// ===========================================
// Exports: All functions from account.js, my-posts.js, and admin.js
// ===========================================

// Re-export everything from the new modular files
export * from './account.js';
export * from './my-posts.js';
export * from './admin.js';
export * from './popovers.js'; // ADD THIS LINE

// Note: This file maintains 100% backward compatibility
// All existing imports of profile.js will continue to work without changes