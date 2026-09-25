import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Literal, Dict, Any, List
import httpx
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

app = FastAPI(title="МойДом MAX API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_BOT_TOKEN = os.getenv("MAX_BOT_TOKEN", "")
MAX_DEMO_CHAT_ID = os.getenv("MAX_DEMO_CHAT_ID", "")
BASE_DIR = Path(__file__).parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

BASE_TIME = datetime(2026, 9, 19, 9, 8, 25)
_ticks = {"t": 0}

def ts():
    _ticks["t"] += 1
    return (BASE_TIME + timedelta(minutes=_ticks["t"])).isoformat(timespec="seconds")

def to_float(x: Any, default: float = 0.0) -> float:
    try:
        return float(x)
    except Exception:
        return default

UserItemType = Literal["fixed", "meter"]

AUTO_ITEMS_INIT: List[Dict[str, Any]] = [
    {"id": 1, "name": "Содержание жилого помещения", "item_type": "auto", "unit": "₽", "sum": 1650.00, "locked": True},
    {"id": 2, "name": "Взнос на капитальный ремонт", "item_type": "auto", "unit": "₽", "sum": 580.00, "locked": True},
    {"id": 3, "name": "Домофон", "item_type": "auto", "unit": "₽", "sum": 85.00, "locked": True},
    {"id": 4, "name": "Обращение с ТКО", "item_type": "auto", "unit": "₽", "sum": 320.00, "locked": True},
]

def get_initial_bill():
    return {
        "period": "Сентябрь 2026",
        "account": "4081-7810-0008",
        "address": "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8",
        "paid": False,
        "paid_at": None,
        "receipt_label": None,
        "user_items": []
    }

def get_initial_house():
    return {
        "address": "Белгородская обл., г. Белгород, пр-кт Славы, д. 8",
        "updated_at": "2026-09-19T09:10:00",
        "systems": [
            {"id": 1, "name": "Электроснабжение", "status": "Штатно", "badge": "ok"},
            {"id": 2, "name": "Лифт", "status": "Штатно", "badge": "ok"},
            {"id": 3, "name": "Холодное водоснабжение (ХВС)", "status": "Штатно", "badge": "ok"},
            {"id": 4, "name": "Горячее водоснабжение (ГВС)", "status": "Штатно", "badge": "ok"},
            {"id": 5, "name": "Газоснабжение", "status": "Штатно", "badge": "ok"},
            {"id": 6, "name": "Отопление", "status": "Отключено до 15 октября (межотопительный период)", "badge": "info"},
        ],
        "waste": {
            "tko_schedule": "Пн, Ср, Пт, ориентировочно 09:00",
            "containers_status": "Норма",
            "last_update": "2026-09-19T09:10:00"
        }
    }

def get_initial_chat():
    return [
        {
            "id": 1,
            "created_at": "2026-09-19T08:15:00",
            "author": "ТСЖ «Уютный Дом»",
            "text": "Уважаемые жильцы! Завтра с 10:00 до 12:00 будет проводиться плановая проверка систем вентиляции и дымоудаления."
        },
        {
            "id": 2,
            "created_at": "2026-09-19T08:22:10",
            "author": "Мария (кв. 18)",
            "text": "Соседи, добрый день! Подскажите, во 2 подъезде у всех горячая вода идет с нормальным напором?"
        },
        {
            "id": 3,
            "created_at": "2026-09-19T08:24:45",
            "author": "Алексей (кв. 42)",
            "text": "Здравствуйте! У нас в 3 подъезде всё в порядке, напор отличный."
        },
        {
            "id": 4,
            "created_at": "2026-09-19T08:30:00",
            "author": "Диспетчерская служба",
            "text": "Напоминаем, что показания индивидуальных приборов учёта принимаются до 25 числа включительно."
        },
        {
            "id": 5,
            "created_at": "2026-09-19T08:35:12",
            "author": "Елена (кв. 7)",
            "text": "Спасибо за информацию!"
        }
    ]

def get_initial_polls():
    return [
        {
            "id": 1,
            "title": "Установка шлагбаума и системы видеонаблюдения во дворе",
            "deadline": "15.09.2026 (Завершён)",
            "is_closed": True,
            "options": [
                {"id": 1, "text": "Да", "votes": 13},
                {"id": 2, "text": "Нет", "votes": 7}
            ],
            "user_votes": {"flat_8": 1}
        },
        {
            "id": 2,
            "title": "Установить специальный ящик для сбора батареек на 1 этаже?",
            "deadline": "30.09.2026",
            "is_closed": False,
            "options": [
                {"id": 1, "text": "Да", "votes": 8},
                {"id": 2, "text": "Нет", "votes": 2}
            ],
            "user_votes": {}
        },
        {
            "id": 3,
            "title": "Сделать освещение в подъезде автоматическим (датчики движения)?",
            "deadline": "30.09.2026",
            "is_closed": False,
            "options": [
                {"id": 1, "text": "Да", "votes": 11},
                {"id": 2, "text": "Нет", "votes": 1}
            ],
            "user_votes": {}
        }
    ]

bill_state: Dict[str, Any] = get_initial_bill()
house_store: Dict[str, Any] = get_initial_house()
requests_store: List[Dict[str, Any]] = []
chat_store: List[Dict[str, Any]] = get_initial_chat()
polls_store: List[Dict[str, Any]] = get_initial_polls()
counters = {"user_item_id": 100, "request": 0, "chat": 5, "receipt": 0}

class UserBillItemCreate(BaseModel):
    name: str
    item_type: UserItemType
    unit: str
    tariff: float = Field(ge=0)
    quantity: Optional[float] = Field(default=None, ge=0)
    prev_reading: Optional[float] = Field(default=None, ge=0)
    current_reading: Optional[float] = Field(default=None, ge=0)

class UserBillItemPatch(BaseModel):
    tariff: Optional[float] = Field(default=None, ge=0)
    quantity: Optional[float] = Field(default=None, ge=0)
    current_reading: Optional[float] = Field(default=None, ge=0)

class ChatMessageCreate(BaseModel):
    author: str
    text: str

class PollVoteBody(BaseModel):
    user_id: str
    option_id: int

def calc_user_item_sum(item: Dict[str, Any]) -> float:
    if item["item_type"] == "fixed":
        return round(to_float(item.get("quantity", 0.0)) * to_float(item.get("tariff", 0.0)), 2)
    prev_r = to_float(item.get("prev_reading", 0.0))
    curr_r = to_float(item.get("current_reading", prev_r))
    delta = max(0.0, curr_r - prev_r)
    return round(delta * to_float(item.get("tariff", 0.0)), 2)

def calc_total_unpaid() -> float:
    total = 0.0
    for a in AUTO_ITEMS_INIT:
        total += to_float(a.get("sum", 0.0))
    for u in bill_state["user_items"]:
        total += calc_user_item_sum(u)
    return round(total, 2)

def make_receipt_label() -> str:
    counters["receipt"] += 1
    return f"ЧЕК #{counters['receipt']:04d}-B"

async def try_send_to_max(text: str) -> bool:
    if not MAX_BOT_TOKEN or not MAX_DEMO_CHAT_ID:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            url = f"https://api.max.vk.company/bot{MAX_BOT_TOKEN}/sendMessage"
            payload = {"chat_id": MAX_DEMO_CHAT_ID, "text": text}
            r = await client.post(url, json=payload)
            return r.status_code == 200
    except Exception:
        return False

@app.post("/api/reset")
def reset_all():
    global bill_state, house_store, requests_store, chat_store, polls_store, counters
    bill_state = get_initial_bill()
    house_store = get_initial_house()
    requests_store = []
    chat_store = get_initial_chat()
    polls_store = get_initial_polls()
    counters["user_item_id"] = 100
    counters["request"] = 0
    counters["chat"] = 5
    counters["receipt"] = 0
    return {"success": True, "message": "Данные успешно сброшены к начальному состоянию"}

@app.get("/api/bill")
def get_bill():
    if bill_state["paid"]:
        return {
            "period": bill_state["period"],
            "account": bill_state["account"],
            "address": bill_state["address"],
            "paid": True,
            "paid_at": bill_state["paid_at"],
            "receipt_label": bill_state["receipt_label"],
            "items": [],
            "total_sum": 0.0
        }
    items = []
    for a in AUTO_ITEMS_INIT:
        items.append({**a, "sum": round(to_float(a.get("sum", 0.0)), 2)})
    for u in bill_state["user_items"]:
        items.append({**u, "sum": calc_user_item_sum(u)})
    return {
        "period": bill_state["period"],
        "account": bill_state["account"],
        "address": bill_state["address"],
        "paid": False,
        "paid_at": None,
        "receipt_label": None,
        "items": items,
        "total_sum": calc_total_unpaid()
    }

@app.post("/api/bill/items")
def add_user_bill_item(body: UserBillItemCreate):
    if bill_state["paid"]:
        raise HTTPException(status_code=409, detail="Bill already paid")
    if body.item_type == "fixed":
        if body.quantity is None:
            raise HTTPException(status_code=400, detail="quantity is required for fixed item")
        item = {
            "id": counters["user_item_id"] + 1,
            "name": body.name,
            "item_type": "fixed",
            "unit": body.unit,
            "tariff": float(body.tariff),
            "quantity": float(body.quantity),
            "locked": False
        }
    else:
        if body.prev_reading is None:
            raise HTTPException(status_code=400, detail="prev_reading is required for meter item")
        curr = body.current_reading if body.current_reading is not None else body.prev_reading
        item = {
            "id": counters["user_item_id"] + 1,
            "name": body.name,
            "item_type": "meter",
            "unit": body.unit,
            "tariff": float(body.tariff),
            "prev_reading": float(body.prev_reading),
            "current_reading": float(curr),
            "locked": False
        }
    counters["user_item_id"] = item["id"]
    bill_state["user_items"].append(item)
    return get_bill()

@app.patch("/api/bill/items/{item_id}")
def patch_user_bill_item(item_id: int, body: UserBillItemPatch):
    if bill_state["paid"]:
        raise HTTPException(status_code=409, detail="Bill already paid")
    if item_id < 100:
        raise HTTPException(status_code=403, detail="Auto items are locked")
    for u in bill_state["user_items"]:
        if u["id"] == item_id:
            if body.tariff is not None:
                u["tariff"] = float(body.tariff)
            if u["item_type"] == "fixed":
                if body.quantity is not None:
                    u["quantity"] = float(body.quantity)
            else:
                if body.current_reading is not None:
                    u["current_reading"] = float(body.current_reading)
            return get_bill()
    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/bill/items/{item_id}")
def delete_user_bill_item(item_id: int):
    if bill_state["paid"]:
        raise HTTPException(status_code=409, detail="Bill already paid")
    if item_id < 100:
        raise HTTPException(status_code=403, detail="Auto items are locked")
    bill_state["user_items"] = [x for x in bill_state["user_items"] if x["id"] != item_id]
    return get_bill()

@app.post("/api/bill/pay")
async def pay_bill():
    if bill_state["paid"]:
        return get_bill()
    total = calc_total_unpaid()
    bill_state["paid"] = True
    bill_state["paid_at"] = "2026-09"
    bill_state["receipt_label"] = make_receipt_label()
    bill_state["user_items"] = []
    text = f"{bill_state['receipt_label']}. ЖКУ оплачены: {total:.2f} ₽. Период: {bill_state['period']}."
    await try_send_to_max(text)
    return get_bill()

@app.get("/api/house")
def get_house():
    return house_store

@app.get("/api/requests")
def get_requests():
    return requests_store

@app.post("/api/requests")
async def create_request(
    category: str = Form(...),
    text: str = Form(...),
    user_id: str = Form("flat_8"),
    photo: Optional[UploadFile] = File(None)
):
    counters["request"] += 1
    req_id = counters["request"]
    photo_url = None
    if photo is not None:
        ext = Path(photo.filename).suffix.lower()[:10] if photo.filename else ""
        filename = f"request_{req_id}{ext or '.jpg'}"
        dst = UPLOADS_DIR / filename
        dst.write_bytes(await photo.read())
        photo_url = f"/uploads/{filename}"
    item = {
        "id": req_id,
        "created_at": ts(),
        "category": category,
        "text": text,
        "status": "Принято в обработку",
        "user_id": user_id,
        "photo_url": photo_url
    }
    requests_store.append(item)
    return {"success": True, "request": item}

@app.delete("/api/requests/{req_id}")
def delete_request(req_id: int):
    global requests_store
    requests_store = [r for r in requests_store if r["id"] != req_id]
    return {"success": True}

@app.get("/api/chat")
def get_chat():
    return chat_store

@app.post("/api/chat")
def post_chat(msg: ChatMessageCreate):
    counters["chat"] += 1
    item = {
        "id": counters["chat"],
        "created_at": ts(),
        "author": msg.author,
        "text": msg.text
    }
    chat_store.append(item)
    return item

@app.delete("/api/chat/{msg_id}")
def delete_chat(msg_id: int):
    global chat_store
    for m in chat_store:
        if m["id"] == msg_id:
            if not str(m.get("author", "")).startswith("Вы"):
                raise HTTPException(status_code=403, detail="Удалять можно только свои сообщения")
            chat_store = [x for x in chat_store if x["id"] != msg_id]
            return {"success": True}
    raise HTTPException(status_code=404, detail="Сообщение не найдено")

@app.get("/api/polls")
def get_polls(user_id: str = Query("flat_8")):
    out = []
    for p in polls_store:
        chosen = p["user_votes"].get(user_id)
        out.append({**p, "chosen_option_id": chosen})
    return out

@app.post("/api/polls/{poll_id}/vote")
def vote_poll(poll_id: int, body: PollVoteBody):
    for p in polls_store:
        if p["id"] == poll_id:
            if p.get("is_closed", False):
                raise HTTPException(status_code=400, detail="Голосование уже завершено")
            prev = p["user_votes"].get(body.user_id)
            if prev is not None:
                raise HTTPException(status_code=400, detail="Сначала отмените текущий голос, чтобы выбрать другой вариант")
            for opt in p["options"]:
                if opt["id"] == body.option_id:
                    opt["votes"] += 1
            p["user_votes"][body.user_id] = body.option_id
            return {"success": True}
    raise HTTPException(status_code=404, detail="Опрос не найден")

@app.delete("/api/polls/{poll_id}/vote")
def unvote_poll(poll_id: int, user_id: str = Query("flat_8")):
    for p in polls_store:
        if p["id"] == poll_id:
            if p.get("is_closed", False):
                raise HTTPException(status_code=400, detail="Голосование завершено, изменение невозможно")
            prev = p["user_votes"].get(user_id)
            if prev is None:
                return {"success": True}
            for opt in p["options"]:
                if opt["id"] == prev and opt["votes"] > 0:
                    opt["votes"] -= 1
            del p["user_votes"][user_id]
            return {"success": True}
    raise HTTPException(status_code=404, detail="Опрос не найден")

frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(frontend_dist):
    assets_path = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_path):
        app.mount("/assets", StaticFiles(directory=assets_path), name="assets")

    @app.get("/{full_path:path}")
    async def catch_all(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))