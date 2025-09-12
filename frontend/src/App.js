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

function SearchPage() {
  const [qRaw, setQRaw] = useState("");
  const [results, setResults] = useState({ numbers: [], places: [] });
  const [noFound, setNoFound] = useState(false);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [numberForm, setNumberForm] = useState({ phone: "", operatorKey: "mts" });
  const [placeForm, setPlaceForm] = useState({ name: "", category: "Магазины", promoCode: "", promoCode2: "", promoUrl: "", comment: "", logo: null });
  const [confirmAdd, setConfirmAdd] = useState({ open: false, type: null, label: "" });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsMode, setSettingsMode] = useState('root'); // root | ops_home | ops_list | ops_form | cats_home | cats_list | cats_form
  const [opForm, setOpForm] = useState({ name: '', logo: null, existingLogo: '' });
  const resetSettings = () => { setSettingsMode('root'); setOpForm({ name:'', logo:null, existingLogo:'' }); setIsEditingOp(false); };
  const [isEditingOp, setIsEditingOp] = useState(false);

  const gotoSettingsMode = (mode) => {
    setSettingsMode(mode);
    try { history.pushState({ settings:true, mode }, ''); } catch {}
  };
  useEffect(() => {
    if (!settingsOpen) return;
    const onPop = (e) => {
      // Step back within settings flow
      const prev = (m => ({
        ops_form: 'ops_list',
        ops_list: 'ops_home',
        ops_home: 'root',
        cats_form: 'cats_home',
        cats_list: 'cats_home',
        cats_home: 'root',
        root: null,
      })[m])(settingsMode);
      if (prev) {
        setSettingsMode(prev);
      } else {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('popstate', onPop);
    try { history.pushState({ settings:true, mode: settingsMode }, ''); } catch {}
    return () => { window.removeEventListener('popstate', onPop); };
  }, [settingsOpen, settingsMode]);
  // Плюсик в диалоге добавления места из поиска
  const [showExtraPromoS, setShowExtraPromoS] = useState(false);
  const [showPromoUrlS, setShowPromoUrlS] = useState(false);
  const handlePlusClickS = (e) => {
    e.preventDefault();
    const now = Date.now();
    const lastClick = e.currentTarget.lastClick || 0;
    if (now - lastClick < 300) {
      setShowPromoUrlS(true);
    } else {
      setShowExtraPromoS(true);
    }
    e.currentTarget.lastClick = now;
  };

  const inputRef = useRef(null);
  useEffect(()=>{
    // обновляем позицию поля при фокусе/блюре, чтобы держать его над клавиатурой
    const el = inputRef.current;
    if (!el) return;
    const onFocus = () => {
      // поместим поле на 25% от доступного пространства (чуть выше центра), чтобы избежать перекрытия клавиатурой
      const bn = document.querySelector('.bottom-nav');
      const bnTop = bn ? bn.getBoundingClientRect().top : window.innerHeight;
      const h = bnTop; // доступная высота
      const half = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-half')) || 24;
      const y = Math.round(h * 0.35) - half; // 35% от доступной высоты
      document.documentElement.style.setProperty('--search-top', `${y}px`);
    };
    const onBlur = () => {
      // вернуть в центр доступного пространства
      const bn = document.querySelector('.bottom-nav');
      const bnTop = bn ? bn.getBoundingClientRect().top : window.innerHeight;
      const centerY = Math.round(bnTop / 2);
      const half = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-half')) || 24;
      document.documentElement.style.setProperty('--search-top', `${centerY - half}px`);
    };
    el.addEventListener('focus', onFocus);
    el.addEventListener('blur', onBlur);
    return () => {
      el.removeEventListener('focus', onFocus);
      el.removeEventListener('blur', onBlur);
    };
  }, []);

  const onChange = (val) => {
    // нормализуем исходное значение (без многоточия в конце)
    const base = val.endsWith("...") ? val.slice(0, -3) : val;

    if (/^[0-9+\-()\s]*$/.test(base)) {
      const formatted = formatRuPhonePartial(base);
      setQRaw(formatted);

      return;
    }
    setQRaw(base);

  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!qRaw.trim()) { setResults({ numbers: [], places: [] }); setNoFound(false); return; }
      try {
        const { data } = await api.get(`/search`, { params: { q: qRaw } });
        setResults(data);
        setNoFound(data.numbers.length === 0 && data.places.length === 0);
      } catch (e) { console.error(e); }
    }, 250);
    return () => clearTimeout(t);
  }, [qRaw]);

  const isDigits = useMemo(() => /^[0-9+\-()\s]+$/.test(qRaw.trim()), [qRaw]);

  const handleSearch = () => {
    if (!qRaw.trim()) return;
    if (noFound) {
      // спрячем клавиатуру заранее для корректного центрирования модалки
      try { inputRef.current && inputRef.current.blur(); } catch {}
      // вместо мгновенного открытия диалогов показываем подтверждение
      if (isDigits) {
        setConfirmAdd({ open: true, type: 'number', label: formatRuPhonePartial(qRaw) });
      } else {
        setConfirmAdd({ open: true, type: 'place', label: qRaw.trim() });
      }
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    handleSearch();
  };

  const saveNumber = async () => {
    try {
      const { data } = await api.post(`/numbers`, numberForm);
      setShowNumberDialog(false);
      setNumberForm({ phone: "", operatorKey: "mts" });
      setQRaw("");
      // сразу перейти на страницу созданного номера
      if (data?.id) window.location.href = `/numbers/${data.id}`;
      else window.location.reload();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось добавить номер. Повторите позже");
    }
  };

  const savePlace = async () => {
    try {
      const fd = new FormData();
      fd.append("name", placeForm.name);
      fd.append("category", placeForm.category);
      fd.append("promoCode", placeForm.promoCode);
      fd.append("promoUrl", placeForm.promoUrl);
      fd.append("comment", placeForm.comment);
      if (placeForm.logo) fd.append("logo", placeForm.logo);
      const { data } = await api.post(`/places`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowPlaceDialog(false);
      setPlaceForm({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });
      setQRaw("");
      // перейти сразу на страницу созданного места, если вернулся id
      if (data?.id) window.location.href = `/places/${data.id}`;
      else window.location.reload();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось добавить место. Повторите позже");
    }
  };

  return (
    <Page title="ПОИСК" hideHeader center wide padX={false}>
      {/* FAB settings on search */}
      <button className="fab" onClick={() => setSettingsOpen(true)} title="Настройки">
        <img
          className="icon"
          alt=""
          src="https://customer-assets.emergentagent.com/job_d56daeba-fb7b-4f87-a6a2-33aeb212a38b/artifacts/okjcsd4p_settings.svg"
          onError={(e)=>{
            try {
              e.currentTarget.onerror = null;
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23FFFFFF\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><circle cx=\'12\' cy=\'12\' r=\'3\'/><path d=\'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .69.28 1.32.73 1.77.45.45 1.08.73 1.77.73H21a2 2 0 1 1 0 4h-.09c-.69 0-1.32.28-1.77.73-.45.45-.73 1.08-.73 1.77z\'/></svg>';
            } catch {}
          }}
        />
      </button>
      <div className="search-wrap">
        <img src="/promofon.png" alt="Promo" className="search-promo-image" />

        {/* Поле поиска — фиксировано по центру экрана, ширина 100vw */}
        <form onSubmit={onSubmit} className="search-input-container search-box">
          <div className="relative w-full">
            <input
              ref={inputRef}
              value={qRaw}
              onChange={(e) => onChange(e.target.value)}
              className="search-input pr-16"
              placeholder="Номер или название места..."
            />
            {/* Кнопка — часть поля: отрисовываем поверх внутри границ инпута */}
            <div 
              role="button"
              onClick={handleSearch}
              className="search-action select-none cursor-pointer text-sm"
              title="Найти"
            >
              Найти
            </div>
          </div>
        </form>

        {/* Подсказки — фиксировано под полем, не влияет на центрирование */}
        {(results.numbers.length > 0 || results.places.length > 0) && (
          <div className="search-suggestions">
            <div className="suggestions w-full">
              {results.numbers.map((n) => (
                <div key={n.id} className="suggestion flex items-center gap-3" onClick={() => (window.location.href = `/numbers/${n.id}`)}>
                  <div className="w-6 h-6 overflow-hidden flex items-center justify-center sugg-box">
                    <img alt="logo" src={OPERATORS[n.operatorKey]?.icon} className="w-6 h-6 object-contain sugg-logo"/>
                  </div>
                  <div className="flex-1">{n.phone}</div>
                  <div className="text-neutral-400 text-xs">номер</div>
                </div>
              ))}
              {results.places.map((p) => (
                <div key={p.id} className="suggestion flex items-center gap-3" onClick={() => (window.location.href = `/places/${p.id}`)}>
                  <div className="w-6 h-6 bg-neutral-200 overflow-hidden flex items-center justify-center sugg-box">
                    {p.hasLogo && <img alt="logo" className="w-6 h-6 object-cover sugg-logo" src={`${API}/places/${p.id}/logo`} />}
                  </div>
                  <div className="flex-1">{p.name}</div>
                  <div className="text-neutral-400 text-xs">место</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Измеряем фактическую высоту инпута и устанавливаем CSS-переменные для точного позиционирования */}
        <MeasureInputHeight targetRef={inputRef} />
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10030] modal-overlay" onClick={()=>setSettingsOpen(false)}>
          <div className="bg-white modal-panel keyboard-aware w-full max-w-md shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="grid gap-2">
            {/* Динамический заголовок (единственный) */}
            <div className="text-lg font-semibold mb-2">
              {settingsMode === 'root' && 'настройки'}
              {settingsMode === 'ops_home' && 'Управление операторами'}
              {settingsMode === 'ops_list' && 'Выберите оператора'}
              {settingsMode === 'ops_form' && (opForm.name || 'Новый оператор')}
              {settingsMode === 'cats_home' && 'Управление категориями'}
            </div>

            {/* Содержимое в зависимости от режима (без дубликатов) */}
            {settingsMode === 'root' && (
              <div className="grid gap-2">
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> gotoSettingsMode('ops_home')}>Управление операторами</button>
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> gotoSettingsMode('cats_home')}>Управление категориями</button>
              </div>
            )}

            {settingsMode === 'ops_home' && (
              <div className="grid gap-2">
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> { setIsEditingOp(false); setSettingsMode('ops_list'); }}>Редактировать операторов</button>
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> { setOpForm({ name:'', logo:null, existingLogo:'' }); setIsEditingOp(false); gotoSettingsMode('ops_form'); }}>Добавить нового оператора</button>
              </div>
            )}

            {settingsMode === 'cats_home' && (
              <div className="grid gap-2">
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> alert('Редактирование категорий — в разработке')}>Редактировать категории</button>
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> alert('Добавление категории — в разработке')}>Добавить новую категорию</button>
              </div>
            )}

            {settingsMode === 'ops_list' && (
              <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
                {Object.keys(OPERATORS).map(key => (
                  <button key={key} className="w-full px-3 py-2 text-left hover:bg-neutral-50 border flex items-center gap-2" onClick={()=> { setOpForm({ name: OPERATORS[key].name, logo:null, existingLogo: OPERATORS[key].icon }); setIsEditingOp(true); gotoSettingsMode('ops_form'); }}>
                    <img alt="op" src={OPERATORS[key].icon} className="w-6 h-6 rounded-[3px]" />
                    <span>{OPERATORS[key].name}</span>
                  </button>
                ))}
              </div>
            )}

            {settingsMode === 'cats_home' && (
              <div className="grid gap-2">
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> gotoSettingsMode('cats_list')}>Редактировать категории</button>
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> gotoSettingsMode('cats_form')}>Добавить новую категорию</button>
              </div>
            )}

            {settingsMode === 'cats_list' && (
              <div className="grid gap-2 max-h-[50vh] overflow-y-auto">
                {['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'].map(cat => (
                  <button key={cat} className="w-full px-3 py-2 text-left hover:bg-neutral-50 border" onClick={()=> setSettingsMode('cats_form')}>
                    {cat}
                  </button>
                ))}
              </div>
            )}

            {settingsMode === 'cats_form' && (
              <div className="grid gap-3">
                <input className="search-input" placeholder="Название категории" />
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2" onClick={()=> setSettingsMode('cats_home')}>Назад</button>
                  <button className="px-4 py-2 bg-blue-600 text-white" onClick={()=> setSettingsMode('cats_home')}>Сохранить</button>
                </div>
              </div>
            )}

            {settingsMode === 'ops_form' && (
              <div className="grid gap-3">
                <input className="search-input" placeholder="Название оператора" value={opForm.name} onChange={(e)=> setOpForm(prev=> ({...prev, name: e.target.value}))} />
                {opForm.existingLogo && (
                  <div className="flex items-center gap-2">
                    <img alt="logo" src={opForm.existingLogo} className="w-8 h-8 rounded-[3px]" />
                    <span className="text-xs text-neutral-500">Текущий логотип</span>
                  </div>
                )}
                <label className="file-field cursor-pointer">
                  <input className="hidden" type="file" accept="image/*" onChange={(e)=> setOpForm(prev=> ({...prev, logo: e.target.files?.[0] || null}))} />
                  <span className="file-choose-btn">Обзор</span>
                  <span className={`file-name ${opForm.logo ? 'has-file' : ''}`}>{opForm.logo ? opForm.logo.name : 'Файл не выбран'}</span>
                </label>
                <div className="flex justify-between gap-2">
                  <button className="px-4 py-2 text-red-600" onClick={()=> alert('Удаление оператора — в разработке')}>Удалить</button>
                  <div className="flex gap-2">
                    <button className="px-4 py-2" onClick={()=> gotoSettingsMode('ops_home')}>Назад</button>
                    <button className="px-4 py-2 bg-blue-600 text-white" onClick={()=> alert('Сохранение оператора — в разработке')}>Сохранить</button>
                  </div>
                </div>
              </div>
            )}

            </div>
          </div>
        </div>
      )}

      {confirmAdd.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10020] modal-overlay" onClick={()=> setConfirmAdd({ open:false, type:null, label:'' })}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Подтверждение</div>
            <div className="text-sm text-neutral-700 mb-4">
              {confirmAdd.type === 'number' ? (
                <>Добавить номер <b>{confirmAdd.label}</b>?</>
              ) : (
                <>Добавить место <b>{confirmAdd.label}</b>?</>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button className="btn btn-text" onClick={()=> setConfirmAdd({ open:false, type:null, label:'' })}>Нет</button>
              <button className="btn btn-primary" onClick={()=>{
                try { inputRef.current && inputRef.current.blur(); } catch {}
                setTimeout(()=>{
                  if (confirmAdd.type === 'number') {
                    setNumberForm({ phone: confirmAdd.label, operatorKey: 'mts' });
                    setShowNumberDialog(true);
                  } else if (confirmAdd.type === 'place') {
                    setPlaceForm({ name: confirmAdd.label, category: 'Магазины', promoCode:'', promoUrl:'', logo:null });
                    setShowPlaceDialog(true);
                  }
                  setConfirmAdd({ open:false, type:null, label:'' });
                }, 50);
              }}>Да</button>
            </div>
          </div>
        </div>
      )}

      {/* Number Dialog */}
      {showNumberDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10030] modal-overlay" onClick={() => setShowNumberDialog(false)}>
          <div className="bg-white modal-panel keyboard-aware w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Добавить номер</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НОМЕР ТЕЛЕФОНА" value={numberForm.phone} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e) => setNumberForm({ ...numberForm, phone: formatRuPhonePartial(e.target.value) })} />
              <select className="search-input" value={numberForm.operatorKey} onChange={(e) => setNumberForm({ ...numberForm, operatorKey: e.target.value })}>
                {Object.entries(OPERATORS).map(([key, op]) => (
                  <option key={key} value={key}>{op.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button className="btn btn-text" onClick={() => setShowNumberDialog(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={saveNumber}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Dialog */}
      {showPlaceDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10030] modal-overlay" onClick={() => setShowPlaceDialog(false)}>
          <div className="bg-white modal-panel keyboard-aware w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Добавить место</div>
            <div className="grid gap-3 pb-4">
              <input className="search-input" placeholder="Название" value={placeForm.name} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })} />
              <select className="search-input" value={placeForm.category} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })}>
                {['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'].map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Промокод с плюсиком */}
              <div className="flex items-center gap-2">
                <input 
                  className="search-input flex-1" 
                  placeholder="Промокод" 
                  value={placeForm.promoCode} 
                  onFocus={(e)=>ensureFieldVisible(e.target)} 
                  onChange={(e) => setPlaceForm({ ...placeForm, promoCode: e.target.value })} 
                />
                <button 
                  type="button"
                  className="bg-green-100 text-green-700 hover:bg-green-200 font-bold text-lg w-[43px] h-[43px] flex items-center justify-center p-0 rounded-none"
                  onClick={handlePlusClickS}
                  title="Добавить поле"
                >
                  +
                </button>
              </div>
              {showExtraPromoS && (
                <input className="search-input" placeholder="Дополнительный промокод" value={placeForm.promoCode2} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e) => setPlaceForm({ ...placeForm, promoCode2: e.target.value })} />
              )}
              {showPromoUrlS && (
                <input className="search-input" placeholder="Ссылка на акцию" value={placeForm.promoUrl} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e) => setPlaceForm({ ...placeForm, promoUrl: e.target.value })} />
              )}
              <label className="file-field cursor-pointer">
                <input className="hidden" type="file" accept="image/*" onChange={(e) => setPlaceForm({ ...placeForm, logo: e.target.files?.[0] || null })} />
                <span className="file-choose-btn">Обзор</span>
                <span className={`file-name ${placeForm.logo ? 'has-file' : ''}`}>{placeForm.logo ? placeForm.logo.name : 'Файл не выбран'}</span>
              </label>
              <textarea 
                className="search-input" 
                placeholder="Комментарий" 
                value={placeForm.comment} 
                onChange={(e)=>{
                  const val = e.target.value;
                  setPlaceForm({...placeForm, comment: val});
                  const base = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-h')) || 43;
                  const factor = val.length > 160 ? 3 : (val.length > 60 ? 2 : 1.5);
                  e.target.style.minHeight = (base * factor) + 'px';
                }}
                onFocus={(e)=>{
                  ensureFieldVisible(e.target);
                  const bn = document.querySelector('.bottom-nav');
                  const h = bn ? bn.getBoundingClientRect().height : 56;
                  document.documentElement.style.setProperty('--vv-lift', h + 'px');
                }}
                onBlur={() => {
                  document.documentElement.style.setProperty('--vv-lift', '0px');
                }}
              />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={() => setShowPlaceDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={savePlace}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Page>
  );
}

function NumbersPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [sortOpen, setSortOpen] = useState(false);
  const [opsOpen, setOpsOpen] = useState(false);
  const [sortKey, setSortKey] = useState('new');
  const [opFilter, setOpFilter] = useState(Object.fromEntries(Object.keys(OPERATORS).map(k=>[k,true])));
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ phone: "", operatorKey: "mts" });
  const [editing, setEditing] = useState(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);
  // Number page local menu state (avoid collisions)
  const [nbMenuOpen, setNbMenuOpen] = useState(false);
  const [nbMenuPos, setNbMenuPos] = useState({ top: 72, right: 16 });
  const suppressClickRef = useRef(false);

  const load = async () => {
    const { data } = await api.get(`/numbers`);
    // нормализуем даты (из бэка приходят ISO-строки)
    let arr = data.map(n => ({
      ...n,
      createdAtMs: n.createdAt ? Date.parse(n.createdAt) || 0 : 0,
      updatedAtMs: n.updatedAt ? Date.parse(n.updatedAt) || 0 : 0,
    }));
    // фильтрация по операторам
    arr = arr.filter(n => opFilter[n.operatorKey]);
    // сортировка
    if (sortKey === 'new') arr = arr.slice().sort((a,b)=> (b.createdAtMs||0) - (a.createdAtMs||0));
    if (sortKey === 'old') arr = arr.slice().sort((a,b)=> (a.createdAtMs||0) - (b.createdAtMs||0));
    if (sortKey === 'usedMost') arr = arr.slice().sort((a,b)=> (b.usedCount||0) - (a.usedCount||0));
    if (sortKey === 'usedLeast') arr = arr.slice().sort((a,b)=> (a.usedCount||0) - (b.usedCount||0));
    setItems(arr);
  };
  useEffect(() => { load(); }, [sortKey, opFilter]);

  const onPhoneChange = (val) => {
    setForm((f) => ({ ...f, phone: formatRuPhonePartial(val) }));
  };

  const save = async () => {
    try {
      if (editing) {
        await api.put(`/numbers/${editing.id}`, form);
      } else {
        await api.post(`/numbers`, form);
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ phone: "", operatorKey: "mts" });
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка сохранения");
    }
  };

  const del = async (id) => {
    if (!confirm("Удалить номер?")) return;
    await api.delete(`/numbers/${id}`);
    load();
  };

  const openContext = (n) => { suppressClickRef.current = true; setCtxTarget(n); setCtxOpen(true); };

  const onItemClick = (n) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    nav(`/numbers/${n.id}`);
  };

  const startEdit = (n) => {
    setEditing(n);
    setForm({ phone: n.phone, operatorKey: n.operatorKey });
    setShowDialog(true);
    setCtxOpen(false);
  };

  return (
    <Page title="НОМЕРА" hideHeader topPadClass="pt-3" padX={false}>
      <div className="p-0 section">
        <div className="numbers-topbar">
          <button className="filter-btn" onClick={()=> setSortOpen(true)}>Сортировка</button>
          <button className="filter-btn" onClick={()=> setOpsOpen(true)}>Операторы</button>
        </div>
        <div>
          {items.map((n) => (
            <LongPressable
              key={n.id}
              className="flex items-center gap-3 number-item"
              duration={0}
              onClick={() => onItemClick(n)}
            >
              <div className="w-9 h-9 flex items-center justify-center overflow-hidden rounded-[3px]">
                <img alt="logo" src={OPERATORS[n.operatorKey]?.icon} className="w-6 h-6 object-contain rounded-[3px]"/>
              </div>
              <div className="flex-1">{n.phone}</div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { setEditing(null); setForm({ phone: "", operatorKey: "mts" }); setShowDialog(true); }} title="Добавить номер">+
      </button>

      {sortOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setSortOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Сортировка</div>
            <div className="grid menu-list">
              {[
                { key: 'new', label: 'Сначала новые' },
                { key: 'old', label: 'Сначала старые' },
                { key: 'usedMost', label: 'Наиболее используемые' },
                { key: 'usedLeast', label: 'Наименее используемые' },
              ].map(opt => (
                <button key={opt.key} className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setSortKey(opt.key); setSortOpen(false); }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {opsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setOpsOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Операторы</div>
            <div className="grid menu-list">
              {Object.keys(OPERATORS).map(key => (
                <label key={key} className="flex items-center px-3 py-2 cursor-pointer">
                  <input type="checkbox" className="ops-check" checked={!!opFilter[key]} onChange={(e)=> setOpFilter(prev=> ({...prev, [key]: e.target.checked}))} />
                  <img alt="op" src={OPERATORS[key].icon} className="w-6 h-6 rounded-[3px] mr-2" />
                  <span>{OPERATORS[key].name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end items-center gap-3 mt-3">
              {/* Заменено на квадратные кнопки 43x43 как на странице места */}
              <button className="mass-box on" onClick={()=>{
                const all = {}; Object.keys(OPERATORS).forEach(k => all[k]=true); setOpFilter(all);
              }} aria-label="Выбрать все" />
              <button className="mass-box off" onClick={()=>{
                const none = {}; Object.keys(OPERATORS).forEach(k => none[k]=false); setOpFilter(none);
              }} aria-label="Снять все" />
              <button className="btn btn-primary" onClick={()=>setOpsOpen(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowDialog(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать номер" : "Добавить номер"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Номер" value={form.phone} onChange={(e)=>onPhoneChange(e.target.value)} />
              <select className="search-input" value={form.operatorKey} onChange={(e)=>setForm({...form, operatorKey: e.target.value})}>
                {Object.entries(OPERATORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={()=>setShowDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctxOpen && ctxTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => startEdit(ctxTarget)}>Редактировать</button>
            <button className="w-full px-4 py-3 text-left text-red-600 hover:bg-neutral-50" onClick={() => { del(ctxTarget.id); setCtxOpen(false); }}>Удалить</button>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </Page>
  );
}

function NumberDetails({ id }) {
  const nav = useNavigate();
  const [number, setNumber] = useState(null);
  const [usage, setUsage] = useState({ used: [], unused: [] });
  const [usedMap, setUsedMap] = useState({}); // placeId -> used
  const initialMapRef = useRef({});
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const pendingRouteRef = useRef(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", operatorKey: "mts" });
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);
  // контекстное меню (локально для страницы номера)
  const nbDotsRef = useRef(null);
  const [nbMenuOpen, setNbMenuOpen] = useState(false);
  const [nbMenuPos, setNbMenuPos] = useState({ top: 72, left: null, right: '1vw' });
  const [lastAt, setLastAt] = useState(null);
  const [hasAnySavedUsage, setHasAnySavedUsage] = useState(false);
  // Локальное подтверждение изменения usage на странице номера
  // Фильтры на странице номера
  const [sortOpen, setSortOpen] = useState(false);
  const [placesOpen, setPlacesOpen] = useState(false);
  const [sortKey, setSortKey] = useState('recentUsed');
  const [placeFilter, setPlaceFilter] = useState({}); // placeId -> bool (показывать)
  // Локальное подтверждение изменения usage на странице номера
  const [nbUsageConfirm, setNbUsageConfirm] = useState({ open: false, targetId: null, next: false });
  // Debug overlay for ⋮ button
  const [debugDots, setDebugDots] = useState(false);
  const [dbg, setDbg] = useState({ clicks: 0, last: '-' });
  const [dotRect, setDotRect] = useState(null);

  const openNbMenu = (e) => {
    try {
      if (e && e.stopPropagation) e.stopPropagation();
      if (e && e.cancelable && e.preventDefault) e.preventDefault();
    } catch {}
    requestAnimationFrame(() => {
      try {
        const rect = nbDotsRef.current ? nbDotsRef.current.getBoundingClientRect() : null;
        if (rect) {
          const menuW = 280;
          const pad = 8;
          let left = Math.min(Math.max(0, rect.right - menuW), window.innerWidth - menuW - pad);
          let top = Math.max(0, rect.bottom + pad);
          setNbMenuPos({ top, left, right: null });
          setDotRect({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
        } else {
          setNbMenuPos(prev => ({ ...prev, right: '1vw' }));
          setDotRect(null);
        }
      } catch {}
      setNbMenuOpen(true);
      setDbg({ clicks: dbg.clicks + 1, last: new Date().toLocaleTimeString() });
    });
  };


  const load = async () => {
    const [n, u] = await Promise.all([
      api.get(`/numbers/${id}`),
      api.get(`/numbers/${id}/usage?_t=${Date.now()}`),
    ]);
    setNumber(n.data);
    // lastAt теперь берём из lastEventAt если он есть
    setLastAt(u.data?.lastEventAt || n.data?.updatedAt || n.data?.lastActionAt || n.data?.createdAt || null);
    // Подготовим usage со временем использования usedAt
    const usedWith = (u.data.used || []).map(p => ({...p, usedAtMs: p.usedAt ? Date.parse(p.usedAt) || 0 : 0, createdAtMs: p.createdAt ? Date.parse(p.createdAt) || 0 : 0}));
    const unusedWith = (u.data.unused || []).map(p => ({...p, usedAtMs: 0, createdAtMs: p.createdAt ? Date.parse(p.createdAt) || 0 : 0}));
    setUsage({ used: usedWith, unused: unusedWith });
    const m = {};
    [...usedWith, ...unusedWith].forEach(p => { m[p.id] = !!(usedWith.find(x=>x.id===p.id)); });
    setUsedMap(m);
    initialMapRef.current = { ...m };
    setHasAnySavedUsage(!!u.data?.lastEventAt);
    // инициализация фильтра мест: по умолчанию все видимы
    const allPlaces = [...usedWith, ...unusedWith];
    const pf = {}; allPlaces.forEach(p => { pf[p.id] = true; });
    setPlaceFilter(pf);
  };

  useEffect(() => { load(); }, [id]);


  const deleteNumber = async () => {
    try {
      await api.delete(`/numbers/${id}`);
      // Navigate back to numbers page
      window.location.href = '/numbers';
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось удалить номер. Повторите позже");
    }
    setDeleteConfirmOpen(false);
  };

  const openEditDialog = () => {
    if (number) {
      setEditForm({ phone: number.phone, operatorKey: number.operatorKey });
      setEditDialogOpen(true);
    }
  };

  const saveEditedNumber = async () => {
    try {
      await api.put(`/numbers/${id}`, editForm);
      await load();
      setEditDialogOpen(false);
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось обновить номер. Повторите позже");
    }
  };

  if (!number) return <Page title="Загрузка..."/>;
  return (
    <Page title={number.phone} hideHeader>
      <div className="p-0 section" data-page="number">
        <div className="place-head-frame">
          {/* Слой 1: контейнер шапки */}
          <div className="flex items-start justify-between gap-3">
            {/* Слой 2: левая часть (лого + тексты) */}
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Слой 3: логотип оператора */}
              <img alt="operator" className="object-cover" style={{ width: '48px', height: '48px', borderRadius: '2%', marginLeft: '-3px' }} src={OPERATORS[number.operatorKey]?.icon} />
              {/* Слой 4: блок текста (номер + последнее действие) */}
              <div className="flex flex-col flex-1 min-w-0" style={{ height: '48px', justifyContent: 'space-between' }}>
                {/* Заголовок: номер */}
                <div className="marquee text-2xl font-semibold min-w-0" style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 1 }} ref={el=>{
                  if (!el) return;
                  const check = () => {
                    const span = el.querySelector('span');
                    if (!span) return;
                    const overflow = span.scrollWidth > el.clientWidth;
                    el.setAttribute('data-overflow', overflow ? 'true' : 'false');
                  };
                  requestAnimationFrame(check);
                  window.addEventListener('resize', check);
                }}>
                  <span style={{ lineHeight: 1 }}>{formatRuPhonePartial(number.phone || '')}</span>
                </div>
                {/* Инфострока под номером: если были сохранённые usage-изменения — показываем "Последнее событие"; иначе — "Добавлен" с датой создания */}
                <div className="text-xs text-neutral-600 truncate" style={{ lineHeight: 1 }}>
                  {(() => {
                    const pad = (n) => String(n).padStart(2, '0');
                    if (hasAnySavedUsage && lastAt) {
                      const d = new Date(lastAt);
                      const DD = pad(d.getDate());
                      const MM = pad(d.getMonth()+1);
                      const YYYY = d.getFullYear();
                      const HH = pad(d.getHours());
                      const mm = pad(d.getMinutes());
                      return (<><span className="font-bold">Последнее событие:</span> {`${DD}.${MM}.${YYYY} в ${HH}.${mm}`}</>);
                    }
                    if (number?.createdAt) {
                      const d = new Date(number.createdAt);
                      const DD = pad(d.getDate());
                      const MM = pad(d.getMonth()+1);
                      const YYYY = d.getFullYear();
                      const HH = pad(d.getHours());
                      const mm = pad(d.getMinutes());
                      return (<><span className="font-bold">Добавлен:</span> {`${DD}.${MM}.${YYYY} в ${HH}.${mm}`}</>);
                    }
                    return '';
                  })()}
                </div>
              </div>
            </div>
            {/* Слой 5: три точки */}
            <div className="relative" style={{ alignSelf: 'flex-start', marginRight: '-5px', zIndex: 20001 }}>
              <button
                type="button"
                ref={nbDotsRef}
                onClick={openNbMenu}
                onPointerUp={openNbMenu}
                onTouchEnd={openNbMenu}
                className="select-none place-dots dots-btn"
                title="Меню"
                style={{ touchAction: 'manipulation' }}
              >
                ⋮
              </button>
            </div>
          </div>
        </div>


        {debugDots && dotRect && (
          <div style={{ position: 'fixed', left: dotRect.x, top: dotRect.y, width: dotRect.w, height: dotRect.h, border: '2px solid red', zIndex: 2147483646, pointerEvents: 'none' }} />
        )}
        {debugDots && (
          <div style={{ position: 'fixed', right: 6, top: 6, background: '#000', color: '#0f0', padding: '6px 8px', fontSize: 12, zIndex: 2147483647 }}>
            ⋮ dbg: {dbg.clicks} taps, last {dbg.last}
          </div>
        )}

        {debugDots && (
          <div style={{ position: 'fixed', right: 6, bottom: 6, zIndex: 2147483647 }}>
            <button className="btn" onClick={() => setDebugDots((v)=>!v)}>{debugDots ? 'Debug ⋮ ON' : 'Debug ⋮ OFF'}</button>
          </div>
        )}

        {nbMenuOpen && createPortal(
          <div className="fixed inset-0 bg-black/50" style={{ zIndex: 2147483647 }} onClick={() => setNbMenuOpen(false)}>
            <div className="absolute" style={{ top: nbMenuPos.top, left: nbMenuPos.left ?? 'auto', right: nbMenuPos.right ?? 'auto', zIndex: 2147483646 }} onClick={(e)=>e.stopPropagation()}>
              <div className="bg-white modal-panel shadow-xl w-[280px] p-2 menu-list" style={{ pointerEvents: 'auto' }}>
                <button className="w-full px-3 py-2 text-left hover:bg-neutral-50" onClick={() => { openEditDialog(); setNbMenuOpen(false); }}>Редактировать</button>
                <button className="w-full px-3 py-2 text-left text-red-600 hover:bg-neutral-50" onClick={() => { setDeleteConfirmOpen(true); setNbMenuOpen(false); }}>Удалить</button>
              </div>
            </div>
          </div>, document.body)}

        {/* Диалог сортировки мест на странице номера */}
        {sortOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setSortOpen(false)}>
            <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Сортировка</div>
              <div className="grid menu-list">
                {[ 
                  { key:'recentUsed', label:'Последние использованные' },
                  { key:'longUnused', label:'Давно не использовались' },
                  { key:'new', label:'Сначала новые' },
                  { key:'old', label:'Сначала старые' },
                ].map(opt => (
                  <button key={opt.key} className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setSortKey(opt.key); setSortOpen(false); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Диалог фильтра по местам (checkbox как у операторов) */}
        {placesOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setPlacesOpen(false)}>
            <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Места</div>
              <div className="grid menu-list max-h-[60vh] overflow-y-auto">
                {[...(usage.used||[]), ...(usage.unused||[])]
                  .sort((a,b)=> (a.name||'').localeCompare(b.name||''))
                  .map(p => (
                  <label key={p.id} className="flex items-center px-3 py-2 cursor-pointer">
                    <input type="checkbox" className="ops-check" checked={!!placeFilter[p.id]} onChange={(e)=> setPlaceFilter(prev=> ({...prev, [p.id]: e.target.checked}))} />
                    <div className="w-6 h-6 bg-neutral-200 overflow-hidden flex items-center justify-center sugg-box mr-2">
                      {p.hasLogo && <img alt="logo" className="w-6 h-6 object-cover sugg-logo" src={`${API}/places/${p.id}/logo?v=${Date.now()}`} />}
                    </div>
                    <span>{p.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end items-center gap-3 mt-3">
                {/* Массовые чекбоксы — квадратные 43x43 без текста */}
                <button className="mass-box on" onClick={()=>{
                  const pf = {}; [...(usage.used||[]), ...(usage.unused||[])].forEach(p => pf[p.id] = true); setPlaceFilter(pf);
                }} aria-label="Выбрать все" />
                <button className="mass-box off" onClick={()=>{
                  const pf = {}; [...(usage.used||[]), ...(usage.unused||[])].forEach(p => pf[p.id] = false); setPlaceFilter(pf);
                }} aria-label="Снять все" />
                <button className="btn btn-primary" onClick={()=>setPlacesOpen(false)}>OK</button>
              </div>
            </div>
          </div>
        )}

        {/* Меняем местами: сначала инструкция, затем панель */}
        <div className="text-sm text-neutral-600 list-width"><span className="whitespace-nowrap tracking-tight">Отмечайте галочкой места, где номер использован:</span></div>
        <div className="numbers-topbar">
          <button className="filter-btn" onClick={()=> setSortOpen(true)}>Сортировка</button>
          <button className="filter-btn" onClick={()=> setPlacesOpen(true)}>Места</button>
        </div>

        <div>
          {[...(usage.used||[]), ...(usage.unused||[])]
            .filter(p => !!placeFilter[p.id])
            .sort((a,b)=>{
              if (sortKey==='recentUsed') return (b.usedAtMs||0) - (a.usedAtMs||0);
              if (sortKey==='longUnused') return (a.usedAtMs||0) - (b.usedAtMs||0);
              if (sortKey==='new') return (b.createdAtMs||0) - (a.createdAtMs||0);
              if (sortKey==='old') return (a.createdAtMs||0) - (b.createdAtMs||0);
              return 0;
            })
            .map((p)=> (
            <div key={p.id} className="list-row">
              <div className="op"><img alt="logo" src={`${API}/places/${p.id}/logo`} onError={(e)=>{ e.currentTarget.style.display='none'; }} /></div>
              <div className="phone font-medium">{p.name}</div>
              <div className="check">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={!!usedMap[p.id]}
                  onChange={(e)=> {
                    const next = e.target.checked;
                    setNbUsageConfirm({ open: true, targetId: p.id, next });
                  }}
                />

      {nbUsageConfirm.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>
          <div className="bg-white modal-panel w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Подтверждение</div>
            <div className="text-sm text-neutral-600">Вы уверены, что хотите изменить статус использования?</div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={async () => {
                // сохранить usage немедленно
                try {
                  await api.post(`/usage`, { numberId: id, placeId: nbUsageConfirm.targetId, used: nbUsageConfirm.next });
                } catch (e) {}
                setUsedMap(prev => ({ ...prev, [nbUsageConfirm.targetId]: nbUsageConfirm.next }));
                initialMapRef.current = { ...initialMapRef.current, [nbUsageConfirm.targetId]: nbUsageConfirm.next };
                window.__unsaved = false;
                setNbUsageConfirm({ open: false, targetId: null, next: false });
              }}>Да</button>
              <button className="btn btn-text" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>Отмена</button>
            </div>
          </div>
        </div>
      )}
              </div>
            </div>
          ))}
        </div>


      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 modal-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Удалить номер</div>
            <div className="text-sm text-neutral-600 mb-4">
              Вы уверены, что хотите удалить номер "{number?.phone}"? Это действие нельзя отменить.
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={() => setDeleteConfirmOpen(false)}>Отмена</button>
              <button className="px-4 py-2 bg-red-600 text-white" onClick={deleteNumber}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 modal-overlay" onClick={() => setEditDialogOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Редактировать номер</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НОМЕР ТЕЛЕФОНА" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: formatRuPhonePartial(e.target.value) })} />
              <select className="search-input" value={editForm.operatorKey} onChange={(e) => setEditForm({ ...editForm, operatorKey: e.target.value })}>


                {Object.entries(OPERATORS).map(([key, op]) => (
                  <option key={key} value={key}>{op.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={() => setEditDialogOpen(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={saveEditedNumber}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {nbUsageConfirm.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>
          <div className="bg-white modal-panel w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Подтверждение</div>
            <div className="text-sm text-neutral-600">Вы уверены, что хотите изменить статус использования?</div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await api.post(`/usage`, { numberId: id, placeId: nbUsageConfirm.targetId, used: nbUsageConfirm.next });
                } catch (e) {}
                setUsedMap(prev => ({ ...prev, [nbUsageConfirm.targetId]: nbUsageConfirm.next }));
                initialMapRef.current = { ...initialMapRef.current, [nbUsageConfirm.targetId]: nbUsageConfirm.next };
                window.__unsaved = false;
                setNbUsageConfirm({ open: false, targetId: null, next: false });
              }}>Да</button>
              <button className="btn btn-text" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>Отмена</button>
            </div>
          </div>
        </div>
      )}

    </Page>
  );
}

function PlaceDetails({ id }) {
  const [place, setPlace] = useState(null);
  const [usage, setUsage] = useState({ used: [], unused: [] });
  const [usedMap, setUsedMap] = useState({}); // numberId -> used
  const initialMapRef = useRef({});
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoData, setPromoData] = useState({ code: "", url: "" });
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [copied, setCopied] = useState({ code: false, url: false });
  useEffect(() => { if (promoOpen) setCopied({ code: false, url: false }); }, [promoOpen]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const pendingRouteRef = useRef(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ 
    name: "", 
    category: "Магазины", 
    promoCode: "", 
    promoCode2: "", 
    promoUrl: "", 
    comment: "", 
    logo: null 
  });
  const [showExtraPromo, setShowExtraPromo] = useState(false);
  const [showPromoUrl, setShowPromoUrl] = useState(false);
  const [tab, setTab] = useState('unused');
  // Панель сортировки/операторов для страницы места
  const [plSortOpen, setPlSortOpen] = useState(false);
  const [plOpsOpen, setPlOpsOpen] = useState(false);
  const [plSortKey, setPlSortKey] = useState('recentUsed');
  const [opFilter, setOpFilter] = useState(Object.keys(OPERATORS).reduce((a,k)=> (a[k]=true,a), {}));
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);
  // Локальное подтверждение изменения usage на странице места
  const [nbUsageConfirm, setNbUsageConfirm] = useState({ open: false, targetId: null, next: false });

  const load = async () => {
    const [p, u] = await Promise.all([
      api.get(`/places/${id}`),
      api.get(`/places/${id}/usage?_t=${Date.now()}`),
    ]);
    setPlace(p.data);
    const usedWith = (u.data.used || []).map(n => ({...n, usedAtMs: n.usedAt ? Date.parse(n.usedAt) || 0 : 0, createdAtMs: n.createdAt ? Date.parse(n.createdAt) || 0 : 0}));
    const unusedWith = (u.data.unused || []).map(n => ({...n, usedAtMs: 0, createdAtMs: n.createdAt ? Date.parse(n.createdAt) || 0 : 0}));
    setUsage({ used: usedWith, unused: unusedWith });
    const m = {};
    [...usedWith, ...unusedWith].forEach(n => { m[n.id] = !!(usedWith.find(x=>x.id===n.id)); });
    setUsedMap(m);
    initialMapRef.current = { ...m };
  };
  useEffect(() => { load(); }, [id]);

  // Убрали глобальные несохранённые изменения на странице места — сохраняем сразу после подтверждения

  const openPromoDialog = async () => {
    try {
      const { data } = await api.get(`/places/${id}`);
      setPromoData({ code: data.promoCode || "", url: data.promoUrl || "" });
    } catch (e) {
      setPromoData({ code: place.promoCode || "", url: place.promoUrl || "" });
    }
    setPromoOpen(true);
  };

  const deletePlace = async () => {
    try {
      await api.delete(`/places/${id}`);
      // Navigate back to places page
      window.location.href = '/places';
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось удалить место. Повторите позже");
    }
    setDeleteConfirmOpen(false);
  };

  const openEditDialog = () => {
    if (place) {
      setEditForm({ 
        name: place.name, 
        category: place.category, 
        promoCode: place.promoCode || "", 
        promoCode2: "", 
        promoUrl: place.promoUrl || "", 
        comment: place.comment || "", 
        logo: null 
      });
      setShowExtraPromo(false);
      setShowPromoUrl(!!place.promoUrl);
      setEditDialogOpen(true);
    }
  };

  const saveEditedPlace = async () => {
    try {
      const fd = new FormData();
      fd.append("name", editForm.name);
      fd.append("category", editForm.category);
      fd.append("promoCode", editForm.promoCode);
      fd.append("promoUrl", editForm.promoUrl);
      fd.append("comment", editForm.comment);
      if (editForm.logo) fd.append("logo", editForm.logo);
      await api.put(`/places/${id}`, fd);
      await load();
      setEditDialogOpen(false);
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось обновить место. Повторите позже");
    }
  };

  const handleEditPlusClick = (e) => {
    e.preventDefault();
    const now = Date.now();
    const lastClick = e.currentTarget.lastClick || 0;
    
    if (now - lastClick < 300) { // Double click
      setShowPromoUrl(true);
    } else { // Single click
      setShowExtraPromo(true);
    }
    
    e.currentTarget.lastClick = now;
  };

  if (!place) return <Page title="Загрузка..."/>;
  return (
    <Page title={place.name} hideHeader padX={false}>
      <div className="p-0 section place-header" data-page="place">
        <div className="place-head-frame">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
            {place.hasLogo && (
              <img alt={place.name} className="w-20 h-20 object-cover" style={{ borderRadius: '2%', marginLeft: '-3px' }} src={`${API}/places/${id}/logo`} />
            )}
            <div className="flex flex-col min-w-0" style={{ width: 'calc(100vw - 23px - 80px - 12px - 1px)', marginRight: '-15px' }}>
              <div className="marquee text-2xl font-semibold min-w-0" style={{ display: 'flex', alignItems: 'flex-start', lineHeight: 1 }} ref={el=>{
                if (!el) return;
                const check = () => {
                  const span = el.querySelector('span');
                  if (!span) return;
                  const overflow = span.scrollWidth > el.clientWidth;
                  el.setAttribute('data-overflow', overflow ? 'true' : 'false');
                };
                requestAnimationFrame(check);
                window.addEventListener('resize', check);
              }}>
                <span style={{ lineHeight: 1 }}>{place.name}</span>
              </div>
              <div className="text-xs text-neutral-600 truncate" style={{ lineHeight: 1 }}>
                {(() => {
                  const pad = (n) => String(n).padStart(2, '0');
                  const src = place?.updatedAt || place?.lastActionAt;
                  if (!src) return '';
                  const d = new Date(src);
                  const DD = pad(d.getDate());
                  const MM = pad(d.getMonth()+1);
                  const YYYY = d.getFullYear();
                  const HH = pad(d.getHours());
                  const mm = pad(d.getMinutes());
                  return (<><span className="font-medium">Последнее действие:</span> {`${DD}.${MM}.${YYYY} в ${HH}:${mm}`}</>);
                })()}
              </div>
              {place?.comment && (
                <div
                  className="place-comment whitespace-pre-line mt-1 clamp-2 cursor-pointer"
                  style={{ width: 'calc(-126px + 100vw)', marginRight: '1px' }}
                  onClick={() => setCommentDialogOpen(true)}
                >
                  {place.comment}
                </div>
              )}
              <div className="text-[10px] text-neutral-500 mt-1">7777777</div>
              <div className="text-xs text-neutral-600 truncate" style={{ lineHeight: 1 }}>
                {(() => {
                  const pad = (n) => String(n).padStart(2, '0');
                  const src = place?.updatedAt || place?.lastActionAt;
                  if (!src) return '';
                  const d = new Date(src);
                  const DD = pad(d.getDate());
                  const MM = pad(d.getMonth()+1);
                  const YYYY = d.getFullYear();
                  const HH = pad(d.getHours());
                  const mm = pad(d.getMinutes());
                  return (<><span className="font-medium">Последнее действие:</span> {`${DD}.${MM}.${YYYY} в ${HH}:${mm}`}</>);
                })()}
              </div>

            </div>

          </div>
          <div className="relative" style={{ alignSelf: 'flex-start', marginRight: '-5px' }}>
            <button
              onClick={(e)=>{ e.stopPropagation(); setCtxOpen(true); setCtxTarget(place); }}
              className="select-none place-dots dots-btn"
              title="Меню"
            >
              ⋮
            </button>
          </div>
        </div>

        </div>
      </div>

      {/* Меняем местами: сначала панель, затем инструкция */}
      <div className="numbers-topbar places-topbar" style={{ marginTop: '8px' }}>
        <button className="filter-btn" onClick={()=> setPlSortOpen(true)}>Сортировка</button>
        <button className="filter-btn" onClick={()=> setPlOpsOpen(true)}>Операторы</button>
      </div>
      <div className="mt-5 px-[var(--pad-x)] text-sm text-neutral-600">Отмечайте галочкой использованные номера:</div>

      <div>
        {[...(usage.used||[]), ...(usage.unused||[])]
          .filter(n => !!opFilter[n.operatorKey])
          .sort((a,b)=>{
            if (plSortKey==='recentUsed') return (b.usedAtMs||0) - (a.usedAtMs||0);
            if (plSortKey==='longUnused') return (a.usedAtMs||0) - (b.usedAtMs||0);
            if (plSortKey==='new') return (b.createdAtMs||0) - (a.createdAtMs||0);
            if (plSortKey==='old') return (a.createdAtMs||0) - (b.createdAtMs||0);
            return 0;
          })
          .map((n)=> (
          <div key={n.id} className="list-row">
            <div className="op"><img alt="logo" src={OPERATORS[n.operatorKey]?.icon} /></div>
            <div className="phone font-medium">{n.phone}</div>
            <div className="check">
              <input
                type="checkbox"
                className="checkbox"
                checked={!!usedMap[n.id]}
                onChange={(e)=> {
                  setNbUsageConfirm({ open: true, targetId: n.id, next: e.target.checked });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {commentDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={()=>setCommentDialogOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Комментарий</div>
            <div className="grid gap-3">
              <div className="text-base whitespace-pre-wrap">{place.comment}</div>
              <div className="flex justify-end">
                <button className="px-4 py-2" onClick={()=>setCommentDialogOpen(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Диалог сортировки номеров (страница места) */}
      {plSortOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10020]" onClick={()=>setPlSortOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-sm relative z-[10021]" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Сортировка</div>
            <div className="grid menu-list">
              {[
                { key:'recentUsed', label:'Последние использованные' },
                { key:'longUnused', label:'Давно не использовались' },
                { key:'new', label:'Сначала новые' },
                { key:'old', label:'Сначала старые' },
              ].map(opt => (
                <button key={opt.key} className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setPlSortKey(opt.key); setPlSortOpen(false); }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Диалог операторов (страница места) */}
      {plOpsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10020]" onClick={()=>setPlOpsOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-sm relative z-[10021]" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Операторы</div>
            <div className="grid menu-list">
              {Object.keys(OPERATORS).map(key => (
                <label key={key} className="flex items-center px-3 py-2 cursor-pointer">
                  <input type="checkbox" className="ops-check" checked={!!opFilter[key]} onChange={(e)=> setOpFilter(prev=> ({...prev, [key]: e.target.checked}))} />
                  <img alt="op" src={OPERATORS[key].icon} className="w-6 h-6 rounded-[3px] mr-2" />
                  <span>{OPERATORS[key].name}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end items-center gap-3 mt-3">
              <button className="mass-box on" onClick={()=>{ const all = {}; Object.keys(OPERATORS).forEach(k=> all[k]=true); setOpFilter(all); }} aria-label="Выбрать все" />
              <button className="mass-box off" onClick={()=>{ const none = {}; Object.keys(OPERATORS).forEach(k=> none[k]=false); setOpFilter(none); }} aria-label="Снять все" />
              <button className="btn btn-primary" onClick={()=>setPlOpsOpen(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {promoOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={()=>setPromoOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Промо-материалы</div>
            <div className="grid gap-3">
              {(() => { const code = promoData.code || place?.promoCode || ""; return code ? (
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Актуальный промокод</div>
                  <div className="promo-row">
                    <div className="promo-text search-input" style={{ padding: '8px 10px' }}>{copied.code ? 'СКОПИРОВАНО' : code}</div>
                    <button className="btn-copy" title="Скопировать" onClick={()=>{ navigator.clipboard.writeText(code); setCopied(prev=>({...prev, code:true})); }}>{"⧉"}</button>
                  </div>
                </div>
              ) : null; })()}

              {(() => { const url = promoData.url || place?.promoUrl || ""; if (url) return (
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Ссылка на акцию</div>
                  <div className="promo-row">
                    <div className="promo-text search-input" style={{ padding: '8px 10px' }}>{copied.url ? 'СКОПИРОВАНО' : url}</div>
                    <button className="btn-copy" title="Скопировать" onClick={()=>{ navigator.clipboard.writeText(url); setCopied(prev=>({...prev, url:true})); }}>⧉</button>
                  </div>
                </div>
              ); })()}

              <div className="flex justify-end">
                <button className="px-4 py-2" onClick={()=>setPromoOpen(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctxOpen && (
        <div className="fixed inset-0 bg-black/50 z-[10001]" onClick={() => setCtxOpen(false)}>
          <div className="absolute" style={{ top: '72px', right: '1vw', zIndex: 10002 }} onClick={(e)=>e.stopPropagation()}>
            <div className="bg-white modal-panel shadow-xl w-[280px] p-2 menu-list">
              {(place?.hasPromo || place?.promoCode || place?.promoUrl) && (
              <button className="w-full px-3 py-2 text-left hover:bg-neutral-50" onClick={() => { openPromoDialog(); setCtxOpen(false); }}>Промо‑материалы</button>
            )}
              <button className="w-full px-3 py-2 text-left hover:bg-neutral-50" onClick={() => { openEditDialog(); setCtxOpen(false); }}>Редактировать</button>
              <button className="w-full px-3 py-2 text-left text-red-600 hover:bg-neutral-50" onClick={() => { setDeleteConfirmOpen(true); setCtxOpen(false); }}>Удалить</button>
              <button className="w-full px-3 py-2 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 modal-overlay" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Удалить место</div>
            <div className="text-sm text-neutral-600 mb-4">
              Вы уверены, что хотите удалить место "{place?.name}"? Это действие нельзя отменить.
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={() => setDeleteConfirmOpen(false)}>Отмена</button>
              <button className="px-4 py-2 bg-red-600 text-white" onClick={deletePlace}>Удалить</button>
            </div>
          </div>
        </div>
      )}

      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setEditDialogOpen(false)}>
          <div className="bg-white modal-panel keyboard-aware w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2 sticky top-0 bg-white">Редактировать место</div>
            <div className="grid gap-3 pb-4">
              <input className="search-input" placeholder="Название" value={editForm.name} onChange={(e)=>setEditForm({...editForm, name: e.target.value})} />
              <select className="search-input" value={editForm.category} onChange={(e)=>setEditForm({...editForm, category: e.target.value})}>
                {['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'].map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              
              {/* Промокод с плюсиком */}
              <div className="flex items-center gap-2">
                <input 
                  className="search-input flex-1" 
                  placeholder="Промокод" 
                  value={editForm.promoCode} 
                  onChange={(e)=>setEditForm({...editForm, promoCode: e.target.value})} 
                />
                <button 
                  type="button"
                  className="bg-green-100 text-green-700 hover:bg-green-200 font-bold text-lg w-[43px] h-[43px] flex items-center justify-center p-0 rounded-none"
                  onClick={handleEditPlusClick}
                  title="Добавить поле"
                >
                  +
                </button>
              </div>
              
              {/* Дополнительный промокод */}
              {showExtraPromo && (
                <input 
                  className="search-input" 
                  placeholder="Дополнительный промокод" 
                  value={editForm.promoCode2} 
                  onChange={(e)=>setEditForm({...editForm, promoCode2: e.target.value})} 
                />
              )}
              
              {/* Ссылка на акцию */}
              {showPromoUrl && (
                <input 
                  className="search-input" 
                  placeholder="Ссылка на акцию" 
                  value={editForm.promoUrl} 
                  onChange={(e)=>setEditForm({...editForm, promoUrl: e.target.value})} 
                />
              )}
              
              {/* Комментарий */}
              <textarea 
                className="search-input" 
                placeholder="Комментарий" 
                value={editForm.comment} 
                onChange={(e)=>{
                  const val = e.target.value;
                  setEditForm({...editForm, comment: val});
                  // динамически увеличиваем высоту, если текст большой
                  const lines = val.split('\n').length + Math.floor(val.length / 80);
                  const base = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-h')) || 43;
                  const factor = lines > 4 ? 3 : (lines > 2 ? 2 : 1.5);
                  e.target.style.minHeight = (base * factor) + 'px';
                }}
                onFocus={(e)=>{
                  ensureFieldVisible(e.target);
                  const bn = document.querySelector('.bottom-nav');
                  const h = bn ? bn.getBoundingClientRect().height : 56;
                  document.documentElement.style.setProperty('--vv-lift', h + 'px');
                }}
                onBlur={() => {
                  document.documentElement.style.setProperty('--vv-lift', '0px');
                }}
              />
              
              <label className="file-field cursor-pointer">
                <input className="hidden" type="file" accept="image/*" capture="environment" onClick={(e)=>{ try{ e.target.removeAttribute('capture'); }catch(_){} }} onChange={(e)=>setEditForm({...editForm, logo: e.target.files?.[0] || null})} />
                <span className="file-choose-btn">Обзор</span>
                <span className={`file-name ${editForm.logo ? 'has-file' : ''}`}>{editForm.logo ? (editForm.logo.name || editForm.logo) : 'Файл не выбран'}</span>
              </label>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={() => setEditDialogOpen(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={saveEditedPlace}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {nbUsageConfirm.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>
          <div className="bg-white modal-panel w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Подтверждение</div>
            <div className="text-sm text-neutral-600">Вы уверены, что хотите изменить статус использования?</div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={async () => {
                try {
                  await api.post(`/usage`, { numberId: nbUsageConfirm.targetId, placeId: id, used: nbUsageConfirm.next });
                } catch (e) {}
                setUsedMap(prev => ({ ...prev, [nbUsageConfirm.targetId]: nbUsageConfirm.next }));
                initialMapRef.current = { ...initialMapRef.current, [nbUsageConfirm.targetId]: nbUsageConfirm.next };
                window.__unsaved = false;
                setNbUsageConfirm({ open: false, targetId: null, next: false });
              }}>Да</button>
              <button className="btn btn-text" onClick={() => setNbUsageConfirm({ open: false, targetId: null, next: false })}>Отмена</button>
            </div>
          </div>
        </div>
      )}

    </Page>
  );
}

function PlacesPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoData, setPromoData] = useState({ code: "", url: "" });
  const [form, setForm] = useState({ 
    name: "", 
    category: "", 
    promoCode: "", 
    promoCode2: "", 
    promoUrl: "", 
    comment: "", 
    logo: null 
  });
  const [showExtraPromo, setShowExtraPromo] = useState(false);
  const [showPromoUrl, setShowPromoUrl] = useState(false);
  const [filter, setFilter] = useState({ category: "", sort: "popular" });
  const [sortOpen, setSortOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const SORT_OPTIONS = [
    { key: 'new', label: 'Сначала новые' },
    { key: 'old', label: 'Сначала старые' },
    { key: 'popular', label: 'Наиболее используемые' },
    { key: 'least', label: 'Наименее используемые' },
  ];
  const CAT_OPTIONS = ['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'];
  const [editing, setEditing] = useState(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);
  const suppressClickRef = useRef(false);

  const load = async () => {
    const { data } = await api.get(`/places`, { params: filter });
    setItems(data);
  };
  useEffect(() => { load(); }, [filter]);

  const save = async () => {
    try {
      if (editing) {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("category", form.category);
        fd.append("promoCode", form.promoCode);
        fd.append("promoUrl", form.promoUrl);
        fd.append("comment", form.comment);
        if (form.logo) fd.append("logo", form.logo);
        await api.put(`/places/${editing.id}`, fd);
      } else {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("category", form.category);
        fd.append("promoCode", form.promoCode);
        fd.append("promoUrl", form.promoUrl);
        fd.append("comment", form.comment);
        if (form.logo) fd.append("logo", form.logo);
        await api.post(`/places`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: "", category: "", promoCode: "", promoCode2: "", promoUrl: "", comment: "", logo: null });
      setShowExtraPromo(false);
      setShowPromoUrl(false);
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка сохранения");
    }
  };

  const del = async (id) => { if (!confirm("Удалить место?")) return; await api.delete(`/places/${id}`); load(); };

  const openContext = (p) => { suppressClickRef.current = true; setCtxTarget(p); setCtxOpen(true); };
  const onItemClick = (p) => { if (suppressClickRef.current) { suppressClickRef.current = false; return; } nav(`/places/${p.id}`); };
  const startEdit = (p) => {
    setEditing(p);
    setForm({ 
      name: p.name, 
      category: p.category, 
      promoCode: p.promoCode || "", 
      promoCode2: "", 
      promoUrl: p.promoUrl || "", 
      comment: p.comment || "", 
      logo: null 
    });
    setShowExtraPromo(!!p.promoCode2);
    setShowPromoUrl(!!p.promoUrl);
    setShowDialog(true);
    setCtxOpen(false);
  };

  const openPromoDialog = async (p) => {
    try {
      const { data } = await api.get(`/places/${p.id}`);
      setPromoData({ code: data.promoCode || "", url: data.promoUrl || "" });
    } catch (e) {
      setPromoData({ code: p.promoCode || "", url: p.promoUrl || "" });
    }
    setPromoOpen(true);
  };

  const handlePlusClick = (e) => {
    e.preventDefault();
    const now = Date.now();
    const lastClick = e.currentTarget.lastClick || 0;
    
    if (now - lastClick < 300) { // Double click
      setShowPromoUrl(true);
    } else { // Single click
      setShowExtraPromo(true);
    }
    
    e.currentTarget.lastClick = now;
  };

  return (
    <Page title="МЕСТА" hideHeader padX={false}>
      <div className="p-0">
        <div className="numbers-topbar places-topbar">
          <button className="filter-btn" onClick={()=> setSortOpen(true)}>
            Сортировка
          </button>
          <button className="filter-btn" onClick={()=> setCatOpen(true)}>
            Категории
          </button>
        </div>

        {/* Селектор сортировки */}
        {sortOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setSortOpen(false)}>
            <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Сортировка</div>
              <div className="grid menu-list">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.key} className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setFilter(f=>({...f, sort: opt.key })); setSortOpen(false); }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Селектор категорий */}
        {catOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[10001]" onClick={()=>setCatOpen(false)}>
            <div className="bg-white modal-panel w-full max-w-sm relative z-[10002]" onClick={(e)=>e.stopPropagation()}>
              <div className="text-lg font-semibold mb-2">Категории</div>
              <div className="grid menu-list">
                {CAT_OPTIONS.map(c => (
                  <button key={c} className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setFilter(f=>({...f, category: c })); setCatOpen(false); }}>
                    {c}
                  </button>
                ))}
                <button className="text-left px-3 py-2 hover:bg-neutral-50" onClick={()=>{ setFilter(f=>({...f, category: '' })); setCatOpen(false); }}>Все категории</button>
              </div>
            </div>
          </div>
        )}
        <div className="grid-3">
          {items.map((p) => (
            <LongPressable
              key={p.id}
              className="flex flex-col items-stretch gap-1 cursor-pointer relative w-full place-item"
              duration={0}
              onClick={() => onItemClick(p)}
            >
              <div className="card-wrap">
                <button className="w-full aspect-square overflow-hidden flex items-center justify-center relative tile" onClick={(e)=>{ e.stopPropagation(); nav(`/places/${p.id}`); }}>
                  {p.hasLogo ? (
                    <img alt={p.name} className="w-[92%] h-[92%] object-cover" style={{ borderRadius: '2%' }} src={`${API}/places/${p.id}/logo`} />
                  ) : (
                    <div className="text-neutral-400 text-xs">нет лого</div>
                  )}
                  {p.hasPromo && (
                    <div className="promo-badge" title="Промо" onClick={(e)=>{ e.stopPropagation(); openPromoDialog(p); }}>
                      <div className="promo-dot" style={{ background: '#fff' }} />
                    </div>
                  )}
                </button>
                <div className="name">{p.name}</div>
              </div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { 
        setEditing(null); 
        setForm({ name: "", category: "", promoCode: "", promoCode2: "", promoUrl: "", comment: "", logo: null }); 
        setShowExtraPromo(false);
        setShowPromoUrl(false);
        setShowDialog(true); 
      }}>+</button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-[10030] modal-overlay" onClick={() => setShowDialog(false)}>
          <div className="bg-white modal-panel keyboard-aware w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать место" : "Добавить место"}</div>
            <div className="grid gap-3 pb-4">
              <input className="search-input" placeholder="Название" value={form.name} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e)=>setForm({...form, name: e.target.value})} />
              <select className="search-input" value={form.category} onFocus={(e)=>ensureFieldVisible(e.target)} onChange={(e)=>setForm({...form, category: e.target.value})}>
                <option value="" disabled>{"Выберите категорию"}</option>
                {['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'].map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Промокод с плюсиком */}
              <div className="flex items-center gap-2">
                <input 
                  className="search-input flex-1" 
                  placeholder="Промокод" 
                  value={form.promoCode} 
                  onFocus={(e)=>ensureFieldVisible(e.target)}
                  onChange={(e)=>setForm({...form, promoCode: e.target.value})} 
                />
                <button 
                  type="button"
                  className="bg-green-100 text-green-700 hover:bg-green-200 font-bold text-lg w-[43px] h-[43px] flex items-center justify-center p-0 rounded-none"
                  onClick={handlePlusClick}
                  title="Добавить поле"
                >
                  +
                </button>
              </div>
              {/* Дополнительный промокод */}
              {showExtraPromo && (
                <input 
                  className="search-input" 
                  placeholder="Дополнительный промокод" 
                  value={form.promoCode2} 
                  onFocus={(e)=>ensureFieldVisible(e.target)}
                  onChange={(e)=>setForm({...form, promoCode2: e.target.value})} 
                />
              )}
              {/* Ссылка на акцию */}
              {showPromoUrl && (
                <input 
                  className="search-input" 
                  placeholder="Ссылка на акцию" 
                  value={form.promoUrl} 
                  onFocus={(e)=>ensureFieldVisible(e.target)}
                  onChange={(e)=>setForm({...form, promoUrl: e.target.value})} 
                />
              )}
              {/* Загрузка логотипа в стиле как у редактирования */}
              <label className="file-field cursor-pointer">
                <input className="hidden" type="file" accept="image/*" onChange={(e)=>setForm({...form, logo: e.target.files?.[0] || null})} />
                <span className="file-choose-btn">Обзор</span>
                <span className={`file-name ${form.logo ? 'has-file' : ''}`}>{form.logo ? (form.logo.name || form.logo) : 'Файл не выбран'}</span>
              </label>
              {/* Комментарий с автоувеличением как у редактирования */}
              <textarea 
                className="search-input" 
                placeholder="Комментарий" 
                value={form.comment} 
                onChange={(e)=>{
                  const val = e.target.value;
                  setForm({...form, comment: val});
                  const base = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--search-h')) || 43;
                  const factor = val.length > 160 ? 3 : (val.length > 60 ? 2 : 1.5);
                  e.target.style.minHeight = (base * factor) + 'px';
                }}
                onFocus={(e)=>{
                  ensureFieldVisible(e.target);
                  const bn = document.querySelector('.bottom-nav');
                  const h = bn ? bn.getBoundingClientRect().height : 56;
                  document.documentElement.style.setProperty('--vv-lift', h + 'px');
                }}
                onBlur={() => {
                  document.documentElement.style.setProperty('--vv-lift', '0px');
                }}
              />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={()=>setShowDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {promoOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={()=>setPromoOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Промо-материалы</div>
            <div className="grid gap-3">
              {promoData.code ? (
                <div>
                  <div className="text-sm text-neutral-600 mb-1">Актуальный промокод</div>
                  <div className="flex items-center gap-2">
                    <input className="search-input flex-1" readOnly value={promoData.code} />
                    <button className="px-3 py-2 bg-blue-600 text-white" onClick={()=>navigator.clipboard.writeText(promoData.code)}>Копировать</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-500">Промокод не указан</div>
              )}
              {promoData.url ? (
                <a className="px-4 py-2 bg-neutral-100 text-blue-700 underline text-left" href={promoData.url} target="_blank" rel="noreferrer">Перейти по ссылке</a>
              ) : (
                <div className="text-sm text-neutral-500">Ссылка не указана</div>
              )}
              <div className="flex justify-end">
                <button className="px-4 py-2" onClick={()=>setPromoOpen(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctxOpen && ctxTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => startEdit(ctxTarget)}>Редактировать</button>
            <button className="w-full px-4 py-3 text-left text-red-600 hover:bg-neutral-50" onClick={() => { del(ctxTarget.id); setCtxOpen(false); }}>Удалить</button>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </Page>
  );
}

function RouterOutlet() {
  const location = useLocation();
  const numberMatch = location.pathname.match(/^\/numbers\/(.+)$/);
  const placeMatch = location.pathname.match(/^\/places\/(.+)$/);
  if (numberMatch) return <NumberDetails id={numberMatch[1]} />;
  if (placeMatch) return <PlaceDetails id={placeMatch[1]} />;
  if (location.pathname === "/numbers") return <NumbersPage/>;
  if (location.pathname === "/places") return <PlacesPage/>;
  return <SearchPage/>;
}

function App() {
  useEffect(() => {
    const docEl = document.documentElement;
    const update = () => {
      try {
        const vv = window.visualViewport;
        let lift = 0;
        if (vv) {
          const layoutH = window.innerHeight || document.documentElement.clientHeight || 0;
          const top = vv.offsetTop || 0;
          lift = Math.max(0, layoutH - (vv.height + top));
        }
        docEl.style.setProperty('--vv-lift', (lift || 0) + 'px');
      } catch (e) {
        // ignore
      }
    };
    update();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', update);
      window.visualViewport.addEventListener('scroll', update);
    }
    window.addEventListener('orientationchange', update);
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', update);
        window.visualViewport.removeEventListener('scroll', update);
      }
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div className="App min-h-screen">
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<RouterOutlet />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;