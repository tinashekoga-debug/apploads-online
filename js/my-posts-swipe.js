// my-posts-swipe.js
// Handles swipe gestures and tab switching for My Posts
// Fixed to not interfere with popover interactions
// Exports: enableSwipeTabs, setupAccountTabs

import { popoverOpen } from './popovers.js';

// =========================
// Setup Account Tabs (Button Clicks)
// =========================
export function setupAccountTabs() {
    const tabBtns = document.querySelectorAll('.account-tab-btn-enhanced');
    const container = document.getElementById('myPostsContainer');

    tabBtns.forEach((btn, idx) => {
        btn.addEventListener('click', function() {
            // Sync slider animation
            const slider = document.getElementById('myPostsSlider');
            if (slider) {
                const transforms = ['0%', '-33.33%', '-66.66%'];
                slider.style.transform = `translateX(${transforms[idx]})`;
                if (container) container.dataset.currentIndex = String(idx);
            }
            
            // Update active button and tab visibility
            syncActiveButton(idx);
        });
    });
}

// =========================
// Enable Swipe Tabs (Touch Gestures)
// =========================
export function enableSwipeTabs() {
    const container = document.getElementById('myPostsContainer');
    const slider = document.getElementById('myPostsSlider');

    if (!container || !slider) return;

    let startX = 0;
    let startY = 0;
    let currentIndex = 0; // 0 = messages, 1 = loads, 2 = sales
    let isSwiping = false;
    let isVerticalScroll = false;
    
    function syncActiveButton(index) {
    const allTabs = document.querySelectorAll('.account-tab-btn-enhanced');
    
    // Remove active class from all
    allTabs.forEach(b => b.classList.remove('active'));
    
    // Update indicator dots
    document.querySelectorAll('.indicator-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
    });
    
    // Logic for showing tabs based on current section
    if (index === 0) {
        // Messages section: show Messages + My Loads
        allTabs[0].style.display = '';  // Messages
        allTabs[1].style.display = '';  // My Loads
        allTabs[2].style.display = 'none';  // Marketplace hidden
        allTabs[0].classList.add('active');  // Activate Messages
    } else if (index === 1) {
        // My Loads section: show Messages + My Loads
        allTabs[0].style.display = '';  // Messages
        allTabs[1].style.display = '';  // My Loads
        allTabs[2].style.display = 'none';  // Marketplace hidden
        allTabs[1].classList.add('active');  // Activate My Loads
    } else if (index === 2) {
        // Marketplace section: show Messages + Marketplace
        allTabs[0].style.display = '';  // Messages (always visible!)
        allTabs[1].style.display = 'none';  // My Loads hidden
        allTabs[2].style.display = '';  // Marketplace visible
        allTabs[2].classList.add('active');  // Activate Marketplace
    }
}

    container.addEventListener('touchstart', (e) => {
        if (popoverOpen) return;

        const datasetIndex = Number(container.dataset.currentIndex);
        if (!Number.isNaN(datasetIndex)) {
            currentIndex = datasetIndex;
        } else {
            const activeBtn = document.querySelector('.account-tab-btn-enhanced.active');
            if (activeBtn) {
                const target = activeBtn.getAttribute('data-target');
                currentIndex = target === 'myMessagesSection' ? 0 : target === 'myLoadsSection' ? 1 : 2;
            }
            container.dataset.currentIndex = String(currentIndex);
        }

        if (e.target.closest('.popover') || e.target.closest('.more-icon')) {
            return;
        }

        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isSwiping = false;
        isVerticalScroll = false;
    }, { passive: true });

    container.addEventListener('touchmove', (e) => {
        if (popoverOpen) return;
        if (!isSwiping && !isVerticalScroll) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = Math.abs(currentX - startX);
            const diffY = Math.abs(currentY - startY);

            if (diffX > diffY && diffX > 10) {
                isSwiping = true;
            } else if (diffY > diffX && diffY > 10) {
                isVerticalScroll = true;
            }
        }
    }, { passive: true });

    container.addEventListener('touchend', (e) => {
        if (popoverOpen) return;
        if (!isSwiping || isVerticalScroll ||
            e.target.closest('.popover') ||
            e.target.closest('.more-icon')) {
            isSwiping = false;
            isVerticalScroll = false;
            return;
        }

        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (Math.abs(diff) < 50) {
            isSwiping = false;
            isVerticalScroll = false;
            return;
        }

        const transforms = ['0%', '-33.33%', '-66.66%'];

        // Swipe left (next tab)
        if (diff > 50 && currentIndex < 2) {
            currentIndex++;
            slider.style.transform = `translateX(${transforms[currentIndex]})`;
            syncActiveButton(currentIndex);
            container.dataset.currentIndex = String(currentIndex);
        }

        // Swipe right (previous tab)
        if (diff < -50 && currentIndex > 0) {
            currentIndex--;
            slider.style.transform = `translateX(${transforms[currentIndex]})`;
            syncActiveButton(currentIndex);
            container.dataset.currentIndex = String(currentIndex);
        }

        isSwiping = false;
        isVerticalScroll = false;
    }, { passive: true });
}