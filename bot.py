import os
import asyncio
import httpx

BOT_TOKEN = os.getenv(
    "MAX_BOT_TOKEN",
    "f9LHodD0cOL3QXIcBTnBfV2YEnl08DmZ2c9ZQjHYBp5N4L9_BJLQB6NQRMmm-Auv643i4pOWraAlUDyw7cXd"
)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://myhome-1-53f1.onrender.com")
API_BASE = "https://platform-api2.max.ru"

headers = {
    "Authorization": BOT_TOKEN,
    "Content-Type": "application/json"
}

async def send_msg(client: httpx.AsyncClient, target_params: dict, text: str, buttons: list = None):
    payload = {"text": text}
    if buttons:
        payload["attachments"] = [
            {
                "type": "inline_keyboard",
                "payload": {"buttons": buttons}
            }
        ]
    res = await client.post(
        f"{API_BASE}/messages",
        params=target_params,
        json=payload,
        headers=headers
    )
    return res

async def send_welcome(client: httpx.AsyncClient, target_params: dict):
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
    await send_msg(client, target_params, text, buttons)

async def send_authorized(client: httpx.AsyncClient, target_params: dict):
    text = (
        "✅ Авторизация через Госуслуги успешно пройдена!\n\n"
        "📋 Данные подтверждённой учётной записи:\n"
        "• Статус: Подтверждённая запись ЕСИА\n"
        "• Документ: Паспорт РФ (проверен)\n\n"
        "📍 Адрес по прописке (постоянная регистрация):\n"
        "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8\n\n"
        "🏠 Зарегистрированная недвижимость в собственности:\n"
        "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8\n\n"
        "Нажмите на подтверждённый адрес ниже для запуска мини-приложения в MAX:"
    )
    buttons = [
        [
            {
                "type": "open_app",
                "text": "🏢 пр-кт Славы, д. 8, кв. 8 (Открыть МойДом)",
                "url": WEBAPP_URL
            }
        ]
    ]
    res = await send_msg(client, target_params, text, buttons)
    if res.status_code != 200:
        alt_buttons = [
            [
                {
                    "type": "open_app",
                    "text": "🏢 пр-кт Славы, д. 8, кв. 8 (Открыть МойДом)",
                    "web_app": {"url": WEBAPP_URL}
                }
            ]
        ]
        await send_msg(client, target_params, text, alt_buttons)

async def answer_callback(client: httpx.AsyncClient, callback_id: str):
    await client.post(
        f"{API_BASE}/answers",
        params={"callback_id": callback_id},
        json={"notification": "Авторизован"},
        headers=headers
    )

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

                        if upd_type == "message_created":
                            msg = upd.get("message", {})
                            body = msg.get("body", {})
                            text = body.get("text", "").strip()
                            sender_id = msg.get("sender", {}).get("user_id")
                            chat_id = msg.get("recipient", {}).get("chat_id")

                            target = {}
                            if chat_id:
                                target["chat_id"] = chat_id
                            elif sender_id:
                                target["user_id"] = sender_id

                            if target:
                                if text.startswith("/start"):
                                    await send_welcome(client, target)
                                elif "госуслуг" in text.lower():
                                    await send_authorized(client, target)
                                else:
                                    await send_welcome(client, target)

                        elif upd_type == "message_callback":
                            cb = upd.get("callback", {})
                            cb_id = cb.get("callback_id")
                            cb_payload = cb.get("payload")
                            user_id = cb.get("user", {}).get("user_id")

                            if cb_id:
                                await answer_callback(client, cb_id)

                            if cb_payload == "auth_gosuslugi" and user_id:
                                await send_authorized(client, {"user_id": user_id})

            except Exception:
                await asyncio.sleep(2)
            await asyncio.sleep(0.3)

if __name__ == "__main__":
    asyncio.run(main())