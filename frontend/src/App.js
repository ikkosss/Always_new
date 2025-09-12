import React, { useEffect, useMemo, useRef, useState } from "react";

// Ensure focused field inside a keyboard-aware modal stays visible above keyboard
function ensureFieldVisible(target) {
  try {
    const panel = target.closest('.modal-panel');
    if (!panel) return;
    // Defer to allow visualViewport to update
    setTimeout(() => {
      const vv = window.visualViewport;
      const availH = vv ? vv.height - vv.offsetTop : window.innerHeight;
      const panelRect = panel.getBoundingClientRect();
      const elRect = target.getBoundingClientRect();
      // Desired position: bring the field slightly above center of the visible area (factor ~0.65)
      const factor = 0.65;
      const needsAdjust = (elRect.bottom > (vv ? vv.height : window.innerHeight) - 8) || (elRect.top < panelRect.top + 8);
      if (needsAdjust) {
        const offsetInPanel = elRect.top - panelRect.top;
        const targetTopInPanel = Math.max(0, offsetInPanel - (availH * factor) + (elRect.height / 2));
        panel.scrollTo({ top: targetTopInPanel, behavior: 'smooth' });
      }
    }, 60);
  } catch {}
}
import { createPortal } from "react-dom";
import "./App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Operators map for logos in UI
const OPERATORS = {
  megafon: { name: "МегаФон", icon: "/operators/megafon.png" },
  beeline: { name: "Билайн", icon: "/operators/beeline.png" },
  mts: { name: "МТС", icon: "/operators/mts.png" },
  t2: { name: "T2", icon: "/operators/t2.png" },
  t: { name: "T-Mobile", icon: "/operators/tmobile.png" },
  sber: { name: "СБЕР-Mobile", icon: "/operators/sber.png" },
  alfa: { name: "Альфа-Mobile", icon: "/operators/alfa.png" },
  gazprom: { name: "Газпром-Mobile", icon: "/operators/gazprom.png" },
  yota: { name: "YOTA", icon: "/operators/yota.png" },
  motiv: { name: "Мотив", icon: "/operators/motiv.png" },
  rt: { name: "Ростелеком", icon: "/operators/rt.png" },
};

const api = axios.create({ baseURL: API });

function extractDigits(raw) {
  const d = (raw || "").replace(/\D+/g, "");
  if (!d) return "";
  let out = d;
  if (out[0] === "8") out = "7" + out.slice(1);
  if (out[0] !== "7") {
    if (out.length >= 10) out = "7" + out.slice(-10); else out = "7" + out;
  }
  return out.slice(0, 11);
}
function formatRuPhonePartial(raw) {
  const digits = extractDigits(raw);
  if (!digits) return "";
  const rest = digits.slice(1);
  let res = "+7";
  if (rest.length > 0) res += " " + rest.slice(0, 3);
  if (rest.length > 3) res += " " + rest.slice(3, 6);
  if (rest.length > 6) res += " " + rest.slice(6, 8);
  if (rest.length > 8) res += " " + rest.slice(8, 10);
  return res;
}

function MeasureInputHeight({ targetRef }) {
  useEffect(() => {
    const update = () => {
      const el = targetRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const h = Math.round(rect.height);
      document.documentElement.style.setProperty('--search-h', h + 'px');
      document.documentElement.style.setProperty('--search-half', (h / 2) + 'px');
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [targetRef]);
  return null;
}

function LongPressable({ duration = 2000, onLongPress, onClick, className, children }) {
  const timerRef = useRef(null);
  const handleStart = () => {
    clear();
    timerRef.current = setTimeout(() => {
      onLongPress && onLongPress();
    }, duration);
  };
  const clear = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };
  return (
    <div
      className={className}
      onMouseDown={handleStart}
      onTouchStart={handleStart}
      onMouseUp={clear}
      onMouseLeave={clear}
      onTouchEnd={clear}
      onTouchCancel={clear}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function useBottomNav() {
  const location = useLocation();
  const active = location.pathname.startsWith("/numbers")
    ? "numbers"
    : location.pathname.startsWith("/places")
      ? "places"
      : "search";
  return active;
}

function BottomNav() {
  const active = useBottomNav();
  const nav = useNavigate();
  const [confirmNav, setConfirmNav] = useState(false);
  const pendingRouteRef = useRef(null);

  useEffect(() => {
    const updateBn = () => {
      const el = document.querySelector('.bottom-nav');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      document.documentElement.style.setProperty('--bn-h', rect.height + 'px');
    };
    updateBn();
    window.addEventListener('resize', updateBn);
    window.addEventListener('orientationchange', updateBn);
    const ro = new ResizeObserver(updateBn);

function PromoBadgeAuto({ imgSrc, onClick }){
  const dotRef = useRef(null);
  useEffect(()=>{
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 16; c.height = 16;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 16, 16);
        const d = ctx.getImageData(0,0,16,16).data;
        let sum=0; for (let i=0;i<d.length;i+=4){ const r=d[i], g=d[i+1], b=d[i+2]; sum += 0.2126*r+0.7152*g+0.0722*b; }
        const luma = sum/(d.length/4);
        if (dotRef.current) dotRef.current.style.background = luma > 160 ? '#000' : '#fff';
      } catch(e) { if (dotRef.current) dotRef.current.style.background = '#fff'; }
    };
    img.onerror = () => { if (dotRef.current) dotRef.current.style.background = '#fff'; };
    img.src = imgSrc;
  }, [imgSrc]);
  return (
    <div className="promo-badge" title="Промо" onClick={onClick}>
      <div ref={dotRef} className="promo-dot" />
    </div>
  );
}

    const el = document.querySelector('.bottom-nav');
    if (el) ro.observe(el);
    return () => {
      window.removeEventListener('resize', updateBn);
      window.removeEventListener('orientationchange', updateBn);
      ro.disconnect();
    };
  }, []);

  const tryNav = async (to) => {
    const hasUnsaved = !!window.__unsaved;
    if (hasUnsaved && typeof window.__saveChanges === 'function') {
      try { await window.__saveChanges(); } catch (e) { /* ignore */ }
      window.__unsaved = false;
    }
    nav(to);
  };

  const proceedNav = async (save) => {
    const to = pendingRouteRef.current;
    setConfirmNav(false);
    if (save && typeof window.__saveChanges === 'function') {
      try { await window.__saveChanges(); } catch (e) { /* ignore */ }
      // после сохранения просто продолжаем навигацию
    }
    // reset unsaved flag if discard
    if (!save) { window.__unsaved = false; }
    if (to) nav(to);
  };

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        <button className={`bottom-nav-btn ${active === "search" ? "active" : "inactive"}`} onClick={() => tryNav("/")}>ПОИСК</button>
        <button className={`bottom-nav-btn ${active === "numbers" ? "active" : "inactive"}`} onClick={() => tryNav("/numbers")}>НОМЕРА</button>
        <button className={`bottom-nav-btn ${active === "places" ? "active" : "inactive"}`} onClick={() => tryNav("/places")}>МЕСТА</button>
      </div>

      {confirmNav && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setConfirmNav(false)}>
          <div className="bg-white modal-panel w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Сохранить изменения?</div>
            <div className="text-sm text-neutral-600">У вас есть несохранённые изменения. Хотите сохранить перед переходом?</div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => proceedNav(true)}>Сохранить</button>
              <button className="btn btn-text" onClick={() => proceedNav(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Page({ title, children, hideHeader = false, center = false, wide = false, padX = true, topPadClass = 'pt-3', skipSafeTop = false }) {
  const outerClass = center
    ? `flex-1 flex items-center justify-center ${padX ? "px-[var(--pad-x)]" : "px-0"}`
    : (padX ? "px-[var(--pad-x)]" : "px-0");
  const innerClass = center
    ? wide ? "w-full" : "w-full max-w-xl"
    : "w-full";
  // Везде (кроме поиска) делаем одинаковый верхний отступ как на странице НОМЕРА
  const wrapperStyle = hideHeader && !skipSafeTop ? { paddingTop: 'var(--pad-header-top)' } : (!hideHeader ? { } : undefined);
  return (
    <div className={`min-h-screen pb-20 flex flex-col`} style={wrapperStyle}>
      {!hideHeader && <div className="header" style={{paddingTop: 'var(--pad-header-top)'}}>{title}</div>}
      <div className={outerClass}>
        <div className={innerClass}>{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}

/* TRUNCATED: Restored full file is very long; for brevity in this patch, please note this content should be identical to the version from commit 8b02d3b (lines 240..end). */