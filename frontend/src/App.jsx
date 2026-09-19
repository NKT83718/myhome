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
} from "lucide-react";

const USER_ID = "flat_14";

const apiOrigin = import.meta?.env?.VITE_API_ORIGIN || "";
const API = "/api";

function cls(...a) {
  return a.filter(Boolean).join(" ");
}
function money(x) {
  return (Number(x || 0)).toFixed(2);
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

  const showToast = (text) => {
    setToast(text);
    window.setTimeout(() => setToast(null), 2500);
  };

  const loadBill = async () => {
    const r = await fetch(`${API}/bill`);
    setBill(await r.json());
  };
  const loadHouse = async () => {
    const r = await fetch(`${API}/house`);
    setHouse(await r.json());
  };
  const loadRequests = async () => {
    const r = await fetch(`${API}/requests`);
    setRequests(await r.json());
  };
  const loadChat = async () => {
    const r = await fetch(`${API}/chat`);
    setChat(await r.json());
  };
  const loadPolls = async () => {
    const r = await fetch(`${API}/polls?user_id=${encodeURIComponent(USER_ID)}`);
    setPolls(await r.json());
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
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (tab === "chat") {
      window.setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
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
      showToast("Не удалось добавить услугу");
      return;
    }

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
    setBill(await r.json());
  };

  const deleteBillItem = async (id) => {
    const r = await fetch(`${API}/bill/items/${id}`, { method: "DELETE" });
    setBill(await r.json());
    showToast("Услуга удалена");
  };

  const payBill = async () => {
    const r = await fetch(`${API}/bill/pay`, { method: "POST" });
    setBill(await r.json());
    showToast("Оплачено. Чек сформирован.");
  };

  const createRequest = async () => {
    if (!reqText.trim()) {
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
      showToast("Не удалось отправить заявку");
      return;
    }

    setRequests((prev) => [data.request, ...prev]);
    setReqText("");
    setReqPhoto(null);
    showToast(`Заявка #${data.request.id} отправлена`);
  };

  const cancelRequest = async (id) => {
    await fetch(`${API}/requests/${id}`, { method: "DELETE" });
    await loadRequests();
    showToast(`Заявка #${id} отменена`);
  };

  const sendChat = async () => {
    if (!newMsg.trim()) return;
    const r = await fetch(`${API}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: "Вы (кв. —)", text: newMsg }),
    });
    const msg = await r.json();
    setChat((prev) => [...prev, msg]);
    setNewMsg("");
  };

  const deleteChat = async (id) => {
    await fetch(`${API}/chat/${id}`, { method: "DELETE" });
    await loadChat();
  };

  const vote = async (pollId, optionId) => {
    await fetch(`${API}/polls/${pollId}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: USER_ID, option_id: optionId }),
    });
    await loadPolls();
    showToast("Голос учтён");
  };

  const unvote = async (pollId) => {
    await fetch(`${API}/polls/${pollId}/vote?user_id=${encodeURIComponent(USER_ID)}`, {
      method: "DELETE",
    });
    await loadPolls();
    showToast("Голос отменён");
  };

  const content = useMemo(() => {
    if (tab === "bill") {
      if (!bill) return null;

      return (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
                  Единый платёжный документ
                </div>
                <div className="text-sm font-bold text-slate-800 mt-1">{bill.period}</div>
                <div className="text-xs text-slate-500 mt-1 break-words">
                  Л/С: {bill.account} • {bill.address}
                </div>
              </div>

              {!bill.paid && (
                <button
                  onClick={() => setBillAddOpen(true)}
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold active:scale-[0.99]"
                >
                  <Plus className="w-4 h-4" />
                  Услуга
                </button>
              )}
            </div>

            <div className="mt-4 space-y-2">
              {bill.items.length === 0 ? (
                <div className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
                  {bill.paid ? "В этом месяце услуги оплачены." : "Добавьте услуги и выполните оплату."}
                </div>
              ) : (
                bill.items.map((it) => (
                  <div key={it.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900 break-words">{it.name}</div>

                        {it.locked ? (
                          <div className="mt-2 text-sm font-black text-slate-900">
                            Начислено: {money(it.sum)} ₽
                          </div>
                        ) : (
                          <>
                            <div className="text-xs text-slate-500 mt-2">
                              Тариф:{" "}
                              <input
                                type="number"
                                step="0.01"
                                value={it.tariff}
                                onChange={(e) => patchBillItem(it.id, { tariff: Number(e.target.value || 0) })}
                                className="w-24 px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-800 text-xs font-semibold"
                              />{" "}
                              ₽
                            </div>
                          </>
                        )}
                      </div>

                      {!it.locked && !bill.paid && (
                        <button
                          onClick={() => deleteBillItem(it.id)}
                          className="shrink-0 p-2 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-rose-600"
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
                            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold"
                          />
                        </div>
                        <div className="text-xs text-slate-500">
                          Сумма
                          <div className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm font-black">
                            {money(it.sum)} ₽
                          </div>
                        </div>
                        <div className="col-span-2 text-[11px] text-slate-500">
                          Формула: тариф × объём
                        </div>
                      </div>
                    )}

                    {!it.locked && it.item_type === "meter" && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="text-xs text-slate-500">
                          Прошлые ({it.unit})
                          <div className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-800 text-sm font-semibold">
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
                            className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-semibold"
                          />
                        </div>
                        <div className="col-span-2 text-[11px] text-slate-500">
                          Формула: тариф × (текущие − прошлые)
                        </div>
                        <div className="col-span-2 text-xs text-slate-700 font-bold">
                          Сумма: {money(it.sum)} ₽
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 border-t pt-3 flex items-end justify-between gap-3">
              <div>
                <div className="text-xs text-slate-500">Итого к оплате</div>
                <div className="text-2xl font-black text-slate-900">{money(bill.total_sum)} ₽</div>
                {bill.paid && (
                  <div className="text-xs text-emerald-700 font-bold mt-1">
                    Оплачено • {bill.receipt_label}
                  </div>
                )}
              </div>

              {!bill.paid && (
                <button
                  onClick={payBill}
                  disabled={bill.total_sum <= 0}
                  className={cls(
                    "px-4 py-3 rounded-2xl text-sm font-extrabold",
                    bill.total_sum <= 0
                      ? "bg-slate-200 text-slate-500"
                      : "bg-emerald-600 text-white active:scale-[0.99] shadow-lg shadow-emerald-200"
                  )}
                >
                  Оплатить (СБП)
                </button>
              )}
            </div>
          </div>

          {billAddOpen && (
            <div className="fixed inset-0 bg-black/30 z-[60] flex items-end">
              <div className="w-full bg-white rounded-t-3xl p-4 pb-6">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-black text-slate-900">Добавить услугу</div>
                  <button onClick={() => setBillAddOpen(false)} className="p-2 rounded-xl border border-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-xs text-slate-500">Услуга</div>
                  <select
                    value={serviceKey}
                    onChange={(e) => onServiceChange(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl border border-slate-200 bg-white font-semibold"
                  >
                    {SERVICE_CATALOG.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                    <div className="text-sm font-bold text-slate-900">По счётчику</div>
                    <input
                      type="checkbox"
                      checked={isMeter}
                      onChange={(e) => onMeterToggle(e.target.checked)}
                      className="w-5 h-5 accent-violet-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-slate-500">Ед. изм.</div>
                      <input
                        value={draft.unit}
                        disabled
                        className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-100"
                      />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Тариф (₽)</div>
                      <input
                        type="number"
                        step="0.01"
                        value={draft.tariff}
                        onChange={(e) => setDraft((p) => ({ ...p, tariff: e.target.value }))}
                        className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white"
                      />
                    </div>
                  </div>

                  {serviceKey === "other" && (
                    <>
                      <div className="text-xs text-slate-500">Название</div>
                      <input
                        value={draft.name}
                        onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                        className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white"
                        placeholder="Введите название услуги"
                      />
                    </>
                  )}

                  {isMeter ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-xs text-slate-500">Прошлые показания</div>
                        <input
                          type="number"
                          value={draft.prev_reading}
                          disabled
                          className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-100"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Текущие показания</div>
                        <input
                          type="number"
                          step="0.01"
                          value={draft.current_reading}
                          onChange={(e) => setDraft((p) => ({ ...p, current_reading: e.target.value }))}
                          className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-slate-500">Объём</div>
                      <input
                        type="number"
                        step="0.01"
                        value={draft.quantity}
                        onChange={(e) => setDraft((p) => ({ ...p, quantity: e.target.value }))}
                        className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-white"
                      />
                    </div>
                  )}

                  <button
                    onClick={addBillItem}
                    className="w-full mt-2 px-4 py-3 rounded-2xl bg-violet-600 text-white text-sm font-extrabold active:scale-[0.99]"
                  >
                    Добавить
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
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              Статус коммуникаций дома
            </div>
            <div className="text-sm font-bold text-slate-900 mt-1">{house.address}</div>
            <div className="text-xs text-slate-500 mt-1">Обновлено: {house.updated_at}</div>

            <div className="mt-3 space-y-2">
              {house.systems.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3">
                  <div className="text-sm font-semibold text-slate-900">{s.name}</div>
                  <div className={cls("text-xs font-bold px-3 py-1 rounded-full", badge(s.badge))}>
                    {s.status}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-3">
              <div className="text-sm font-black text-slate-900">Вывоз ТКО</div>
              <div className="text-xs text-slate-600 mt-1">График: {waste.tko_schedule}</div>
              <div className="text-xs text-slate-600 mt-1">
                Контейнерная площадка: <span className="font-bold">{waste.containers_status}</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Обновлено: {waste.last_update}</div>

              <button
                onClick={() => {
                  setTab("requests");
                  setReqCategory("ТКО/контейнеры");
                  setReqText("Контейнерная площадка переполнена, требуется вывоз ТКО.");
                }}
                className="mt-3 w-full px-4 py-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-sm active:scale-[0.99]"
              >
                Сообщить о переполнении контейнеров
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "requests") {
      return (
        <div className="space-y-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">
              Новая заявка
            </div>

            <div className="mt-3 space-y-2">
              <select
                value={reqCategory}
                onChange={(e) => setReqCategory(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 font-semibold"
              >
                <option>Подъезд/двор</option>
                <option>Лифт</option>
                <option>Электроснабжение</option>
                <option>ХВС/ГВС</option>
                <option>Отопление</option>
                <option>Газ</option>
                <option>ТКО/контейнеры</option>
                <option>Другое</option>
              </select>

              <textarea
                value={reqText}
                onChange={(e) => setReqText(e.target.value)}
                className="w-full px-3 py-3 rounded-2xl border border-slate-200 bg-white text-slate-900 min-h-[110px]"
                placeholder="Опишите проблему и где именно."
              />

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 font-semibold text-sm">
                  <Paperclip className="w-4 h-4" />
                  <span>{reqPhoto ? "Фото выбрано" : "Прикрепить фото"}</span>
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
                    className="px-3 py-2 rounded-2xl border border-rose-200 bg-rose-50 text-rose-700 font-extrabold text-sm"
                  >
                    Удалить фото
                  </button>
                )}
              </div>

              <button
                onClick={createRequest}
                className="w-full px-4 py-3 rounded-2xl bg-violet-600 text-white font-extrabold text-sm active:scale-[0.99]"
              >
                Отправить
              </button>
            </div>
          </div>

          <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold px-1">
            Активные заявки
          </div>

          <div className="space-y-2">
            {requests.slice().reverse().map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900">
                      #{r.id} • {r.category}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{r.created_at}</div>
                    <div className="text-sm text-slate-800 mt-2 break-words">{r.text}</div>
                    <div className="mt-2 text-xs font-bold inline-flex px-3 py-1 rounded-full bg-slate-100 text-slate-700">
                      {r.status}
                    </div>
                    {r.photo_url && (
                      <img
                        src={`${apiOrigin}${r.photo_url}`}
                        className="mt-3 w-full rounded-2xl border border-slate-200"
                        alt="Фото заявки"
                      />
                    )}
                  </div>

                  <button
                    onClick={() => cancelRequest(r.id)}
                    className="shrink-0 px-3 py-2 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-sm"
                  >
                    Отменить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "chat") {
      return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100dvh-168px)]">
          <div className="px-4 py-3 border-b border-slate-200">
            <div className="text-xs uppercase tracking-wide text-slate-400 font-semibold">Чат дома</div>
            <div className="text-sm font-bold text-slate-900 mt-1">Официальный домовой чат</div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-2 bg-slate-50">
            {chat.map((m) => {
              const isMine = (m.author || "").startsWith("Вы");
              return (
                <div key={m.id} className={cls("flex", isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={cls(
                      "max-w-[85%] rounded-2xl px-3 py-2 border",
                      isMine ? "bg-violet-600 text-white border-violet-600" : "bg-white text-slate-900 border-slate-200"
                    )}
                  >
                    <div className={cls("text-[11px] font-bold", isMine ? "text-white/90" : "text-violet-700")}>
                      {m.author}
                    </div>
                    <div className="text-sm break-words mt-0.5">{m.text}</div>
                    <div className={cls("text-[10px] mt-1", isMine ? "text-white/70" : "text-slate-400")}>
                      {m.created_at}
                    </div>

                    {isMine && (
                      <button onClick={() => deleteChat(m.id)} className="mt-2 text-[11px] font-bold underline text-white/90">
                        удалить
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex items-center gap-2">
              <input
                value={newMsg}
                onChange={(e) => setNewMsg(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900"
                placeholder="Сообщение соседям..."
              />
              <button
                onClick={sendChat}
                className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center active:scale-[0.99]"
                title="Отправить"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (tab === "polls") {
      return (
        <div className="space-y-3">
          {polls.map((p) => {
            const total = p.options.reduce((acc, o) => acc + o.votes, 0);
            return (
              <div key={p.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-black text-slate-900 break-words">{p.title}</div>
                    <div className="text-xs text-slate-500 mt-1">Дедлайн: {p.deadline}</div>
                  </div>
                  {p.chosen_option_id && (
                    <button
                      onClick={() => unvote(p.id)}
                      className="shrink-0 px-3 py-2 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 font-extrabold text-xs"
                    >
                      Отменить
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-2">
                  {p.options.map((o) => {
                    const pct = total ? Math.round((o.votes / total) * 100) : 0;
                    const chosen = p.chosen_option_id === o.id;
                    return (
                      <div key={o.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-3">
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-bold text-slate-900">
                            {o.text} {chosen ? <span className="text-violet-700">(ваш голос)</span> : null}
                          </div>
                          <div className="text-xs font-bold text-slate-600">
                            {o.votes} • {pct}%
                          </div>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-violet-600" style={{ width: `${pct}%` }} />
                        </div>

                        <button
                          onClick={() => vote(p.id, o.id)}
                          className={cls(
                            "mt-3 w-full px-4 py-2 rounded-2xl text-sm font-extrabold border",
                            chosen ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-white text-slate-900 border-slate-200"
                          )}
                        >
                          {chosen ? "Вы уже выбрали этот вариант" : "Проголосовать"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    return null;
  }, [tab, bill, billAddOpen, serviceKey, isMeter, draft, house, requests, reqCategory, reqText, reqPhoto, chat, newMsg, polls]);

  return (
    <div className="min-h-[100dvh] w-full bg-slate-100 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[420px] min-h-[100dvh] bg-slate-100 relative shadow-[0_0_0_1px_rgba(0,0,0,0.06)]">
        <header className="fixed top-0 inset-x-0 mx-auto w-full max-w-[420px] z-50 bg-violet-600 text-white">
          <div className="px-4 pt-[calc(12px+env(safe-area-inset-top))] pb-3">
            <div className="text-center text-xl font-black leading-none">МойДом</div>
            <div className="text-center text-xs text-white/85 mt-1">
              Белгородская область, —, —
            </div>
          </div>
        </header>

        {toast && (
          <div className="fixed top-[calc(64px+env(safe-area-inset-top))] inset-x-0 mx-auto w-[calc(100%-32px)] max-w-[388px] z-[70] bg-emerald-600 text-white text-sm font-bold px-4 py-3 rounded-2xl shadow-lg">
            {toast}
          </div>
        )}

        <main className="px-4 pt-[86px] pb-[calc(84px+env(safe-area-inset-bottom))]">
          {content}
        </main>

        <nav className="fixed bottom-0 inset-x-0 mx-auto w-full max-w-[420px] z-50 bg-white border-t border-slate-200">
          <div className="pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-5">
              <TabButton active={tab === "bill"} onClick={() => setTab("bill")} icon={<FileText className="w-5 h-5" />} label="Квитанция" />
              <TabButton active={tab === "house"} onClick={() => setTab("house")} icon={<Home className="w-5 h-5" />} label="Дом" />
              <TabButton active={tab === "requests"} onClick={() => setTab("requests")} icon={<Wrench className="w-5 h-5" />} label="Заявки" />
              <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare className="w-5 h-5" />} label="Чат" />
              <TabButton active={tab === "polls"} onClick={() => setTab("polls")} icon={<CheckSquare className="w-5 h-5" />} label="Опросы" />
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className="py-2.5 flex flex-col items-center gap-1">
      <div className={cls("p-2 rounded-2xl", active ? "bg-violet-50 text-violet-700" : "text-slate-400")}>
        {icon}
      </div>
      <div className={cls("text-[11px] font-bold", active ? "text-violet-700" : "text-slate-400")}>
        {label}
      </div>
    </button>
  );
}

