// ===========================================
// skeleton-loader.js
// ===========================================
// Provides skeleton loading states for better perceived performance
// ===========================================

export const skeletonLoader = {
    createLoadSkeleton: (count = 3) => {
        return Array(count).fill().map(() => `
            <div class="card skeleton-item">
                <div class="skeleton-line" style="width: 70%; height: 20px;"></div>
                <div class="skeleton-line" style="width: 50%; height: 16px; margin-top: 12px;"></div>
                <div class="skeleton-line" style="width: 30%; height: 16px; margin-top: 8px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <div class="skeleton-chip"></div>
                    <div class="skeleton-chip" style="width: 80px;"></div>
                </div>
            </div>
        `).join('');
    },

    createSaleSkeleton: (count = 2) => {
        return Array(count).fill().map(() => `
            <div class="card skeleton-item">
                <div class="skeleton-image"></div>
                <div class="skeleton-line" style="width: 60%; height: 20px; margin-top: 12px;"></div>
                <div class="skeleton-line" style="width: 40%; height: 16px; margin-top: 8px;"></div>
                <div class="skeleton-line" style="width: 80%; height: 14px; margin-top: 8px;"></div>
                <div style="display: flex; gap: 8px; margin-top: 16px;">
                    <div class="skeleton-button"></div>
                    <div class="skeleton-button"></div>
                </div>
            </div>
        `).join('');
    },
    
    createMarketplaceSkeleton(count) {
    return Array(count).fill(0).map(() => `
        <div class="marketplace-item skeleton-item">
            <div class="skeleton-image" style="height: 140px; border-radius: 0;"></div>
            <div class="marketplace-details">
                <div class="skeleton-line" style="width: 60%; height: 20px; margin-bottom: 8px;"></div>
                <div class="skeleton-line" style="width: 90%; height: 16px; margin-bottom: 4px;"></div>
                <div class="skeleton-line" style="width: 70%; height: 14px;"></div>
            </div>
        </div>
    `).join('');
},

    createHomeSkeleton: () => {
        return `
            <div class="card">
                <h3 style="margin:0 0 8px 0;font-size:1rem">Latest Loads</h3>
                ${this.createLoadSkeleton(2)}
            </div>
            <div class="card" style="margin-top: 12px;">
                <h3 style="margin:0 0 8px 0;font-size:1rem">Latest Sales Listings</h3>
                ${this.createSaleSkeleton(1)}
            </div>
        `;
    }
};

