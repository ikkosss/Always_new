/* Helper to enter immersive fullscreen on Android and hide system navigation */
export function setupImmersiveMode() {
  const isAndroid = /Android/i.test(navigator.userAgent || "");
  const rootEl = document.documentElement;

  const requestFs = () => {
    const el = rootEl;
    const opts = { navigationUI: "hide" };
    try {
      if (el.requestFullscreen) return el.requestFullscreen(opts);
      if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
      if (el.msRequestFullscreen) return el.msRequestFullscreen();
      if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    } catch (e) {
      // ignore
    }
    return Promise.resolve();
  };

  const tryEnter = async () => {
    if (!isAndroid) return; // target Android only
    // If already fullscreen, nothing to do
    if (document.fullscreenElement || document.webkitFullscreenElement) return;
    await requestFs().catch(() => {});
  };

  // Best-effort attempt shortly after load (installed PWA sometimes allows it)
  window.setTimeout(tryEnter, 300);

  // Also try on first user interaction (click/touch/keydown)
  const once = { once: true, capture: true };
  const handle = () => tryEnter();
  window.addEventListener('click', handle, once);
  window.addEventListener('touchend', handle, once);
  window.addEventListener('keydown', handle, once);

  // When app gets installed or becomes visible again, try again
  window.addEventListener('appinstalled', tryEnter);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) tryEnter();
  });

  // Toggle a class on body to allow CSS tweaks in fullscreen if needed
  const fsChange = () => {
    const inFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    document.body.classList.toggle('is-fullscreen', inFs);
  };
  document.addEventListener('fullscreenchange', fsChange);
  document.addEventListener('webkitfullscreenchange', fsChange);
}