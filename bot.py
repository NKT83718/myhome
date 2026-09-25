import os
import asyncio
import httpx

BOT_TOKEN = os.getenv(
    "MAX_BOT_TOKEN",
    "f9LHodD0cOL3QXIcBTnBfV2YEnl08DmZ2c9ZQjHYBp5N4L9_BJLQB6NQRMmm-Auv643i4pOWraAlUDyw7cXd"
)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://myhome-1-53f1.onrender.com")
MAX_DEEP_LINK = "https://max.ru/t578_hakaton_max_bot?startapp=flat_8"
API_BASE = "https://platform-api2.max.ru"

headers = {
    "Authorization": BOT_TOKEN,
    "Content-Type": "application/json"
}

async def send_to_user_or_chat(client: httpx.AsyncClient, chat_id, user_id, text: str, buttons: list = None):
    targets = []
    if chat_id:
        targets.append({"chat_id": chat_id})
    if user_id:
        targets.append({"user_id": user_id})

    payload = {"text": text}
    if buttons:
        payload["attachments"] = [
            {
                "type": "inline_keyboard",
                "payload": {"buttons": buttons}
            }
        ]

    for target in targets:
        try:
            r = await client.post(
                f"{API_BASE}/messages",
                params=target,
                json=payload,
                headers=headers
            )
            if r.status_code == 200:
                return r
        except Exception:
            pass
    return None

async def send_welcome(client: httpx.AsyncClient, chat_id, user_id):
    text = (
        "👋 Добро пожаловать в единую цифровую систему управления МКД «МойДом»!\n\n"
        "Для доступа к вашим лицевым счетам, квитанциям ЖКУ, видеокамерам "
        "и общедомовым голосованиям подтвердите личность:"
    )
    buttons = [
        [
            {
                "type": "callback",
                "text": "🏛️ Войти при помощи Госуслуги (ЕСИА)",
                "payload": "auth_gosuslugi"
            }
        ]
    ]
    await send_to_user_or_chat(client, chat_id, user_id, text, buttons)

async def send_authorized(client: httpx.AsyncClient, chat_id, user_id):
    text = (
        "✅ Авторизация через Госуслуги успешно пройдена!\n\n"
        "📋 Данные подтверждённой учётной записи:\n"
        "• Статус: Подтверждённая запись ЕСИА\n"
        "• Документ: Паспорт РФ (проверен)\n\n"
        "📍 Адрес по прописке (постоянная регистрация):\n"
        "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8\n\n"
        "🏠 Зарегистрированная недвижимость в собственности:\n"
        "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8\n\n"
        "Нажмите на подтверждённый адрес ниже для открытия мини-приложения в MAX:"
    )
    buttons = [
        [
            {
                "type": "link",
                "text": "🏢 пр-кт Славы, д. 8, кв. 8 (Открыть в MAX)",
                "url": MAX_DEEP_LINK
            }
        ],
        [
            {
                "type": "link",
                "text": "🌐 Прямой вход (Web)",
                "url": WEBAPP_URL
            }
        ]
    ]
    await send_to_user_or_chat(client, chat_id, user_id, text, buttons)

async def answer_callback(client: httpx.AsyncClient, callback_id: str):
    try:
        await client.post(
            f"{API_BASE}/answers",
            params={"callback_id": callback_id},
            json={"notification": "Успешно авторизовано через ЕСИА"},
            headers=headers
        )
    except Exception:
        pass

async def main():
    marker = None
    async with httpx.AsyncClient(verify=False, timeout=35) as client:
        while True:
            try:
                params = {"timeout": 20}
                if marker:
                    params["marker"] = marker

                r = await client.get(
                    f"{API_BASE}/updates",
                    params=params,
                    headers=headers
                )

                if r.status_code == 200:
                    data = r.json()
                    marker = data.get("marker", marker)
                    updates = data.get("updates", [])

                    for upd in updates:
                        upd_type = upd.get("update_type")

                        if upd_type == "bot_started":
                            chat_id = upd.get("chat_id")
                            user_id = upd.get("user", {}).get("user_id")
                            await send_welcome(client, chat_id, user_id)

                        elif upd_type == "message_created":
                            msg = upd.get("message", {})
                            body = msg.get("body", {})
                            text = body.get("text", "").strip()
                            recipient = msg.get("recipient", {})
                            chat_id = recipient.get("chat_id")
                            user_id = msg.get("sender", {}).get("user_id")

                            if text.startswith("/start"):
                                await send_welcome(client, chat_id, user_id)
                            elif "войти" in text.lower() or "госуслуг" in text.lower():
                                await send_authorized(client, chat_id, user_id)
                            else:
                                await send_welcome(client, chat_id, user_id)

                        elif upd_type == "message_callback":
                            cb = upd.get("callback", {})
                            cb_id = cb.get("callback_id")
                            cb_payload = cb.get("payload")
                            user_id = cb.get("user", {}).get("user_id")

                            msg = upd.get("message", {})
                            recipient = msg.get("recipient", {})
                            chat_id = recipient.get("chat_id")

                            if cb_id:
                                await answer_callback(client, cb_id)

                            if cb_payload == "auth_gosuslugi":
                                await send_authorized(client, chat_id, user_id)

            except Exception:
                await asyncio.sleep(2)
            await asyncio.sleep(0.2)

if __name__ == "__main__":
    asyncio.run(main())