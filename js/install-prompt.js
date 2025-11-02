// ===========================================
// Install Prompt Handler
// ===========================================
// Handles PWA installation prompts and deferred installation
// ===========================================

let deferredPrompt;
const installButton = document.createElement('button');

export function setupInstallPrompt() {
  // Create install button (hidden by default)
  installButton.innerHTML = '📱 Install App';
  installButton.className = 'btn secondary';
  installButton.style.display = 'none';
  installButton.style.margin = '8px 0';
  
  // Add to home page card
  const homeCard = document.querySelector('#home .card');
  if (homeCard) {
    homeCard.appendChild(installButton);
  }
  
  // Listen for beforeinstallprompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA install prompt available');
    
        // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Show install button
    installButton.style.display = 'block';
    
    // Add click event to install button
    installButton.addEventListener('click', async () => {
      await triggerInstall();
    });
  });
  
  // Listen for app installed event
  window.addEventListener('appinstalled', (e) => {
    console.log('✅ AppLoads was installed successfully');
    
    // Hide install button
    installButton.style.display = 'none';
    
    // Track installation
    if (typeof trackEvent === 'function') {
      trackEvent('pwa_installed', {
        timestamp: Date.now(),
        platform: navigator.platform
      });
    }
    
        // Show success message
    showToast('✅ AppLoads installed successfully!', 'success');
  });
  
  // Check if app is already installed
  checkInstallStatus();
}

export async function triggerInstall() {
  if (!deferredPrompt) {
    console.log('❌ No install prompt available');
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
    
        // Hide the install button regardless of outcome
    installButton.style.display = 'none';
    
    // We've used the prompt, and can't use it again, so clear it
    deferredPrompt = null;
    
  } catch (error) {
    console.error('❌ Error triggering install:', error);
  }
}

export function checkInstallStatus() {
  // Check if app is running in standalone mode (installed)
  if (window.matchMedia('(display-mode: standalone)').matches || 
      window.navigator.standalone === true) {
    console.log('✅ App is running in installed mode');
    installButton.style.display = 'none';
    return true;
  }
  
  // Check via other methods
  if (deferredPrompt) {
    console.log('📱 App can be installed');
    return false;
  }
  
  return null;
}

// Export function to manually show install prompt
window.showInstallPrompt = triggerInstall;

// Add install button to settings (optional)
export function addInstallToSettings() {
  const settingsSection = document.querySelector('#account .card:last-child');
  if (settingsSection) {
    const installOption = document.createElement('div');
    installOption.className = 'setting-item';
    installOption.innerHTML = `
      <div class="between">
        <div>
          <strong>Install App</strong>
          <div class="muted">Get the full app experience</div>
        </div>
        <button class="btn small secondary" onclick="showInstallPrompt()">
          Install
        </button>
      </div>
    `;
    settingsSection.appendChild(installOption);
  }
}

