// ===========================================
// popovers-templates.js
// ===========================================
// HTML templates for popover menus
// Separates rendering logic from functionality
// ===========================================
// Exports: getLoadPopoverHTML, getSalePopoverHTML
// ===========================================

// =========================
// Load Popover Template
// =========================
export function getLoadPopoverHTML() {
    return `
        <div class="popover">
            <button class="popover-item edit">Edit</button>
            <button class="popover-item mark-taken">Mark as Taken</button>
            <button class="popover-item delete">Delete</button>
        </div>
    `;
}

// =========================
// Sale Popover Template
// =========================
export function getSalePopoverHTML() {
    return `
        <div class="popover">
            <button class="popover-item edit">Edit</button>
            <button class="popover-item mark-sold">Mark as Sold</button>
            <button class="popover-item delete">Delete</button>
        </div>
    `;
}

