// js/app-updater.js

export async function forceAppUpdateWithStatus() {
  if (!('serviceWorker' in navigator)) {
    window.location.reload();
    return true;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    window.location.reload();
    return true;
  }

  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return true;
  }

  await registration.update();

  const updatedRegistration = await navigator.serviceWorker.getRegistration();
  if (updatedRegistration?.waiting) {
    updatedRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    return true;
  }

  return false;
}
