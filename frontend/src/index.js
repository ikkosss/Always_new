import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { setupImmersiveMode } from "./immersive";

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
// Отключили системное предупреждение при закрытии вкладки — подтверждение выполняется локально при изменении чекбокса

}

// Initialize immersive fullscreen helper
// Включаем иммерсивный режим только если приложение запущено как standalone (установленное PWA)
try {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  // Отключаем принудительный immersive режим в PWA — навигационная панель Android должна всегда оставаться видимой
  // if (isStandalone) setupImmersiveMode();
} catch (e) { /* noop */ }

// Динамическая вертикаль для поля поиска: центр между верхом и верхним краем нижних кнопок.
function computeSearchTop() {
  const bn = document.querySelector('.bottom-nav');
  const bnTop = bn ? bn.getBoundingClientRect().top : window.innerHeight;
  const containerHeight = bnTop; // пространство от верха до верхнего края нижних кнопок
  const centerY = Math.round(containerHeight / 2);
  const half = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-half')) || 24;
  return `${centerY - half}px`;
}

function setSearchTop() {
  document.documentElement.style.setProperty('--search-top', computeSearchTop());
}

// Сброс позиции поиска при явном закрытии клавиатуры (потере фокуса), чтобы поле и изображение возвращались в центр
window.addEventListener('focusout', (e)=>{
  const activeTag = (e.target && e.target.tagName) || '';
  // если мы уходим с инпута поиска — пересчитать центр без учёта клавиатуры
  const isSearchInput = e.target && e.target.classList && e.target.classList.contains('search-input');
  if (isSearchInput) {
    setTimeout(setSearchTop, 50);
  }
});

window.addEventListener('load', setSearchTop);
window.addEventListener('resize', setSearchTop);
window.addEventListener('orientationchange', setSearchTop);
// На открытие клавиатуры (мобильные браузеры меняют viewport height)
window.visualViewport && window.visualViewport.addEventListener('resize', setSearchTop);

// Глобальная поддержка подъёма модалок при появлении клавиатуры
function setupModalLift() {
  try {
    const vv = window.visualViewport;
    if (!vv) return;
    const handler = () => {
      const keyboardShown = Math.abs(window.innerHeight - vv.height) > 120; // эвристика
      document.documentElement.style.setProperty('--vv-lift', keyboardShown ? `${(window.innerHeight - vv.height)}px` : '0px');
    };
    vv.addEventListener('resize', handler);
    handler();
  } catch {}
}
setupModalLift();

// Фиксация верхнего отступа под адресной строкой браузера (для сайта, не PWA)
function setupViewportTopBottom() {
  try {
    const isStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const vv = window.visualViewport;
    const apply = () => {
      const top = vv && vv.offsetTop ? vv.offsetTop : 0;
      const bottomInset = vv ? (window.innerHeight - vv.height - vv.offsetTop) : 0;
      const keyboardShown = vv ? (window.innerHeight - vv.height) > 40 : false;
      // Верхний бар только в браузере, нижний системный учитываем всегда, но не учитываем клавиатуру
      document.documentElement.style.setProperty('--vv-top', isStandalone ? '0px' : `${top}px`);
      document.documentElement.style.setProperty('--vv-bottom', `${bottomInset}px`);
      const sysPad = keyboardShown ? 0 : Math.max(0, bottomInset);
      document.documentElement.style.setProperty('--bn-pad-bottom', isStandalone ? `${sysPad}px` : `0px`);
    };
    if (vv && vv.addEventListener) vv.addEventListener('resize', apply);
    window.addEventListener('scroll', apply, { passive: true });
    apply();
  } catch {}
}
setupViewportTopBottom();

// Edge swipe navigation: right->left opens /places, left->right opens /numbers
function setupEdgeSwipeNav() {
  try {
    let startX = null, startY = null, tracking = false;
    const onStart = (e) => {
      const t = e.touches ? e.touches[0] : e;
      startX = t.clientX; startY = t.clientY; tracking = true;
    };
    const onMove = (e) => {};
    const onEnd = (e) => {
      if (!tracking) return; tracking = false;
      const t = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]) || e;
      if (!t || startX == null) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 60) {
        // horizontal swipe
        if (dx < 0) {
          // right -> left
          window.location.href = '/places';
        } else {
          // left -> right
          window.location.href = '/numbers';
        }
      }
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
  } catch {}
}
setupEdgeSwipeNav();

const root = ReactDOM.createRoot(document.getElementById("root"));

function showSplashFor(ms) { /* disabled */ }

// Render app immediately; keep splash overlay to cover it for the desired time
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Решаем: показывать ли заставку
try {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const now = Date.now();
  const lastShown = parseInt(localStorage.getItem('splashLastShown') || '0', 10);
  const oneHour = 60 * 60 * 1000;
  const canShow = isStandalone && (now - lastShown > oneHour);
  if (canShow) {
    showSplashFor(3000);
    localStorage.setItem('splashLastShown', String(now));
  } else {
    // мгновенно скрыть, если не время показывать
    // по новой схеме просто ничего не показываем (класс splash-show не ставим)
  }
} catch (e) {
  // на всякий случай скрыть
  // новая схема — ничего не делаем, заставка скрыта по умолчанию
}

// No repeated splash on tab switching/resume