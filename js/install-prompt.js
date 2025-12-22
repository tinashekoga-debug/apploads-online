// ===========================================
// Install Prompt Handler
// ===========================================
// Handles PWA installation prompts and deferred installation
// ===========================================

let deferredPrompt;
let installButton = null;

export function setupInstallPrompt() {
  console.log('📱 Setting up install prompt...');
  
  // REMOVED: Creating install button for home page
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA install prompt available');
    
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button in account section
    updateAccountInstallButton();
    
    console.log('✅ Install prompt available - button will appear in account section');
  });
  
  // Listen for app installed event
  window.addEventListener('appinstalled', (e) => {
    console.log('✅ AppLoads was installed successfully');
    
    // Hide install button
    updateAccountInstallButton();
    
    // Track installation
    if (typeof trackEvent === 'function') {
      trackEvent('pwa_installed', {
        timestamp: Date.now(),
        platform: navigator.platform
      });
    }
    
    // Show success message
    if (typeof showToast === 'function') {
      showToast('✅ AppLoads installed successfully!', 'success');
    }
  });
  
  // Check if app is already installed
  checkInstallStatus();
}

export async function triggerInstall() {
  if (!deferredPrompt) {
    console.log('❌ No install prompt available');
    if (typeof showToast === 'function') {
      showToast('Installation not available in this browser', 'warning');
    }
    return;
  }
  
  try {
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    console.log(`📱 User response to install prompt: ${outcome}`);
    
    // Track the outcome
    if (typeof trackEvent === 'function') {
      trackEvent('pwa_install_prompt', {
        outcome: outcome,
        timestamp: Date.now()
      });
    }
    
    if (outcome === 'accepted') {
      console.log('✅ User accepted the install prompt');
      if (typeof showToast === 'function') {
        showToast('Installing AppLoads...', 'success');
      }
    } else {
      console.log('❌ User dismissed the install prompt');
      if (typeof showToast === 'function') {
        showToast('Installation cancelled', 'warning');
      }
    }
    
    // We've used the prompt, and can't use it again, so clear it
    deferredPrompt = null;
    
    // Update account install button
    updateAccountInstallButton();
    
  } catch (error) {
    console.error('❌ Error triggering install:', error);
    if (typeof showToast === 'function') {
      showToast('Error during installation', 'error');
    }
  }
}

export function checkInstallStatus() {
  // Check if app is running in standalone mode (installed)
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
  
  if (isInstalled) {
    console.log('✅ App is running in installed mode');
    updateAccountInstallButton();
    return true;
  }
  
  // Check if we have a deferred prompt (can be installed)
  if (deferredPrompt) {
    console.log('📱 App can be installed');
    updateAccountInstallButton();
    return false;
  }
  
  console.log('❌ App cannot be installed or prompt not available');
  updateAccountInstallButton();
  return null;
}

// NEW FUNCTION: Update install button in account section
export function updateAccountInstallButton() {
  const accountSection = document.getElementById('account');
  if (!accountSection) return;
  
  let installCard = document.getElementById('installAppCard');
  
  // Check if app is already installed
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                      window.navigator.standalone === true;
  
  // Remove install card if app is installed
  if (isInstalled) {
    if (installCard) {
      installCard.remove();
    }
    return;
  }
  
  // Create install card if it doesn't exist and installation is available
  if (!installCard && deferredPrompt) {
    installCard = document.createElement('div');
    installCard.id = 'installAppCard';
    installCard.className = 'card';
    installCard.innerHTML = `
      <h3 style="margin:0 0 8px 0;font-size:1rem">Install AppLoads</h3>
      <p class="muted" style="margin-bottom: 12px;">
        Get the full app experience with faster loading and offline access.
      </p>
     <button class="btn install-button" id="installAppButton">
        Install Apploads
      </button>
    `;
    
    // Find the account section and insert after the first card
    const firstCard = accountSection.querySelector('.card');
    if (firstCard) {
      firstCard.parentNode.insertBefore(installCard, firstCard.nextSibling);
    } else {
      accountSection.appendChild(installCard);
    }
  
    // Attach event listener safely
const installBtn = installCard.querySelector('#installAppButton');
if (installBtn && !installBtn._listenerAdded) {
  installBtn.addEventListener('click', () => {
    triggerInstall();
  });
  installBtn._listenerAdded = true;
}
  }
  // Hide install card if no prompt is available
  if (installCard && !deferredPrompt) {
    installCard.style.display = 'none';
  } else if (installCard && deferredPrompt) {
    installCard.style.display = 'block';
  }
}

// Export function to manually show install prompt
window.showInstallPrompt = triggerInstall;

// REMOVED: addInstallToSettings function since we're handling it differently now