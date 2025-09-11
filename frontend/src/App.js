import React, { useEffect, useMemo, useRef, useState } from "react";
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

  const tryNav = (to) => {
    const hasUnsaved = !!window.__unsaved;
    if (hasUnsaved) {
      pendingRouteRef.current = to;
      setConfirmNav(true);
      return;
    }
    nav(to);
  };

  const proceedNav = async (save) => {
    const to = pendingRouteRef.current;
    setConfirmNav(false);
    if (save && typeof window.__saveChanges === 'function') {
      try { await window.__saveChanges(); } catch (e) { /* ignore */ }
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
              <button className="btn btn-text" onClick={() => setConfirmNav(false)}>Отмена</button>
              <button className="btn" onClick={() => proceedNav(false)}>Не сохранять</button>
              <button className="btn btn-primary" onClick={() => proceedNav(true)}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Page({ title, children, hideHeader = false, center = false, wide = false, padX = true, topPadClass = 'pt-3' }) {
  const outerClass = center
    ? `flex-1 flex items-center justify-center ${padX ? "px-[var(--pad-x)]" : "px-0"}`
    : (padX ? "px-[var(--pad-x)]" : "px-0");
  const innerClass = center
    ? wide ? "w-full" : "w-full max-w-xl"
    : "w-full";
  return (
    <div className={`min-h-screen pb-20 flex flex-col ${hideHeader ? topPadClass : ''}`}>
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
  const [placeForm, setPlaceForm] = useState({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });

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
      if (isDigits) {
        // Open number dialog
        const digits = extractDigits(qRaw);
        setNumberForm({ phone: formatRuPhonePartial(qRaw), operatorKey: "mts" });
        setShowNumberDialog(true);
      } else {
        // Open place dialog
        setPlaceForm({ name: qRaw.trim(), category: "Магазины", promoCode: "", promoUrl: "", logo: null });
        setShowPlaceDialog(true);
      }
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    handleSearch();
  };

  const saveNumber = async () => {
    try {
      await api.post(`/numbers`, numberForm);
      setShowNumberDialog(false);
      setNumberForm({ phone: "", operatorKey: "mts" });
      setQRaw("");
      // Refresh results
      window.location.reload();
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
      await api.post(`/places`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      setShowPlaceDialog(false);
      setPlaceForm({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });
      setQRaw("");
      // Refresh results
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось добавить место. Повторите позже");
    }
  };

  return (
    <Page title="ПОИСК" hideHeader center wide padX={false}>
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
                  <img alt="logo" src={OPERATORS[n.operatorKey]?.icon} className="w-12 h-12 object-contain"/>
                  <div className="flex-1">{n.phone}</div>
                  <div className="text-neutral-400 text-xs">номер</div>
                </div>
              ))}
              {results.places.map((p) => (
                <div key={p.id} className="suggestion flex items-center gap-3" onClick={() => (window.location.href = `/places/${p.id}`)}>
                  <div className="w-6 h-6 bg-neutral-200 overflow-hidden">
                    {p.hasLogo && <img alt="logo" className="w-6 h-6 object-cover" src={`${API}/places/${p.id}/logo`} />}
                  </div>
                  <div className="flex-1">{p.name}</div>
                  <div className="text-neutral-400 text-xs">место</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {noFound && (
          <div className="mt-3 text-sm text-neutral-600 w-full">

        {/* Измеряем фактическую высоту инпута и устанавливаем CSS-переменные для точного позиционирования */}
        <MeasureInputHeight targetRef={inputRef} />

            {isDigits ? `Добавить номер "${qRaw.trim()}"?` : `Добавить "${qRaw.trim()}"?`}
          </div>
        )}
      </div>

      {/* Number Dialog */}
      {showNumberDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowNumberDialog(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Добавить номер</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НОМЕР ТЕЛЕФОНА" value={numberForm.phone} onChange={(e) => setNumberForm({ ...numberForm, phone: formatRuPhonePartial(e.target.value) })} />
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPlaceDialog(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Добавить место</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НАЗВАНИЕ МЕСТА" value={placeForm.name} onChange={(e) => setPlaceForm({ ...placeForm, name: e.target.value })} />
              <select className="search-input" value={placeForm.category} onChange={(e) => setPlaceForm({ ...placeForm, category: e.target.value })}>
                {["Магазины", "Рестораны", "Заправки", "Банки", "Аптеки", "Сайты", "CashBack", "Другое"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="search-input" placeholder="Промокод" value={placeForm.promoCode} onChange={(e) => setPlaceForm({ ...placeForm, promoCode: e.target.value })} />
              <input className="search-input" placeholder="Ссылка на акцию" value={placeForm.promoUrl} onChange={(e) => setPlaceForm({ ...placeForm, promoUrl: e.target.value })} />
              <input className="search-input" type="file" accept="image/*" onChange={(e) => setPlaceForm({ ...placeForm, logo: e.target.files?.[0] || null })} />
              <div className="flex justify-end gap-2">
                <button className="btn btn-text" onClick={() => setShowPlaceDialog(false)}>Отмена</button>
                <button className="btn btn-primary" onClick={savePlace}>Сохранить</button>
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
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ phone: "", operatorKey: "mts" });
  const [editing, setEditing] = useState(null);
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);
  const suppressClickRef = useRef(false);

  const load = async () => {
    const { data } = await api.get(`/numbers`);
    setItems(data);
  };
  useEffect(() => { load(); }, []);

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
    <Page title="НОМЕРА" hideHeader topPadClass="pt-6">
      <div className="p-0 section">
        <div>
          {items.map((n) => (
            <LongPressable
              key={n.id}
              className="flex items-center gap-3 number-item"
              duration={2000}
              onLongPress={() => openContext(n)}
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
      <button className="fab" onClick={() => { setEditing(null); setForm({ phone: "", operatorKey: "mts" }); setShowDialog(true); }}>+</button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
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


  const load = async () => {
    const [n, u] = await Promise.all([
      api.get(`/numbers/${id}`),
      api.get(`/numbers/${id}/usage`),
    ]);
    setNumber(n.data);
    setUsage(u.data);
    const m = {};
    (u.data.used || []).forEach(p => { m[p.id] = true; });
    (u.data.unused || []).forEach(p => { if (!(p.id in m)) m[p.id] = false; });
    setUsedMap(m);
    initialMapRef.current = { ...m };
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

  // track unsaved changes
  useEffect(() => {
    const hasDiff = JSON.stringify(usedMap) !== JSON.stringify(initialMapRef.current);
    window.__unsaved = hasDiff;
    window.__saveChanges = async () => {
      const ops = [];
      for (const [placeId, val] of Object.entries(usedMap)) {
        if (initialMapRef.current[placeId] !== val) {
          ops.push({ placeId, used: val });
        }
      }
      for (const op of ops) {
        await api.post(`/usage`, { numberId: id, placeId: op.placeId, used: op.used });
      }
      initialMapRef.current = { ...usedMap };
      window.__unsaved = false;
    };
    return () => {
      // cleanup when leaving page component
      window.__saveChanges = null;
    };
  }, [usedMap, id]);

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
      <div className="p-4 grid gap-4 section" data-page="number">
        <div className="nb-bar">
          <img className="nb-logo" alt="operator" src={OPERATORS[number.operatorKey]?.icon} />
          <div className="nb-number">{String(number.phone || '').replace(/\s/g, '')}</div>
          <div className="nb-dots" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setCtxTarget(number); setCtxOpen(true); }} onTouchStart={(e)=>{ e.preventDefault(); e.stopPropagation(); setCtxTarget(number); setCtxOpen(true); }} onPointerDown={(e)=>{ e.preventDefault(); e.stopPropagation(); setCtxTarget(number); setCtxOpen(true); }}>⋮</div>
        </div>
        <div className="text-sm text-neutral-600 list-width"><span className="whitespace-nowrap tracking-tight">Отмечайте галочкой места, где номер использован:</span></div>

        <div className="number-inline">
          <span className="pre-spaces">  </span>
          <img className="logo" alt="operator" src={OPERATORS[number.operatorKey]?.icon} />
          <span className="gap-spaces">  </span>
          <span className="num">{String(number.phone || '').replace(/\s/g, '')}</span>
        </div>
        <div>
          {[...(usage.used||[]), ...(usage.unused||[])].map((p)=> (
            <div key={p.id} className="list-row">
              <div className="op"><img alt="logo" src={`${API}/places/${p.id}/logo`} onError={(e)=>{ e.currentTarget.style.display='none'; }} /></div>
              <div className="phone font-medium">{p.name}</div>
              <div className="check">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={!!usedMap[p.id]}
                  onChange={(e)=> {
                    if (confirm('Вы уверены, что хотите изменить?')) {
                      setUsedMap(prev => ({ ...prev, [p.id]: e.target.checked }));
                    }
                  }}
                />
              </div>
            </div>
          ))}
        </div>


      </div>

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setDeleteConfirmOpen(false)}>
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setEditDialogOpen(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Редактировать номер</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НОМЕР ТЕЛЕФОНА" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: formatRuPhonePartial(e.target.value) })} />
              <select className="search-input" value={editForm.operatorKey} onChange={(e) => setEditForm({ ...editForm, operatorKey: e.target.value })}>

      {ctxOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => { openEditDialog(); setCtxOpen(false); }}>Редактировать</button>
            <button className="w-full px-4 py-3 text-left text-red-600 hover:bg-neutral-50" onClick={() => { setDeleteConfirmOpen(true); setCtxOpen(false); }}>Удалить</button>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
          </div>

      {ctxOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => { openEditDialog(); setCtxOpen(false); }}>Редактировать</button>
            <button className="w-full px-4 py-3 text-left text-red-600 hover:bg-neutral-50" onClick={() => { setDeleteConfirmOpen(true); setCtxOpen(false); }}>Удалить</button>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
          </div>
        </div>
      )}

        </div>
      )}

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
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null);

  const load = async () => {
    const [p, u] = await Promise.all([
      api.get(`/places/${id}`),
      api.get(`/places/${id}/usage`),
    ]);
    setPlace(p.data);
    setUsage(u.data);
    const m = {};
    (u.data.used || []).forEach(n => { m[n.id] = true; });
    (u.data.unused || []).forEach(n => { if (!(n.id in m)) m[n.id] = false; });
    setUsedMap(m);
    initialMapRef.current = { ...m };
  };
  useEffect(() => { load(); }, [id]);

  // track unsaved changes for this place page
  useEffect(() => {
    const hasDiff = JSON.stringify(usedMap) !== JSON.stringify(initialMapRef.current);
    window.__unsaved = hasDiff;
    window.__saveChanges = async () => {
      const ops = [];
      for (const [numberId, val] of Object.entries(usedMap)) {
        if (initialMapRef.current[numberId] !== val) {
          ops.push({ numberId, used: val });
        }
      }
      for (const op of ops) {
        await api.post(`/usage`, { numberId: op.numberId, placeId: id, used: op.used });
      }
      initialMapRef.current = { ...usedMap };
      window.__unsaved = false;
    };
    return () => { window.__saveChanges = null; };
  }, [usedMap, id]);

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
              {place?.comment && (
                <div
                  className="place-comment whitespace-pre-line mt-1 clamp-4 cursor-pointer"
                  style={{ width: 'calc(-126px + 100vw)', marginRight: '1px' }}
                  onClick={() => setCommentDialogOpen(true)}
                >
                  {place.comment}
                </div>
              )}
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

      <div>
        {[...(usage.used||[]), ...(usage.unused||[])].map((n)=> (
          <div key={n.id} className="list-row">
            <div className="op"><img alt="logo" src={OPERATORS[n.operatorKey]?.icon} /></div>
            <div className="phone font-medium">{n.phone}</div>
            <div className="check">
              <input
                type="checkbox"
                className="checkbox"
                checked={!!usedMap[n.id]}
                onChange={(e)=> {
                  if (confirm('Вы уверены, что хотите изменить?')) {
                    setUsedMap(prev => ({ ...prev, [n.id]: e.target.checked }));
                  }
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
                    <div className="promo-text search-input" style={{ padding: '8px 10px' }}>{url}</div>
                    <button className="btn-copy" title="Скопировать" onClick={()=>navigator.clipboard.writeText(url)}>⧉</button>
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setDeleteConfirmOpen(false)}>
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
          <div className="bg-white modal-panel w-full max-w-md shadow-xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
                  className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-bold text-lg h-[42px]"
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
                rows="4"
                value={editForm.comment} 
                onChange={(e)=>setEditForm({...editForm, comment: e.target.value})}
                onFocus={() => {
                  const bn = document.querySelector('.bottom-nav');
                  const h = bn ? bn.getBoundingClientRect().height : 56;
                  document.documentElement.style.setProperty('--vv-lift', h + 'px');
                }}
                onBlur={() => {
                  document.documentElement.style.setProperty('--vv-lift', '0px');
                }}
              />
              
              <input className="search-input" type="file" accept="image/*" onChange={(e)=>setEditForm({...editForm, logo: e.target.files?.[0] || null})} />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={() => setEditDialogOpen(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={saveEditedPlace}>Сохранить</button>
              </div>
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
    { key: 'new', label: 'По новым' },
    { key: 'old', label: 'По старым' },
    { key: 'popular', label: 'По популярности' },
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
    <Page title="МЕСТА" hideHeader topPadClass="pt-3" padX={false}>
      <div className="p-0">
        <div className="filter-bar top-base">
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
              duration={2000}
              onLongPress={() => openContext(p)}
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white modal-panel w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать место" : "Добавить место"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Название" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
              <select className="search-input" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
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
                  onChange={(e)=>setForm({...form, promoCode: e.target.value})} 
                />
                <button 
                  type="button"
                  className="px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 font-bold text-lg h-[42px]"
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
                  onChange={(e)=>setForm({...form, promoCode2: e.target.value})} 
                />
              )}
              
              {/* Ссылка на акцию */}
              {showPromoUrl && (
                <input 
                  className="search-input" 
                  placeholder="Ссылка на акцию" 
                  value={form.promoUrl} 
                  onChange={(e)=>setForm({...form, promoUrl: e.target.value})} 
                />
              )}
              
              {/* Комментарий */}
              <textarea 
                className="search-input" 
                placeholder="Комментарий" 
                rows="3"
                value={form.comment} 
                onChange={(e)=>setForm({...form, comment: e.target.value})} 
              />
              
              <input className="search-input" type="file" accept="image/*" onChange={(e)=>setForm({...form, logo: e.target.files?.[0] || null})} />
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