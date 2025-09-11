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

window.addEventListener('load', setSearchTop);
window.addEventListener('resize', setSearchTop);
window.addEventListener('orientationchange', setSearchTop);
// На открытие клавиатуры (мобильные браузеры меняют viewport height)
window.visualViewport && window.visualViewport.addEventListener('resize', setSearchTop);

const root = ReactDOM.createRoot(document.getElementById("root"));

function showSplashFor(ms) {
  const splash = document.getElementById('splash');
  if (!splash) return;
  document.body.classList.remove('splash-hide');
  setTimeout(() => {
    document.body.classList.add('splash-hide');
  }, ms);
}

// Render app immediately; keep splash overlay to cover it for the desired time
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Decide cold start vs warm resume
const coldStart = !sessionStorage.getItem('appInitialized');
showSplashFor(coldStart ? 3000 : 1000);
sessionStorage.setItem('appInitialized', '1');

// No repeated splash on tab switching/resume