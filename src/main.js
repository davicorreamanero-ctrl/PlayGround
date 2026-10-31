import { App } from './ui/app.js';

function boot() {
  try {
    window.__blockBrawl = new App();
  } catch (err) {
    console.error('Block Brawl failed to boot', err);
    const el = document.getElementById('toast');
    if (el) {
      el.textContent = 'BOOT ERROR — SEE CONSOLE';
      el.classList.add('show');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
