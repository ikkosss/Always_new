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
// Предупреждение при закрытии вкладки при несохраненных изменениях
window.addEventListener('beforeunload', (e) => {
  if (window.__unsaved) {
    e.preventDefault();
    e.returnValue = '';
  }
});

}

// Initialize immersive fullscreen helper
// Включаем иммерсивный режим только если приложение запущено как standalone (установленное PWA)
try {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) setupImmersiveMode();
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

const root = ReactDOM.createRoot(document.getElementById("root"));

function showSplashFor(ms) {
  const splash = document.getElementById('splash');
  if (!splash) return;
  document.body.classList.add('splash-show');
  setTimeout(() => {
    document.body.classList.remove('splash-show');
  }, ms);
}

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