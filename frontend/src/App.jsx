import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FileText,
  Home,
  Wrench,
  MessageSquare,
  CheckSquare,
  Plus,
  Trash2,
  Send,
  Paperclip,
  X,
  RotateCcw,
  Video,
  CheckCircle2,
  Lock,
  Camera
} from "lucide-react";

const USER_ID = "flat_8";
const apiOrigin = import.meta?.env?.VITE_API_ORIGIN || "";
const API = `${apiOrigin}/api`;

function cls(...a) {
  return a.filter(Boolean).join(" ");
}

function money(x) {
  return Number(x || 0).toFixed(2);
}

const SERVICE_CATALOG = [
  {
    key: "electric",
    name: "Электроэнергия",
    meter: { unit: "кВт⋅ч", tariff: 5.7, prev: 1280.0 },
    nometer: { unit: "кВт⋅ч", tariff: 5.7, quantity: 0 },
  },
  {
    key: "hvs",
    name: "Холодное водоснабжение (ХВС)",
    meter: { unit: "м³", tariff: 44.5, prev: 104.2 },
    nometer: { unit: "м³", tariff: 44.5, quantity: 0 },
  },
  {
    key: "gvs",
    name: "Горячее водоснабжение (ГВС)",
    meter: { unit: "м³", tariff: 185.3, prev: 56.4 },
    nometer: { unit: "м³", tariff: 185.3, quantity: 0 },
  },
  {
    key: "gas",
    name: "Газоснабжение",
    meter: { unit: "м³", tariff: 7.1, prev: 321.0 },
    nometer: { unit: "м³", tariff: 7.1, quantity: 0 },
  },
  {
    key: "heat",
    name: "Отопление",
    meter: { unit: "Гкал", tariff: 2150.0, prev: 12.3 },
    nometer: { unit: "кв.м", tariff: 38.5, quantity: 0 },
  },
  {
    key: "other",
    name: "Другая услуга (вручную)",
    meter: { unit: "ед.", tariff: 0, prev: 0 },
    nometer: { unit: "ед.", tariff: 0, quantity: 0 },
  },
];

export default function App() {
  const [tab, setTab] = useState("bill");
  const [toast, setToast] = useState(null);
  const [bill, setBill] = useState(null);
  const [house, setHouse] = useState(null);
  const [requests, setRequests] = useState([]);
  const [chat, setChat] = useState([]);
  const [polls, setPolls] = useState([]);
  const [billAddOpen, setBillAddOpen] = useState(false);
  const [serviceKey, setServiceKey] = useState("electric");
  const [isMeter, setIsMeter] = useState(true);
  const [selectedEntrance, setSelectedEntrance] = useState(1);
  const [currentTimeStr, setCurrentTimeStr] = useState("");

  const [draft, setDraft] = useState(() => {
    const s = SERVICE_CATALOG.find((x) => x.key === "electric");
    return {
      name: s.name,
      unit: s.meter.unit,
      tariff: s.meter.tariff,
      prev_reading: s.meter.prev,
      current_reading: s.meter.prev,
      quantity: 0,
    };
  });

  const [reqCategory, setReqCategory] = useState("Подъезд/двор");
  const [reqText, setReqText] = useState("");
  const [reqPhoto, setReqPhoto] = useState(null);
  const [newMsg, setNewMsg] = useState("");
  const chatEndRef = useRef(null);

  const triggerHaptic = (type = "selection") => {
    try {
      if (window.WebApp && window.WebApp.HapticFeedback) {
        if (type === "selection" && window.WebApp.HapticFeedback.selectionChanged) {
          window.WebApp.HapticFeedback.selectionChanged();
        } else if (type === "success" && window.WebApp.HapticFeedback.notificationOccurred) {
          window.WebApp.HapticFeedback.notificationOccurred("success");
        } else if (type === "error" && window.WebApp.HapticFeedback.notificationOccurred) {
          window.WebApp.HapticFeedback.notificationOccurred("error");
        } else if (type === "impact" && window.WebApp.HapticFeedback.impactOccurred) {
          window.WebApp.HapticFeedback.impactOccurred("medium");
        }
      }
    } catch (e) {}
  };

  const showToast = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2800);
  };

  const switchTab = (nextTab) => {
    triggerHaptic("selection");
    setTab(nextTab);
  };

  const loadBill = async () => {
    try {
      const r = await fetch(`${API}/bill`);
      if (r.ok) setBill(await r.json());
    } catch (e) {}
  };

  const loadHouse = async () => {
    try {
      const r = await fetch(`${API}/house`);
      if (r.ok) setHouse(await r.json());
    } catch (e) {}
  };

  const loadRequests = async () => {
    try {
      const r = await fetch(`${API}/requests`);
      if (r.ok) setRequests(await r.json());
    } catch (e) {}
  };

  const loadChat = async () => {
    try {
      const r = await fetch(`${API}/chat`);
      if (r.ok) setChat(await r.json());
    } catch (e) {}
  };

  const loadPolls = async () => {
    try {
      const r = await fetch(`${API}/polls?user_id=${encodeURIComponent(USER_ID)}`);
      if (r.ok) setPolls(await r.json());
    } catch (e) {}
  };

  const resetAllData = async () => {
    try {
      triggerHaptic("impact");
      const r = await fetch(`${API}/reset`, { method: "POST" });
      if (r.ok) {
        await Promise.all([loadBill(), loadHouse(), loadRequests(), loadChat(), loadPolls()]);
        setReqText("");
        setReqPhoto(null);
        setNewMsg("");
        setBillAddOpen(false);
        showToast("Все данные сброшены к начальному состоянию");
      }
    } catch (e) {
      triggerHaptic("error");
      showToast("Ошибка связи с сервером");
    }
  };

  useEffect(() => {
    loadBill();
    loadHouse();
    loadRequests();
    loadChat();
    loadPolls();
    const t = window.setInterval(() => {
      loadHouse();
      loadRequests();
      loadPolls();
    }, 8000);

    const clockInterval = setInterval(() => {
      const now = new Date();
      setCurrentTimeStr(now.toLocaleTimeString("ru-RU"));
    }, 1000);

    return () => {
      window.clearInterval(t);
      clearInterval(clockInterval);
    };
  }, []);

  useEffect(() => {
    if (tab === "chat") {
      window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [tab, chat]);

  const badge = (b) => {
    if (b === "ok") return "bg-emerald-100 text-emerald-700";
    if (b === "warn") return "bg-amber-100 text-amber-800";
    if (b === "down") return "bg-rose-100 text-rose-700";
    return "bg-slate-100 text-slate-700";
  };

  const onServiceChange = (key) => {
    setServiceKey(key);
    const s = SERVICE_CATALOG.find((x) => x.key === key) || SERVICE_CATALOG[0];
    const mode = isMeter ? s.meter : s.nometer;
    setDraft((p) => ({
      ...p,
      name: s.name,
      unit: mode.unit,
      tariff: mode.tariff,
      prev_reading: isMeter ? s.meter.prev : 0,
      current_reading: isMeter ? s.meter.prev : 0,
      quantity: !isMeter ? (s.nometer.quantity ?? 0) : 0,
    }));
  };

  const onMeterToggle = (checked) => {
    setIsMeter(checked);
    const s = SERVICE_CATALOG.find((x) => x.key === serviceKey) || SERVICE_CATALOG[0];
    const mode = checked ? s.meter : s.nometer;
    setDraft((p) => ({
      ...p,
      unit: mode.unit,
      tariff: mode.tariff,
      prev_reading: checked ? s.meter.prev : 0,
      current_reading: checked ? s.meter.prev : 0,
      quantity: checked ? 0 : (s.nometer.quantity ?? 0),
    }));
  };

  const addBillItem = async () => {
    if (!draft.name.trim()) {
      triggerHaptic("error");
      showToast("Укажите название услуги");
      return;
    }
    const payload = isMeter
      ? {
          name: draft.name,
          item_type: "meter",
          unit: draft.unit,
          tariff: Number(draft.tariff || 0),
          prev_reading: Number(draft.prev_reading || 0),
          current_reading: Number(draft.current_reading || 0),
        }
      : {
          name: draft.name,
          item_type: "fixed",
          unit: draft.unit,
          tariff: Number(draft.tariff || 0),
          quantity: Number(draft.quantity || 0),
        };
    const r = await fetch(`${API}/bill/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      triggerHaptic("error");
      showToast("Не удалось добавить услугу");
      return;
    }
    triggerHaptic("success");
    setBill(await r.json());
    setBillAddOpen(false);
    showToast("Услуга добавлена");
  };

  const patchBillItem = async (id, patch) => {
    const r = await fetch(`${API}/bill/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (r.ok) setBill(await r.json());
  };

  const deleteBillItem = async (id) => {
    const r = await fetch(`${API}/bill/items/${id}`, { method: "DELETE" });
    if (r.ok) {
      triggerHaptic("impact");
      setBill(await r.json());
      showToast("Услуга удалена");
    }
  };

  const payBill = async () => {
    const r = await fetch(`${API}/bill/pay`, { method: "POST" });
    if (r.ok) {
      triggerHaptic("success");
      setBill(await r.json());
      showToast("Оплачено. Чек сформирован.");
    }
  };

  const createRequest = async () => {
    if (!reqText.trim()) {
      triggerHaptic("error");
      showToast("Опишите проблему");
      return;
    }
    const fd = new FormData();
    fd.append("category", reqCategory);
    fd.append("text", reqText);
    fd.append("user_id", USER_ID);
    if (reqPhoto) fd.append("photo", reqPhoto);
    const r = await fetch(`${API}/requests`, { method: "POST", body: fd });
    const data = await r.json();
    if (!data?.success) {
      triggerHaptic("error");
      showToast("Не удалось отправить заявку");
      return;
    }
    triggerHaptic("success");
    setRequests((prev) => [data.request, ...prev]);
    setReqText("");
    setReqPhoto(null);
    showToast(`Заявка #${data.request.id} отправлена`);
  };

  const cancelRequest = async (id) => {
    await fetch(`${API}/requests/${id}`, { method: "DELETE" });
    await loadRequests();
    triggerHaptic("impact");
    showToast(`Заявка #${id} отменена`);
  };

  const sendChat = async () => {
    if (!newMsg.trim()) return;
    const r = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "Вы (кв. 8)", text: newMsg }),
    });
    if (r.ok) {
      triggerHaptic("selection");
      const msg = await r.json();
      setChat((prev) => [...prev, msg]);
      setNewMsg("");
    }
  };

  const deleteChat = async (id) => {
    const r = await fetch(`${API}/chat/${id}`, { method: "DELETE" });
    if (r.ok) {
      triggerHaptic("impact");
      await loadChat();
      showToast("Сообщение удалено");
    } else {
      triggerHaptic("error");
      const err = await r.json();
      showToast(err.detail || "Не удалось удалить");
    }
  };

  const vote = async (pollId, optionId) => {
    const r = await fetch(`${API}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, option_id: optionId }),
    });
    if (r.ok) {
      triggerHaptic("success");
      await loadPolls();
      showToast("Голос учтён");
    } else {
      triggerHaptic("error");
      const err = await r.json();
      showToast(err.detail || "Ошибка голосования");
    }
  };

  const unvote = async (pollId) => {
    const r = await fetch(`${API}/polls/${pollId}/vote?user_id=${encodeURIComponent(USER_ID)}`, {
      method: "DELETE",
    });
    if (r.ok) {
      triggerHaptic("impact");
      await loadPolls();
      showToast("Голос отменён. Теперь вы можете выбрать другой вариант");
    }
  };

  const content = useMemo(() => {
    if (tab === "bill") {
      if (!bill) return null;
      return (
        <div className="tab-pane space-y-3">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                  Единый платёжный документ
                </div>
                <div className="text-base font-extrabold text-slate-900 mt-1">{bill.period}</div>
                <div className="text-xs text-slate-500 mt-0.5 break-words font-medium">
                  Л/С: {bill.account} • {bill.address}
                </div>
              </div>
              {!bill.paid && (
                <button
                  onClick={() => {
                    triggerHaptic("selection");
                    setBillAddOpen(true);
                  }}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-violet-600 text-white text-xs font-bold shadow-md shadow-violet-200 active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Услуга
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2.5">
              {bill.items.length === 0 ? (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
                  {bill.paid ? (
                    <div className="flex flex-col items-center gap-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                      <span className="font-bold text-slate-800">Все услуги оплачены</span>
                      <span className="text-xs text-slate-400">{bill.receipt_label}</span>
                    </div>
                  ) : (
                    "Добавьте услуги и выполните оплату."
                  )}
                </div>
              ) : (
                bill.items.map((it) => (
                  <div key={it.id} className="bg-slate-50/70 border border-slate-200 rounded-2xl p-3.5 transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 break-words">{it.name}</div>
                        {it.locked ? (
                          <div className="mt-1 text-sm font-black text-slate-900">
                            Начислено: {money(it.sum)} ₽
                          </div>
                        ) : (
                          <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                            Тариф:
                            <input
                              type="number"
                              step="0.01"
                              value={it.tariff}
                              onChange={(e) => patchBillItem(it.id, { tariff: Number(e.target.value || 0) })}
                              className="w-20 px-2 py-0.5 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-semibold"
                            />
                            ₽
                          </div>
                        )}
                      </div>
                      {!it.locked && !bill.paid && (
                        <button
                          onClick={() => deleteBillItem(it.id)}
                          className="shrink-0 p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-rose-600 active:scale-95 transition-all"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {!it.locked && it.item_type === "fixed" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="text-xs text-slate-500">
                          Объём ({it.unit})
                          <input
                            type="number"
                            step="0.01"
                            value={it.quantity}
                            onChange={(e) => patchBillItem(it.id, { quantity: Number(e.target.value || 0) })}
                            className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          Сумма
                          <div className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-black">
                            {money(it.sum)} ₽
                          </div>
                        </div>
                      </div>
                    )}

                    {!it.locked && it.item_type === "meter" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="text-xs text-slate-500">
                          Прошлые ({it.unit})
                          <div className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-xs font-semibold">
                            {money(it.prev_reading)}
                          </div>
                        </div>
                        <div className="text-xs text-slate-500">
                          Текущие ({it.unit})
                          <input
                            type="number"
                            step="0.01"
                            value={it.current_reading}
                            onChange={(e) => patchBillItem(it.id, { current_reading: Number(e.target.value || 0) })}
                            className="mt-1 w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold"
                          />
                        </div>
                        <div className="col-span-2 text-xs text-slate-700 font-bold flex justify-between pt-1">
                          <span>Итого по прибору:</span>
                          <span className="text-slate-900 font-black">{money(it.sum)} ₽</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 border-t border-slate-100 pt-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-slate-400 font-medium">Итого к оплате</div>
                <div className="text-2xl font-black text-slate-900">{money(bill.total_sum)} ₽</div>
                {bill.paid && (
                  <div className="text-xs text-emerald-600 font-bold mt-0.5">
                    Оплачено • {bill.receipt_label}
                  </div>
                )}
              </div>
              {!bill.paid && (
                <button
                  onClick={payBill}
                  disabled={bill.total_sum <= 0}
                  className={cls(
                    "px-5 py-3 rounded-2xl text-sm font-extrabold transition-all",
                    bill.total_sum <= 0
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-emerald-600 text-white active:scale-95 shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                  )}
                >
                  Оплатить (СБП)
                </button>
              )}
            </div>
          </div>

          {billAddOpen && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-end justify-center">
              <div className="modal-sheet w-full max-w-[420px] bg-white rounded-t-3xl p-5 pb-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900">Добавить услугу</div>
                  <button
                    onClick={() => {
                      triggerHaptic("selection");
                      setBillAddOpen(false);
                    }}
                    className="p-2 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 mb-1 block">Услуга</label>
                    <select
                      value={serviceKey}
                      onChange={(e) => onServiceChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white font-semibold text-sm text-slate-800"
                    >
                      {SERVICE_CATALOG.map((s) => (
                        <option key={s.key} value={s.key}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
                    <div className="text-sm font-bold text-slate-900">Учёт по счётчику</div>
                    <input
                      type="checkbox"
                      checked={isMeter}
                      onChange={(e) => onMeterToggle(e.target.checked)}
                      className="w-5 h-5 accent-violet-600 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Ед. изм.</label>
                      <input
                        value={draft.unit}
                        disabled
                        className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-100 text-slate-600 text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Тариф (₽)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={draft.tariff}
                        onChange={(e) => setDraft((p) => ({ ...p, tariff: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold"
                      />
                    </div>
                  </div>

                  {serviceKey === "other" && (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Название</label>
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-sm"
                        placeholder="Например, Охрана парковки"
                      />
                    </div>
                  )}

                  {isMeter ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Прошлые</label>
                        <input
                          type="number"
                          value={draft.prev_reading}
                          disabled
                          className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-slate-100 text-slate-600 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">Текущие</label>
                        <input
                          type="number"
                          step="0.01"
                          value={draft.current_reading}
                          onChange={(e) => setDraft((p) => ({ ...p, current_reading: e.target.value }))}
                          className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">Объём потребления</label>
                      <input
                        type="number"
                        step="0.01"
                        value={draft.quantity}
                        onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold"
                      />
                    </div>
                  )}

                  <button
                    onClick={addBillItem}
                    className="w-full mt-3 py-3.5 rounded-2xl bg-violet-600 text-white text-sm font-extrabold active:scale-95 shadow-lg shadow-violet-200 transition-all"
                  >
                    Добавить в квитанцию
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (tab === "house") {
      if (!house) return null;
      const waste = house.waste || {};
      return (
        <div className="tab-pane space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Статус коммуникаций дома
            </div>
            <div className="text-sm font-extrabold text-slate-900 mt-1">{house.address}</div>
            <div className="text-xs text-slate-400 mt-0.5">Обновлено: {house.updated_at}</div>

            <div className="mt-3.5 space-y-2">
              {house.systems.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3"
                >
                  <div className="text-xs font-bold text-slate-800">{s.name}</div>
                  <div className={cls("text-[11px] font-bold px-2.5 py-1 rounded-full", badge(s.badge))}>
                    {s.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl p-3.5">
              <div className="text-xs font-black text-slate-900">Вывоз ТКО</div>
              <div className="text-xs text-slate-600 mt-1">График: {waste.tko_schedule}</div>
              <div className="text-xs text-slate-600 mt-0.5">
                Контейнерная площадка: <span className="font-bold text-slate-800">{waste.containers_status}</span>
              </div>
              <button
                onClick={() => {
                  switchTab("requests");
                  setReqCategory("ТКО/контейнеры");
                  setReqText("Контейнерная площадка переполнена, требуется внеочередной вывоз ТКО.");
                }}
                className="mt-3 w-full py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs active:scale-95 transition-all"
              >
                Сообщить о переполнении
              </button>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-4 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-violet-400" />
                <span className="text-sm font-black">Видеокамеры</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                LIVE
              </div>
            </div>

            <div className="flex items-center gap-1.5 mt-3 overflow-x-auto pb-1 no-scrollbar">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    triggerHaptic("selection");
                    setSelectedEntrance(num);
                  }}
                  className={cls(
                    "px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all",
                    selectedEntrance === num
                      ? "bg-violet-600 text-white shadow-md shadow-violet-900/50"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  )}
                >
                  Подъезд {num}
                </button>
              ))}
            </div>

            <div className="mt-3 relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center p-4 text-center">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="absolute top-2 left-3 text-[10px] text-slate-400 font-mono tracking-wider">
                CAM_0{selectedEntrance}_ENTRANCE
              </div>
              <div className="absolute top-2 right-3 text-[10px] text-emerald-400 font-mono">
                {currentTimeStr || "09:08:25"}
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2 text-violet-400">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-slate-200">
                  Подъезд № {selectedEntrance}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 max-w-[240px]">
                  Тут должна быть подключена камера видеонаблюдения входной группы
                </div>
                <div className="mt-2 text-[10px] text-violet-400 bg-violet-950/80 px-2.5 py-0.5 rounded-full border border-violet-800/40">
                  RTSP / HLS поток активен
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "requests") {
      return (
        <div className="tab-pane space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              Новая заявка в диспетчерскую
            </div>
            <div className="mt-3 space-y-2.5">
              <select
                value={reqCategory}
                onChange={(e) => setReqCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold text-sm"
              >
                <option>Подъезд/двор</option>
                <option>Лифт</option>
                <option>Электроснабжение</option>
                <option>ХВС/ГВС</option>
                <option>Отопление</option>
                <option>Газ</option>
                <option>ТКО/контейнеры</option>
                <option>Видеонаблюдение</option>
                <option>Другое</option>
              </select>

              <textarea
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 bg-white text-slate-900 text-sm min-h-[90px] focus:outline-none focus:border-violet-500"
                placeholder="Опишите проблему и точное место..."
              />

              <div className="flex items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs cursor-pointer active:scale-95 transition-all">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                  <span>{reqPhoto ? "Фото прикреплено" : "Прикрепить фото"}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setReqPhoto(e.target.files?.[0] || null)}
                  />
                </label>
                {reqPhoto && (
                  <button
                    onClick={() => setReqPhoto(null)}
                    className="px-2.5 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 font-bold text-xs"
                  >
                    Удалить
                  </button>
                )}
              </div>

              <button
                onClick={createRequest}
                className="w-full mt-2 py-3 rounded-2xl bg-violet-600 text-white font-extrabold text-sm shadow-md shadow-violet-200 active:scale-95 transition-all"
              >
                Отправить заявку
              </button>
            </div>
          </div>

          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-bold px-1 mb-2">
              Ваши активные заявки
            </div>
            <div className="space-y-2.5">
              {requests.length === 0 ? (
                <div className="text-xs text-slate-400 bg-white border border-slate-200/80 rounded-2xl p-4 text-center">
                  Активных заявок нет
                </div>
              ) : (
                requests.slice().reverse().map((r) => (
                  <div key={r.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900">
                          #{r.id} • {r.category}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{r.created_at}</div>
                        <div className="text-xs text-slate-800 mt-1.5 break-words font-medium">{r.text}</div>
                        <div className="mt-2 text-[10px] font-bold inline-flex px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {r.status}
                        </div>
                        {r.photo_url && (
                          <img
                            src={`${apiOrigin}${r.photo_url}`}
                            className="mt-2.5 w-full max-h-48 object-cover rounded-xl border border-slate-200"
                            alt="Фото заявки"
                          />
                        )}
                      </div>
                      <button
                        onClick={() => cancelRequest(r.id)}
                        className="shrink-0 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-500 font-bold text-xs hover:text-rose-600 active:scale-95 transition-all"
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      );
    }

    if (tab === "chat") {
      return (
        <div className="tab-pane bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-172px)]">
          <div className="px-4 py-3 border-b border-slate-100 bg-white flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Общедомовой чат</div>
              <div className="text-sm font-extrabold text-slate-900">пр-кт Славы, д. 8</div>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
              Онлайн
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2.5 bg-slate-50/60">
            {chat.map((m) => {
              const isMine = String(m.author || "").startsWith("Вы");
              return (
                <div key={m.id} className={cls("flex flex-col", isMine ? "items-end" : "items-start")}>
                  <div
                    className={cls(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs leading-relaxed",
                      isMine
                        ? "bg-violet-600 text-white rounded-br-xs"
                        : "bg-white text-slate-900 border border-slate-200/80 rounded-bl-xs"
                    )}
                  >
                    <div className={cls("text-[10px] font-extrabold mb-0.5", isMine ? "text-violet-200" : "text-violet-700")}>
                      {m.author}
                    </div>
                    <div className="break-words font-medium">{m.text}</div>
                    <div className="flex items-center justify-between gap-3 mt-1 pt-0.5 border-t border-black/5">
                      <span className={cls("text-[9px]", isMine ? "text-white/70" : "text-slate-400")}>
                        {m.created_at ? m.created_at.slice(11, 16) : ""}
                      </span>
                      {isMine && (
                        <button
                          onClick={() => deleteChat(m.id)}
                          className="text-[10px] underline text-rose-200 hover:text-white"
                        >
                          удалить
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="p-2.5 border-t border-slate-100 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()}
                className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 text-xs focus:outline-none focus:border-violet-500"
                placeholder="Сообщение жителям дома..."
              />
              <button
                onClick={sendChat}
                className="w-10 h-10 rounded-2xl bg-violet-600 text-white flex items-center justify-center active:scale-95 shadow-md shadow-violet-200 transition-all shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "polls") {
      return (
        <div className="tab-pane space-y-3">
          {polls.map((p) => {
            const total = p.options.reduce((acc, o) => acc + o.votes, 0);
            const isClosed = Boolean(p.is_closed);
            const hasChosen = Boolean(p.chosen_option_id);

            return (
              <div key={p.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {isClosed ? (
                        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Lock className="w-3 h-3" /> Завершено
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Активно
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-black text-slate-900 mt-1 break-words">{p.title}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Дедлайн: {p.deadline}</div>
                  </div>

                  {!isClosed && hasChosen && (
                    <button
                      onClick={() => unvote(p.id)}
                      className="shrink-0 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs active:scale-95 transition-all"
                    >
                      Отменить голос
                    </button>
                  )}
                </div>

                <div className="mt-3.5 space-y-2">
                  {p.options.map((o) => {
                    const pct = total ? Math.round((o.votes / total) * 100) : 0;
                    const chosen = p.chosen_option_id === o.id;

                    return (
                      <div
                        key={o.id}
                        className={cls(
                          "border rounded-2xl p-3 transition-all",
                          chosen ? "bg-violet-50/60 border-violet-200" : "bg-slate-50/70 border-slate-200/80"
                        )}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-extrabold text-slate-900">
                            {o.text} {chosen && <span className="text-violet-600 font-black ml-1">(Ваш голос)</span>}
                          </span>
                          <span className="font-bold text-slate-600">
                            {o.votes} • {pct}%
                          </span>
                        </div>

                        <div className="mt-2 h-2 rounded-full bg-slate-200/80 overflow-hidden">
                          <div
                            className={cls("h-full transition-all duration-500", chosen ? "bg-violet-600" : "bg-slate-400")}
                            style={{ width: `${pct}%` }}
                          />
                        </div>

                        {!isClosed && (
                          <button
                            onClick={() => {
                              if (hasChosen && !chosen) {
                                triggerHaptic("error");
                                showToast("Сначала отмените текущий голос, чтобы выбрать другой вариант");
                                return;
                              }
                              if (!chosen) {
                                vote(p.id, o.id);
                              }
                            }}
                            disabled={chosen}
                            className={cls(
                              "mt-2.5 w-full py-2 rounded-xl text-xs font-extrabold border transition-all",
                              chosen
                                ? "bg-violet-600 text-white border-violet-600 cursor-default"
                                : hasChosen
                                ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 active:scale-95"
                            )}
                          >
                            {chosen ? "Вы проголосовали" : hasChosen ? "Сначала отмените голос" : "Выбрать этот вариант"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {isClosed && (
                  <div className="mt-3 text-center text-xs font-bold text-slate-500 bg-slate-50 py-2 rounded-xl border border-slate-200/60">
                    Итог голосования: Решение утверждено большинством (13 на 7)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
  }, [tab, bill, billAddOpen, serviceKey, isMeter, draft, house, requests, reqCategory, reqText, reqPhoto, chat, newMsg, polls, selectedEntrance, currentTimeStr]);

  return (
    <div className="w-full max-w-[420px] min-h-[100dvh] bg-slate-50 relative flex flex-col shadow-2xl">
      <header className="fixed top-0 inset-x-0 mx-auto w-full max-w-[420px] z-50 bg-violet-600 text-white shadow-md">
        <div className="px-4 pt-[calc(10px+env(safe-area-inset-top))] pb-3 flex items-center justify-between">
          <button
            onClick={resetAllData}
            title="Сбросить все данные на первоначальные"
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all active:rotate-180"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <div className="text-center">
            <div className="text-lg font-black tracking-tight leading-tight">МойДом</div>
            <div className="text-[10px] text-white/80 font-medium leading-none mt-0.5">
              Белгородская обл., пр-кт Славы, д. 8, кв. 8
            </div>
          </div>

          <div className="w-8 h-8 flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20"></span>
          </div>
        </div>
      </header>

      {toast && (
        <div className="toast-animate fixed top-[calc(60px+env(safe-area-inset-top))] inset-x-0 mx-auto w-[calc(100%-32px)] max-w-[388px] z-[70] bg-slate-900 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-violet-400"></span>
          <span className="flex-1">{toast}</span>
        </div>
      )}

      <main className="w-full max-w-[420px] px-4 pt-[76px] pb-[calc(88px+env(safe-area-inset-bottom))]">
        {content}
      </main>

      <nav className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[420px] z-50 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="pb-[env(safe-area-inset-bottom)] px-2">
          <div className="grid grid-cols-5 items-end">
            <button
              onClick={() => switchTab("bill")}
              className="py-2 flex flex-col items-center gap-0.5 transition-all"
            >
              <div className={cls("p-1.5 rounded-xl transition-all", tab === "bill" ? "text-violet-600 scale-110" : "text-slate-400")}>
                <FileText className="w-5 h-5" />
              </div>
              <span className={cls("text-[10px] font-bold", tab === "bill" ? "text-violet-600" : "text-slate-400")}>
                Счета
              </span>
            </button>

            <button
              onClick={() => switchTab("house")}
              className="py-2 flex flex-col items-center gap-0.5 transition-all"
            >
              <div className={cls("p-1.5 rounded-xl transition-all", tab === "house" ? "text-violet-600 scale-110" : "text-slate-400")}>
                <Home className="w-5 h-5" />
              </div>
              <span className={cls("text-[10px] font-bold", tab === "house" ? "text-violet-600" : "text-slate-400")}>
                Дом
              </span>
            </button>

            <div className="flex flex-col items-center justify-center relative -top-3">
              <button
                onClick={() => switchTab("requests")}
                className={cls(
                  "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-all border-4 border-slate-50",
                  tab === "requests"
                    ? "bg-violet-700 shadow-violet-400/50 scale-105"
                    : "bg-violet-600 shadow-violet-300 hover:bg-violet-700 active:scale-95"
                )}
              >
                <Plus className="w-6 h-6 stroke-[3]" />
              </button>
              <span className={cls("text-[10px] font-extrabold mt-1", tab === "requests" ? "text-violet-600" : "text-slate-400")}>
                Заявка
              </span>
            </div>

            <button
              onClick={() => switchTab("chat")}
              className="py-2 flex flex-col items-center gap-0.5 transition-all"
            >
              <div className={cls("p-1.5 rounded-xl transition-all", tab === "chat" ? "text-violet-600 scale-110" : "text-slate-400")}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className={cls("text-[10px] font-bold", tab === "chat" ? "text-violet-600" : "text-slate-400")}>
                Чат
              </span>
            </button>

            <button
              onClick={() => switchTab("polls")}
              className="py-2 flex flex-col items-center gap-0.5 transition-all"
            >
              <div className={cls("p-1.5 rounded-xl transition-all", tab === "polls" ? "text-violet-600 scale-110" : "text-slate-400")}>
                <CheckSquare className="w-5 h-5" />
              </div>
              <span className={cls("text-[10px] font-bold", tab === "polls" ? "text-violet-600" : "text-slate-400")}>
                Опросы
              </span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}