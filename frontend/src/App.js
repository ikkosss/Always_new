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

// ... utilities and other components are unchanged

function PlacesPage() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [showDialog, setShowDialog] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoData, setPromoData] = useState({ code: "", url: "" });
  const [form, setForm] = useState({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });
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
        if (form.logo) fd.append("logo", form.logo);
        await api.put(`/places/${editing.id}`, fd);
      } else {
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("category", form.category);
        fd.append("promoCode", form.promoCode);
        fd.append("promoUrl", form.promoUrl);
        if (form.logo) fd.append("logo", form.logo);
        await api.post(`/places`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      }
      setShowDialog(false);
      setEditing(null);
      setForm({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null });
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
    setForm({ name: p.name, category: p.category, promoCode: p.promoCode || "", promoUrl: p.promoUrl || "", logo: null });
    setShowDialog(true);
    setCtxOpen(false);
  };

  const openPromoDialog = (p) => {
    setPromoData({ code: p.promoCode || "", url: p.promoUrl || "" });
    setPromoOpen(true);
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
              className="flex flex-col items-center gap-2 p-3 cursor-pointer relative w-full"
              duration={2000}
              onLongPress={() => openContext(p)}
              onClick={() => onItemClick(p)}
            >
              <div className="w-16 h-16 bg-neutral-100 overflow-hidden flex items-center justify-center">
                {p.hasLogo ? (
                  <img alt={p.name} className="w-full h-full object-cover" src={`${API}/places/${p.id}/logo`} />
                ) : (
                  <div className="text-neutral-400 text-xs">нет лого</div>
                )}
              </div>
              {p.hasPromo && (
                <img src="/promo.png" alt="promo" className="absolute right-2 top-3 h-16 w-16 object-contain cursor-pointer"
                     onClick={(e)=>{ e.stopPropagation(); openPromoDialog(p); }} />
              )}
              <div className="text-center text-sm font-medium">{p.name}</div>
            </LongPressable>
          ))}
        </div>
      </div>
      <button className="fab" onClick={() => { setEditing(null); setForm({ name: "", category: "Магазины", promoCode: "", promoUrl: "", logo: null }); setShowDialog(true); }}>+</button>

      {/* Add/Edit dialog - centered */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-4" onClick={() => setShowDialog(false)}>
          <div className="bg-white p-4 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="text-lg font-semibold mb-2">{editing ? "Редактировать место" : "Добавить место"}</div>
            <div className="grid gap-3">
              <input className="search-input" placeholder="Название" value={form.name} onChange={(e)=>setForm({...form, name: e.target.value})} />
              <select className="search-input" value={form.category} onChange={(e)=>setForm({...form, category: e.target.value})}>
                {['Магазины','Аптеки','Заправки','Соц. сети'].map((c)=> (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input className="search-input" placeholder="ПРОМОКОД" value={form.promoCode} onChange={(e)=>setForm({...form, promoCode: e.target.value})} />
              <input className="search-input" placeholder="ССЫЛКА НА РЕСУРС" value={form.promoUrl} onChange={(e)=>setForm({...form, promoUrl: e.target.value})} />
              <input className="search-input" type="file" accept="image/*" onChange={(e)=>setForm({...form, logo: e.target.files?.[0] || null})} />
              <div className="flex justify-end gap-2">
                <button className="px-4 py-2" onClick={()=>setShowDialog(false)}>Отмена</button>
                <button className="px-4 py-2 bg-blue-600 text-white" onClick={save}>Сохранить</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Promo dialog */}
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

      {/* Context menu */}
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

// rest of file: NumberDetails, PlaceDetails, RouterOutlet, App stay as before