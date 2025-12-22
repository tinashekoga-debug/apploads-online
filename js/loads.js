// ===========================================
// loads.js (ORCHESTRATOR)
// ===========================================
// Main orchestrator for loads functionality
// Re-exports all loads-related functions for backward compatibility
// ===========================================
// Exports: renderLoads, postLoad, editLoad, repostLoad, loadShareText, clearPostForm
// ===========================================

// Re-export everything from the new modular files
export * from './load-posts.js';
export * from './load-posting.js';

// Note: This file maintains 100% backward compatibility
// All existing imports of loads.js will continue to work without changes