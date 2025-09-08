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

// Simple API helper
const api = axios.create({ baseURL: API });

// LongPressable wrapper component to avoid using hooks inside loops
function LongPressable({ duration = 2000, onLongPress, onClick, className, children }) {
  const timerRef = useRef(null);
  const handleStart = (e) => {
    clear();
    timerRef.current = setTimeout(() => {
      onLongPress && onLongPress(e);
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

function Page({ title, children, center = false, wide = false, padX = true }) {
  const outerClass = center
    ? `flex-1 flex items-center justify-center ${padX ? "px-4" : "px-0"}`
    : "px-0";
  const innerClass = center
    ? wide ? "w-full" : "w-full max-w-xl"
    : "w-full";
  return (
    <div className="min-h-screen pb-20 flex flex-col">
      <div className="header">{title}</div>
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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!noFound) return;
    if (isDigits) {
      alert(`Добавить номер ${q.trim()} через экран НОМЕРА (кнопка +)`);
    } else {
      alert(`Добавить "${q.trim()}" через экран МЕСТА (кнопка +)`);
    }
  };

  return (
    <Page title="ПОИСК" center wide padX={false}>
      <div className="search-wrap p-0 w-full">
        <form onSubmit={onSubmit}>
          <div className="relative w-full">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="search-input"
              placeholder="Номер телефона или название места"
            />
            {q && (
              <button type="button" onClick={() => setQ("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">×</button>
            )}
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
                <div className="w-6 h-6 bg-neutral-200 rounded overflow-hidden">
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
    </Page>
  );
}

function NumbersPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ phone: "", operatorKey: "mts" });
  const [editing, setEditing] = useState(null); // number object or null
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null); // number object
  const suppressClickRef = useRef(false);

  const load = async () => {
    const { data } = await api.get(`/numbers`);
    setItems(data);
  };
  useEffect(() => { load(); }, []);

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

  const openContext = (n) => {
    suppressClickRef.current = true;
    setCtxTarget(n);
    setCtxOpen(true);
  };

  const onItemClick = (n) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    nav(`/numbers/${n.id}`);
  };

  const startEdit = (n) => {
    setEditing(n);
    setForm({ phone: n.phone, operatorKey: n.operatorKey });
    setShowDialog(true);
    setCtxOpen(false);
  };

  return (
    <Page title="НОМЕРА">
      <div className="p-0">
        <div className="bg-white border-t border-b divide-y">
          {items.map((n) => (
            <LongPressable
              key={n.id}
              className="flex items-center gap-3 px-4 py-3"
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

      {/* Add/Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать номер" : "Добавить номер"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Номер" value={form.phone} onChange={(e)=>setForm({...form, phone: e.target.value})} />
              <select className="search-input" value={form.operatorKey} onChange={(e)=>setForm({...form, operatorKey: e.target.value})}>
                {Object.entries(OPERATORS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name}</option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={()=>setShowDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxOpen && ctxTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
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

  const load = async () => {
    const [n, u] = await Promise.all([
      api.get(`/numbers/${id}`),
      api.get(`/numbers/${id}/usage`),
    ]);
    setNumber(n.data);
    setUsage(u.data);
  };
  useEffect(() => { load(); }, [id]);

  const toggle = async (placeId, used) => {
    await api.post(`/usage`, { numberId: id, placeId, used });
    load();
  };

  if (!number) return <Page title="Загрузка..."/>;
  return (
    <Page title={number.phone}>
      <div className="p-4 grid gap-3">
        <div className="card flex items-center gap-3">
          <img alt="op" src={OPERATORS[number.operatorKey]?.icon} className="w-8 h-8"/>
          <div className="font-medium">{number.phone}</div>
        </div>
        <Accordion title="Не использован" count={usage.unused.length}>
          <div className="grid gap-2">
            {usage.unused.map((p)=> (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <a href={`/places/${p.id}`} className="font-medium">{p.name}</a>
                <button className="text-blue-600" onClick={()=>toggle(p.id, true)}>Отметить использован</button>
              </div>
            ))}
          </div>
        </Accordion>
        <Accordion title="Использован" count={usage.used.length}>
          <div className="grid gap-2">
            {usage.used.map((p)=> (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <a href={`/places/${p.id}`} className="font-medium">{p.name}</a>
                <button className="text-neutral-600" onClick={()=>toggle(p.id, false)}>Снять отметку</button>
              </div>
            ))}
          </div>
        </Accordion>
      </div>
    </Page>
  );
}

function PlacesPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Магазины", logo: null });
  const [filter, setFilter] = useState({ category: "", sort: "new" });
  const [editing, setEditing] = useState(null); // place object or null
  const [ctxOpen, setCtxOpen] = useState(false);
  const [ctxTarget, setCtxTarget] = useState(null); // place object
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
        if (form.logo) fd.append("logo", form.logo);
        await api.put(`/places/${editing.id}`, fd);
      } else {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("category", form.category);
        if (form.logo) fd.append("logo", form.logo);
        await api.post(`/places`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: "", category: "Магазины", logo: null });
      load();
    } catch (e) {
      alert(e.response?.data?.detail || "Ошибка сохранения");
    }
  };

  const del = async (id) => {
    if (!confirm("Удалить место?")) return;
    await api.delete(`/places/${id}`);
    load();
  };

  const openContext = (p) => {
    suppressClickRef.current = true;
    setCtxTarget(p);
    setCtxOpen(true);
  };

  const onItemClick = (p) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    nav(`/places/${p.id}`);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, category: p.category, logo: null });
    setShowDialog(true);
    setCtxOpen(false);
  };

  return (
    <Page title="МЕСТА">
      <div className="p-4">
        <div className="flex gap-2 mb-3">
          <select className="search-input" value={filter.sort} onChange={(e)=>setFilter({ ...filter, sort: e.target.value })}>
            <option value="new">Новые</option>
            <option value="old">Старые</option>
            <option value="popular">Популярные</option>
          </select>
          <select className="search-input" value={filter.category} onChange={(e)=>setFilter({ ...filter, category: e.target.value })}>
            <option value="">Все категории</option>
            {['Магазины','Аптеки','Заправки','Соц. сети'].map((c)=> (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="grid-3">
          {items.map((p) => (
            <LongPressable
              key={p.id}
              className="flex flex-col items-center gap-2 p-3 cursor-pointer"
              duration={2000}
              onLongPress={() => openContext(p)}
              onClick={() => onItemClick(p)}
            >
              <div className="w-16 h-16 bg-neutral-100 rounded overflow-hidden flex items-center justify-center">
                {p.hasLogo ? (
                  <img alt={p.name} className="w-full h-full object-cover" src={`${API}/places/${p.id}/logo`} />
                ) : (
                  <div className="text-neutral-400 text-xs">нет лого</div>
                )}
              </div>
              <div className="text-center text-sm font-medium">{p.name}</div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { setEditing(null); setForm({ name: "", category: "Магазины", logo: null }); setShowDialog(true); }}>+</button>

      {/* Add/Edit dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white rounded-xl p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать место" : "Добавить место"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Название" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
              <select className="search-input" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
                {['Магазины','Аптеки','Заправки','Соц. сети'].map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="search-input" type="file" accept="image/*" onChange={(e)=>setForm({...form, logo: e.target.files?.[0] || null})} />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={()=>setShowDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Context menu */}
      {ctxOpen && ctxTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center p-4" onClick={() => setCtxOpen(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm overflow-hidden" onClick={(e)=>e.stopPropagation()}>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => startEdit(ctxTarget)}>Редактировать</button>
            <button className="w-full px-4 py-3 text-left text-red-600 hover:bg-neutral-50" onClick={() => { del(ctxTarget.id); setCtxOpen(false); }}>Удалить</button>
            <button className="w-full px-4 py-3 text-left hover:bg-neutral-50" onClick={() => setCtxOpen(false)}>Отмена</button>
          </div>
        </div>
      )}
    </Page>
  );
}

function Accordion({ title, count, children }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-xl overflow-hidden">
      <button className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50" onClick={()=>setOpen(!open)}>
        <div className="font-medium">{title}</div>
        <div className="text-sm text-neutral-500">{count}</div>
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
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