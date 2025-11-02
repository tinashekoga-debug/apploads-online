// ===========================================
// images.js
// ===========================================
// Handles all image-related functionality:
// - Image compression
// - Image preview management
// - Image modal for zooming
// - Placeholder image generation
// - Global image interaction tracking
// ===========================================
// Exports: compressImage, placeholderImage, setupImagePreview, createImageModal, getSelectedImages, clearSelectedImages
// ===========================================

import { trackEvent } from './firebase-config.js';
import { showToast, showLoading, hideLoading, setProgress } from './ui.js';

// =========================
// Image Compression
// =========================
export async function compressImage(file, maxWidth = 1200, maxHeight = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
        // === ENHANCED VALIDATION ===
        if (!file) {
            reject(new Error('No file provided'));
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            reject(new Error('File is not an image. Please select JPG, PNG, or WebP files.'));
            return;
        }
        
        // Validate file size (5MB limit)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('Image is too large. Maximum size is 5MB.'));
            return;
        }
        
        // Validate file type specifically
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            reject(new Error('Unsupported image format. Please use JPG, PNG, or WebP.'));
            return;
        }
        // === END ENHANCED VALIDATION ===
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    
                    // Calculate new dimensions maintaining aspect ratio
                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }
                    
                    // Ensure minimum dimensions
                    width = Math.max(width, 100);
                    height = Math.max(height, 100);
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Improve image quality
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Convert to JPEG with specified quality
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    
                    // Validate the result
                    if (!compressedDataUrl || compressedDataUrl.length < 100) {
                        reject(new Error('Compression resulted in empty image'));
                        return;
                    }
                    
                    resolve(compressedDataUrl);
                    } catch (canvasError) {
                    reject(new Error('Failed to process image: ' + canvasError.message));
                }
            };
            img.onerror = () => reject(new Error('Failed to load image file'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Failed to read image file'));
        reader.readAsDataURL(file);
    });
}

// =========================
// Image Preview Management
// =========================
let selectedImages = [];

export function setupImagePreview() {
    const fileInput = document.getElementById('saleImage');
    const previewContainer = document.createElement('div');
    previewContainer.id = 'imagePreview';
    previewContainer.className = 'image-preview-container';
    fileInput.parentNode.appendChild(previewContainer);

    fileInput.addEventListener('change', function(e) {
        const newFiles = Array.from(e.target.files);
        
        if (newFiles.length === 0) return;
        
        // === ADD VALIDATION ===
        let validFiles = [];
        let invalidFiles = [];
        
        newFiles.forEach(file => {
            // Check file type
            if (!file.type.startsWith('image/')) {
                invalidFiles.push(`${file.name} - not an image`);
                return;
            }
            
            // Check file size (5MB limit)
            if (file.size > 5 * 1024 * 1024) {
                invalidFiles.push(`${file.name} - file too large (max 5MB)`);
                return;
            }
            
            // Check specific image types
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type.toLowerCase())) {
                invalidFiles.push(`${file.name} - unsupported format`);
                return;
            }
            
            validFiles.push(file);
        });
        
        // Show errors for invalid files
        if (invalidFiles.length > 0) {
            showToast(`Skipped ${invalidFiles.length} invalid files: ${invalidFiles.join(', ')}`, 'warning');
        }
        
        if (validFiles.length === 0) return;
        // === END VALIDATION ===
        
        // MOBILE GALLERY MULTI-SELECT: Replace selection with new batch
        // But respect the 3-image limit
        selectedImages = validFiles.slice(0, 3);
        
        updateImagePreview();
        updateFileInput();
        
        // Show success message
        if (validFiles.length > 0) {
            showToast(`Added ${validFiles.length} image(s)`, 'success');
        }
    });
}

// ADD THE MISSING EXPORTS HERE
export function getSelectedImages() {
    return selectedImages;
}

export function clearSelectedImages() {
    selectedImages = [];
    updateImagePreview();
    updateFileInput();
}

// Helper function to update the actual file input with selected files
function updateFileInput() {
    const fileInput = document.getElementById('saleImage');
    const dataTransfer = new DataTransfer();
    
    selectedImages.forEach(file => {
        dataTransfer.items.add(file);
    });
    
    fileInput.files = dataTransfer.files;
}

function updateImagePreview() {
    const previewContainer = document.getElementById('imagePreview');
    previewContainer.innerHTML = '';

    selectedImages.forEach((file, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        // Create unique URL for each image to prevent reference sharing
        const objectUrl = URL.createObjectURL(file);
        
        previewItem.innerHTML = `
            <img src="${objectUrl}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" data-index="${index}">×</button>
        `;
        
        previewContainer.appendChild(previewItem);
        
        // Add event listener directly to avoid reference issues
        previewItem.querySelector('.remove-image').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            removeImage(index);
        });
        
        // Clean up object URL when done
        previewItem.querySelector('img').onload = function() {
            URL.revokeObjectURL(objectUrl);
        };
    });
}

// ONLY KEEP THIS ONE removeImage FUNCTION:
window.removeImage = function(index) {
    // Make sure we're working with a clean copy
    selectedImages = [...selectedImages.slice(0, index), ...selectedImages.slice(index + 1)];
    updateImagePreview();
    updateFileInput();
};

// =========================
// Image Modal for Zooming
// =========================
let currentModalImages = [];
let currentModalIndex = 0;

export function createImageModal() {
    // ✅ FIX: Check if modal already exists
    let modal = document.getElementById('imageModal');
    if (modal) return modal; // Return existing modal
    
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close" onclick="closeImageModal()">×</button>
            <button class="modal-nav prev" onclick="navModal(-1)">‹</button>
            <img id="modalImage" src="" alt="">
            <button class="modal-nav next" onclick="navModal(1)">›</button>
            <div class="modal-counter"></div>
        </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal on background click
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeImageModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });
    
    return modal;
}
    
    // Close modal with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeImageModal();
        }
    });

// Global function to open image modal
window.openImageModal = function(saleId, imageIndex) {
    // This will be implemented in sales.js since it needs access to state.sales
    // The actual implementation remains in sales.js
};

// Global function to close modal
window.closeImageModal = function() {
    const modal = document.getElementById('imageModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        
        // Track modal closing
        trackEvent('image_modal_close', {
            current_index: currentModalIndex,
            total_images: currentModalImages.length
        });
    }
};

// Global function to navigate modal
window.navModal = function(direction) {
    let newIndex = currentModalIndex + direction;
    if (newIndex < 0) newIndex = currentModalImages.length - 1;
    if (newIndex >= currentModalImages.length) newIndex = 0;
    
    currentModalIndex = newIndex;
    const modalImg = document.getElementById('modalImage');
    const counter = document.querySelector('.modal-counter');
    
    if (modalImg && counter && currentModalImages.length > 0) {
        modalImg.src = currentModalImages[newIndex];
        counter.textContent = `${newIndex + 1} of ${currentModalImages.length}`;
        
        // Track navigation
        trackEvent('image_modal_navigate', {
            direction: direction > 0 ? 'next' : 'previous',
            new_index: newIndex,
            total_images: currentModalImages.length
        });
    }
};

// Helper function to set modal images (called from sales.js)
export function setModalImages(images, startIndex = 0) {
    currentModalImages = images;
    currentModalIndex = startIndex;
}

// =========================
// Placeholder Image (Sales)
// =========================
export function placeholderImage(text) {
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='280'>
        <defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%230b7d62'/><stop offset='100%' stop-color='%2320a58a'/></linearGradient></defs>
        <rect width='100%' height='100%' fill='url(%23g)'/>
        <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial' font-size='26' font-weight='700'>${(text||'Truck').replace(/</g,'&lt;')}</text>
    </svg>`;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// =========================
// Image Upload Handler
// =========================
export async function handleImageUpload(files, onProgress = null, onCancel = null) {
    // === ADD VALIDATION ===
    if (!files || files.length === 0) {
        throw new Error('No images to upload');
    }
    
    if (files.length > 10) {
        throw new Error('Too many images. Maximum 10 allowed.');
    }
    // === END VALIDATION ===
    
    let isCancelled = false;
    
    if (onCancel) {
        window.currentCancelCallback = () => {
            isCancelled = true;
            onCancel();
        };
    }
    
    const compressedImages = [];
    
    for (let i = 0; i < files.length; i++) {
        // Check for cancellation before each image
        if (isCancelled) {
            showToast('Upload cancelled', 'warning');
            return null;
        }
        
        const file = files[i];
        
        if (onProgress) {
            onProgress((i / files.length) * 50, `Compressing image ${i + 1} of ${files.length}`);
        }
        
        try {
            const compressed = await compressImage(file);
            compressedImages.push(compressed);
            
            if (onProgress) {
                onProgress(((i + 1) / files.length) * 50, `Compressed ${i + 1} of ${files.length}`);
            }
        } catch (error) {
            console.error('Error compressing image:', error);
            // === IMPROVED ERROR HANDLING ===
            if (error.message.includes('too large')) {
                throw new Error(`Image ${i + 1} is too large: ${error.message}`);
            } else if (error.message.includes('not an image')) {
                throw new Error(`File ${i + 1} is not a valid image`);
            } else {
                throw new Error(`Failed to process image ${i + 1}: ${error.message}`);
            }
        }
    }
    
    // Check for cancellation before finalizing
    if (isCancelled) {
        showToast('Upload cancelled', 'warning');
        return null;
    }
    
    return compressedImages;
}

// =========================
// Global functions for image interaction tracking
// =========================
window.trackImageClick = function(saleId, imageIndex) {
    trackEvent('image_view', {
        item_type: 'sale',
        item_id: saleId,
        image_index: imageIndex,
        action: 'click'
    });
};

window.trackGalleryNav = function(saleId, direction) {
    trackEvent('gallery_navigation', {
        item_type: 'sale',
        item_id: saleId,
        direction: direction > 0 ? 'next' : 'previous'
    });
};

// Global function for side gallery navigation
window.navGallerySide = function(saleId, direction) {
    // This will be implemented in sales.js since it needs access to state.sales
    // The actual implementation remains in sales.js
};