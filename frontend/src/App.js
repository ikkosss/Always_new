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
  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        <button className={`bottom-nav-btn ${active === "search" ? "active" : "inactive"}`} onClick={() => nav("/")}>ПОИСК</button>
        <button className={`bottom-nav-btn ${active === "numbers" ? "active" : "inactive"}`} onClick={() => nav("/numbers")}>НОМЕРА</button>
        <button className={`bottom-nav-btn ${active === "places" ? "active" : "inactive"}`} onClick={() => nav("/places")}>МЕСТА</button>
      </div>
    </div>
  );
}

function Page({ title, children, hideHeader = false, center = false, wide = false, padX = true }) {
  const outerClass = center
    ? `flex-1 flex items-center justify-center ${padX ? "px-4" : "px-0"}`
    : "px-0";
  const innerClass = center
    ? wide ? "w-full" : "w-full max-w-xl"
    : "w-full";
  return (
    <div className={`min-h-screen pb-20 flex flex-col ${hideHeader ? 'pt-3' : ''}`}>
      {!hideHeader && <div className="header">{title}</div>}
      <div className={outerClass}>
        <div className={innerClass}>{children}</div>
      </div>
      <BottomNav />
    </div>
  );
}

function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState({ numbers: [], places: [] });
  const [noFound, setNoFound] = useState(false);
  const [showNumberDialog, setShowNumberDialog] = useState(false);
  const [showPlaceDialog, setShowPlaceDialog] = useState(false);
  const [numberForm, setNumberForm] = useState({ phone: "", operatorKey: "mts" });
  const [placeForm, setPlaceForm] = useState({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });

  const onChange = (val) => {
    if (/^[0-9+\-()\s]*$/.test(val)) {
      const formatted = formatRuPhonePartial(val);
      setQ(formatted);
      return;
    }
    setQ(val);
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults({ numbers: [], places: [] }); setNoFound(false); return; }
      try {
        const { data } = await api.get(`/search`, { params: { q } });
        setResults(data);
        setNoFound(data.numbers.length === 0 && data.places.length === 0);
      } catch (e) { console.error(e); }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const isDigits = useMemo(() => /^[0-9+\-()\s]+$/.test(q.trim()), [q]);

  const handleSearch = () => {
    if (!q.trim()) return;
    if (noFound) {
      if (isDigits) {
        // Open number dialog
        const digits = extractDigits(q);
        setNumberForm({ phone: formatRuPhonePartial(q), operatorKey: "mts" });
        setShowNumberDialog(true);
      } else {
        // Open place dialog
        setPlaceForm({ name: q.trim(), category: "Магазины", promoCode: "", promoUrl: "", logo: null });
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
      setQ("");
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
      setQ("");
      // Refresh results
      window.location.reload();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось добавить место. Повторите позже");
    }
  };

  return (
    <Page title="ПОИСК" hideHeader center wide padX={false}>
      <div className="search-wrap">
        <img 
          src="/promofon.png" 
          alt="Promo" 
          className="search-promo-image"
        />
        <form onSubmit={onSubmit} className="search-input-container">
          <div className="relative w-full">
            <input
              value={q}
              onChange={(e) => onChange(e.target.value)}
              className="search-input pr-20"
              placeholder="Номер или название места"
            />
            <button 
              type="button" 
              onClick={handleSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium"
            >
              НАЙТИ
            </button>
          </div>
        </form>
        {(results.numbers.length > 0 || results.places.length > 0) && (
          <div className="suggestions w-full">
            {results.numbers.map((n) => (
              <div key={n.id} className="suggestion flex items-center gap-3" onClick={() => (window.location.href = `/numbers/${n.id}`)}>
                <img alt="op" src={OPERATORS[n.operatorKey]?.icon} className="w-6 h-6"/>
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
        )}
        {noFound && (
          <div className="mt-3 text-sm text-neutral-600 w-full">
            {isDigits ? `Добавить номер "${q.trim()}"?` : `Добавить "${q.trim()}"?`}
          </div>
        )}
      </div>

      {/* Number Dialog */}
      {showNumberDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowNumberDialog(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Добавить номер</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="НОМЕР ТЕЛЕФОНА" value={numberForm.phone} onChange={(e) => setNumberForm({ ...numberForm, phone: formatRuPhonePartial(e.target.value) })} />
              <select className="search-input" value={numberForm.operatorKey} onChange={(e) => setNumberForm({ ...numberForm, operatorKey: e.target.value })}>
                {Object.entries(OPERATORS).map(([key, op]) => (
                  <option key={key} value={key}>{op.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={() => setShowNumberDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={saveNumber}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Place Dialog */}
      {showPlaceDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowPlaceDialog(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
    <Page title="НОМЕРА" hideHeader>
      <div className="p-0">
        <div className="bg-white">
          {items.map((n) => (
            <LongPressable
              key={n.id}
              className="flex items-center gap-3 px-4 py-3 number-item"
              duration={2000}
              onLongPress={() => openContext(n)}
              onClick={() => onItemClick(n)}
            >
              <img alt="op" src={OPERATORS[n.operatorKey]?.icon} className="w-8 h-8"/>
              <div className="flex-1">{n.phone}</div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { setEditing(null); setForm({ phone: "", operatorKey: "mts" }); setShowDialog(true); }}>+</button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
  const [number, setNumber] = useState(null);
  const [usage, setUsage] = useState({ used: [], unused: [] });
  const [tab, setTab] = useState("unused");
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({ phone: "", operatorKey: "mts" });

  const load = async () => {
    const [n, u] = await Promise.all([
      api.get(`/numbers/${id}`),
      api.get(`/numbers/${id}/usage`),
    ]);
    setNumber(n.data);
    setUsage(u.data);
  };
  useEffect(() => { setTab('unused'); load(); }, [id]);

  const toggle = async (placeId, used) => {
    // Always show confirmation for any toggle
    setPendingToggle({ placeId, used });
    setToggleConfirmOpen(true);
  };

  const performToggle = async (placeId, used) => {
    try {
      await api.post(`/usage`, { numberId: id, placeId, used });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось обновить статус. Повторите позже");
    }
  };

  const confirmToggle = async () => {
    if (pendingToggle) {
      await performToggle(pendingToggle.placeId, pendingToggle.used);
      setPendingToggle(null);
    }
    setToggleConfirmOpen(false);
  };

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
      <div className="p-4 grid gap-4">
        <div className="flex items-center gap-3">
          <img alt="op" src={OPERATORS[number.operatorKey]?.icon} className="w-8 h-8"/>
          <div className="font-medium text-lg">{number.phone}</div>
        </div>
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 ${tab === 'unused' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700'}`}
            onClick={() => setTab('unused')}
          >
            Доступен
          </button>
          <button
            className={`px-4 py-2 ${tab === 'used' ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-700'}`}
            onClick={() => setTab('used')}
          >
            Использован
          </button>
          <button
            className="px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            onClick={openEditDialog}
            title="Редактировать номер"
          >
            ✏️
          </button>
          <button
            className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
            onClick={() => setDeleteConfirmOpen(true)}
            title="Удалить номер"
          >
            🗑️
          </button>
        </div>
        {tab === 'unused' ? (
          <>
            <div className="text-sm text-neutral-600">Сервисы, в которых ещё не производилась регистрация:</div>
            <div className="grid gap-2">
              {usage.unused.map((p)=> (
                <div key={p.id} className="flex items-center justify-between py-2 service-item">
                  <a href={`/places/${p.id}`} className="font-medium">{p.name}</a>
                  <label className="inline-flex items-center" onClick={(e)=>e.stopPropagation()}>
                    <input type="checkbox" className="toggle" checked={false} onChange={()=>toggle(p.id, true)} />
                  </label>
                </div>
              ))}
              {usage.unused.length === 0 && <div className="text-sm text-neutral-500">Нет доступных мест</div>}
            </div>
          </>
        ) : (
          <div className="grid gap-2">
            {usage.used.map((p)=> (
              <div key={p.id} className="flex items-center justify-between py-2 service-item">
                <a href={`/places/${p.id}`} className="font-medium">{p.name}</a>
                <label className="inline-flex items-center" onClick={(e)=>e.stopPropagation()}>
                  <input type="checkbox" className="toggle" checked={true} onChange={()=>toggle(p.id, false)} />
                </label>
              </div>
            ))}
            {usage.used.length === 0 && <div className="text-sm text-neutral-500">Нет использованных мест</div>}
          </div>
        )}
      </div>

      {toggleConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setToggleConfirmOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Переключить тумблер?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={() => setToggleConfirmOpen(false)}>Отмена</button>
              <button className="px-4 py-2 bg-blue-600 text-white" onClick={confirmToggle}>Переключить</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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

    </Page>
  );
}

function PlaceDetails({ id }) {
  const [place, setPlace] = useState(null);
  const [usage, setUsage] = useState({ used: [], unused: [] });
  const [tab, setTab] = useState('unused');
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoData, setPromoData] = useState({ code: "", url: "" });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [toggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [pendingToggle, setPendingToggle] = useState(null);
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

  const load = async () => {
    const [p, u] = await Promise.all([
      api.get(`/places/${id}`),
      api.get(`/places/${id}/usage`),
    ]);
    setPlace(p.data);
    setUsage(u.data);
  };
  useEffect(() => { setTab('unused'); load(); }, [id]);

  const toggle = async (numberId, used) => {
    // Always show confirmation for any toggle
    setPendingToggle({ numberId, used });
    setToggleConfirmOpen(true);
  };

  const performToggle = async (numberId, used) => {
    try {
      await api.post(`/usage`, { numberId, placeId: id, used });
      await load();
    } catch (e) {
      alert(e.response?.data?.detail || "Не удалось обновить статус. Повторите позже");
    }
  };

  const confirmToggle = async () => {
    if (pendingToggle) {
      await performToggle(pendingToggle.numberId, pendingToggle.used);
      setPendingToggle(null);
    }
    setToggleConfirmOpen(false);
  };

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
    <Page title={place.name} hideHeader>
      <div className="p-4 grid gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {place.hasLogo && (
              <img alt={place.name} className="w-10 h-10 object-cover rounded-lg" src={`${API}/places/${id}/logo`} />
            )}
            <div className="font-medium text-lg">{place.name}</div>
          </div>
          {place.hasPromo && (
            <img 
              alt="Promo" 
              className="w-10 h-10 object-cover cursor-pointer" 
              src="/promo.png" 
              onClick={openPromoDialog}
            />
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button
            className={`px-4 py-2 ${tab === 'unused' ? 'bg-green-200 text-green-800' : 'bg-green-100 text-green-700'}`}
            onClick={() => setTab('unused')}
          >
            Доступен
          </button>
          <button
            className={`px-4 py-2 ${tab === 'used' ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-700'}`}
            onClick={() => setTab('used')}
          >
            Использован
          </button>
          <button
            className="px-3 py-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
            onClick={openEditDialog}
            title="Редактировать место"
          >
            ✏️
          </button>
          <button
            className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200"
            onClick={() => setDeleteConfirmOpen(true)}
            title="Удалить место"
          >
            🗑️
          </button>
        </div>
        {tab === 'unused' && (
          <div className="grid gap-2">
            {usage.unused.map((n)=> (
              <div key={n.id} className="flex items-center justify-between py-2 service-item">
                <a href={`/numbers/${n.id}`} className="font-medium">{n.phone}</a>
                <label className="inline-flex items-center" onClick={(e)=>e.stopPropagation()}>
                  <input type="checkbox" className="toggle" checked={false} onChange={()=>toggle(n.id, true)} />
                </label>
              </div>
            ))}
            {usage.unused.length === 0 && <div className="text-sm text-neutral-500">Нет доступных номеров</div>}
          </div>
        )}
        {tab === 'used' && (
          <div className="grid gap-2">
            {usage.used.map((n)=> (
              <div key={n.id} className="flex items-center justify-between py-2 service-item">
                <a href={`/numbers/${n.id}`} className="font-medium">{n.phone}</a>
                <label className="inline-flex items-center" onClick={(e)=>e.stopPropagation()}>
                  <input type="checkbox" className="toggle" checked={true} onChange={()=>toggle(n.id, false)} />
                </label>
              </div>
            ))}
            {usage.used.length === 0 && <div className="text-sm text-neutral-500">Нет использованных номеров</div>}
          </div>
        )}
      </div>

      {promoOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={()=>setPromoOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Промо</div>
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

      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setDeleteConfirmOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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

      {toggleConfirmOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setToggleConfirmOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Переключить тумблер?</div>
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2" onClick={() => setToggleConfirmOpen(false)}>Отмена</button>
              <button className="px-4 py-2 bg-blue-600 text-white" onClick={confirmToggle}>Переключить</button>
            </div>
          </div>
        </div>
      )}

      {editDialogOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4 z-50" onClick={() => setEditDialogOpen(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Редактировать место</div>
            <div className="grid gap-3">
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
                rows="3"
                value={editForm.comment} 
                onChange={(e)=>setEditForm({...editForm, comment: e.target.value})} 
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
    category: "Магазины", 
    promoCode: "", 
    promoCode2: "", 
    promoUrl: "", 
    comment: "", 
    logo: null 
  });
  const [showExtraPromo, setShowExtraPromo] = useState(false);
  const [showPromoUrl, setShowPromoUrl] = useState(false);
  const [filter, setFilter] = useState({ category: "", sort: "new" });
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
      setForm({ name: "", category: "Магазины", promoCode: "", promoCode2: "", promoUrl: "", comment: "", logo: null });
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
    <Page title="МЕСТА" hideHeader>
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <select className="search-input" value={filter.sort} onChange={(e)=>setFilter({ ...filter, sort: e.target.value })}>
            <option value="new">Новые</option>
            <option value="old">Старые</option>
            <option value="popular">Популярные</option>
          </select>
          <select className="search-input" value={filter.category} onChange={(e)=>setFilter({ ...filter, category: e.target.value })}>
            <option value="">Все категории</option>
            {['Магазины','Аптеки','Заправки','Соц. сети','CashBack','Прочее'].map((c)=> (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid-3">
          {items.map((p) => (
            <LongPressable
              key={p.id}
              className="flex flex-col items-center gap-2 p-3 cursor-pointer relative w-full place-item"
              duration={2000}
              onLongPress={() => openContext(p)}
              onClick={() => onItemClick(p)}
            >
              <button className="w-24 h-24 bg-neutral-100 overflow-hidden flex items-center justify-center relative rounded-lg" onClick={(e)=>{ e.stopPropagation(); nav(`/places/${p.id}`); }}>
                {p.hasLogo ? (
                  <img alt={p.name} className="w-full h-full object-cover rounded-lg" src={`${API}/places/${p.id}/logo`} />
                ) : (
                  <div className="text-neutral-400 text-xs">нет лого</div>
                )}
                {p.hasPromo && (
                  <div className="promo-badge" title="Промо" onClick={(e)=>{ e.stopPropagation(); openPromoDialog(p); }} />
                )}
              </button>
              <div className="text-center text-sm font-normal text-black mt-1 truncate w-24">{p.name}</div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { 
        setEditing(null); 
        setForm({ name: "", category: "Магазины", promoCode: "", promoCode2: "", promoUrl: "", comment: "", logo: null }); 
        setShowExtraPromo(false);
        setShowPromoUrl(false);
        setShowDialog(true); 
      }}>+</button>

      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать место" : "Добавить место"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Название" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
              <select className="search-input" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
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
          <div className="bg-white p-4 w-full max-w-md" onClick={(e)=>e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">Промо</div>
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