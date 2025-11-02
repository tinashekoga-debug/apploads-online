// ===========================================
// Service Worker Registration
// ===========================================

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/'
        });
        
        console.log('✅ Service Worker registered:', registration);
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('🔄 New Service Worker found...');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update prompt
              showUpdatePrompt(registration);
            }
          });
        });
        
        // Track service worker state changes
        registration.addEventListener('statechange', (event) => {
          console.log('Service Worker state:', event.target.state);
        });
        
      } catch (error) {
        console.error('❌ Service Worker registration failed:', error);
      }
    });
    
    // Listen for controlled page updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker controller changed');
      window.location.reload();
    });
  }
}

function showUpdatePrompt(registration) {
  // Create a simple update notification
  if (confirm('A new version of AppLoads is available. Update now?')) {
    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Export function to check for updates
export async function checkForUpdates() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    console.log('🔍 Checking for Service Worker updates...');
  }
}

// Export function to cleanup caches
export async function cleanupCaches() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    
    if (registration.active) {
      registration.active.postMessage({ type: 'CLEANUP_CACHES' });
    }
  }
} 
// ===========================================
// PWA Installation Success Handler
// ===========================================

export function setupPWAInstallationHandler() {
  // Listen for app installed event
  window.addEventListener('appinstalled', (e) => {
    console.log('✅ AppLoads was installed successfully');
    
    // Show installation success notification
    if (typeof showToast === 'function') {
      showToast('✅ Successfully installed AppLoads! Enjoy the trucking experience.', 'success');
    }
    
    // Track installation
    if (typeof trackEvent === 'function') {
      trackEvent('pwa_installed', {
        timestamp: Date.now(),
        platform: navigator.platform
      });
    }
  });
}