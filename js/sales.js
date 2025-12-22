// ===========================================
// sales.js (ORCHESTRATOR)
// ===========================================
// Main orchestrator for sales functionality
// Re-exports all sales-related functions for backward compatibility
// ===========================================
// Exports: renderSales, postSale, editSale, repostSale, saleShareText, clearSaleForm
// ===========================================

// Re-export everything from the new modular files
export * from './sales-posts.js';
export * from './sales-posting.js';

// Note: This file maintains 100% backward compatibility
// All existing imports of sales.js will continue to work without changes