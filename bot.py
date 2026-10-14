import os
import asyncio
import httpx

BOT_TOKEN = os.getenv(
    "MAX_BOT_TOKEN"
)
WEBAPP_URL = os.getenv("WEBAPP_URL", "https://myhome-1-53f1.onrender.com")
AUTH_API_URL = os.getenv("AUTH_API_URL", "https://myhome-api-9hhr.onrender.com")
API_BASE = "https://platform-api2.max.ru"

headers = {
    "Authorization": BOT_TOKEN,
    "Content-Type": "application/json"
}

authorized_users = set()
BOT_USERNAME = "t578_hakaton_max_bot"

async def health_handler(reader, writer):
    try:
        await asyncio.wait_for(reader.read(4096), timeout=2)
    except Exception:
        pass
    body = b"ok"
    try:
        writer.write(
            b"HTTP/1.1 200 OK\r\n"
            b"Content-Type: text/plain; charset=utf-8\r\n"
            b"Content-Length: 2\r\n"
            b"Connection: close\r\n"
            b"\r\n" + body
        )
        await writer.drain()
    except Exception:
        pass
    try:
        writer.close()
        await writer.wait_closed()
    except Exception:
        pass

async def start_health_server():
    port = int(os.getenv("PORT", "10000"))
    server = await asyncio.start_server(health_handler, "0.0.0.0", port)
    async with server:
        await server.serve_forever()

async def init_bot_info(client: httpx.AsyncClient):
    global BOT_USERNAME
    try:
        r = await client.get(f"{API_BASE}/me", headers=headers)
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, dict) and data.get("username"):
                BOT_USERNAME = data["username"]
    except Exception:
        pass

async def sync_auth_state(user_id, is_active: bool):
    if not user_id:
        return
    url = AUTH_API_URL.rstrip("/") + "/api/auth"
    payload = {"uid": str(user_id), "active": bool(is_active)}
    try:
        async with httpx.AsyncClient(timeout=10.0) as cl:
            r = await cl.post(url, json=payload)
            if r.status_code >= 400:
                await cl.post(url, params={"uid": str(user_id)}, json=payload)
    except Exception:
        pass

def get_chat_id_from_update(upd: dict):
    if upd.get("chat_id"):
        return upd.get("chat_id")
    msg = upd.get("message") or {}
    recipient = msg.get("recipient") or {}
    if recipient.get("chat_id"):
        return recipient.get("chat_id")
    cb = upd.get("callback") or {}
    chat = cb.get("chat") or {}
    if chat.get("id"):
        return chat.get("id")
    return None

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

async def answer_callback(client: httpx.AsyncClient, callback_id: str, notification: str):
    try:
        await client.post(
            f"{API_BASE}/answers",
            params={"callback_id": callback_id},
            json={"notification": notification},
            headers=headers
        )
    except Exception:
        pass

async def send_welcome(client: httpx.AsyncClient, chat_id, user_id):
    if user_id:
        authorized_users.discard(user_id)
        await sync_auth_state(user_id, False)

    text = (
        "Добро пожаловать в единую цифровую систему управления МКД «МойДом»!\n\n"
        "Для доступа к вашим лицевым счетам, квитанциям ЖКУ, видеокамерам "
        "и общедомовым голосованиям подтвердите личность:"
    )
    buttons = [
        [
            {
                "type": "callback",
                "text": "Войти при помощи Госуслуги (ЕСИА)",
                "payload": "auth_gosuslugi"
            }
        ]
    ]
    await send_to_user_or_chat(client, chat_id, user_id, text, buttons)

async def send_authorized(client: httpx.AsyncClient, chat_id, user_id):
    if user_id:
        authorized_users.add(user_id)
        await sync_auth_state(user_id, True)

    text = (
        "Авторизация через Госуслуги успешно пройдена!\n\n"
        "Данные подтверждённой учётной записи:\n"
        "• Статус: Подтверждённая запись ЕСИА\n"
        "• Документ: Паспорт РФ (проверен)\n\n"
        "Адрес регистрации и собственности:\n"
        "Белгородская обл., г. Белгород, пр-кт Славы, д. 8, кв. 8\n\n"
        "Выберите действие ниже:"
    )

    app_url = WEBAPP_URL.rstrip("/")
    if user_id:
        app_url = f"{app_url}?uid={user_id}"

    native_open_url = f"https://max.ru/{BOT_USERNAME}?startapp=unlocked"

    button_variants = [
        [
            [
                {
                    "type": "open_app",
                    "text": "Войти в «МойДом» (пр-кт Славы, 8)",
                    "web_app": {"url": app_url}
                }
            ],
            [
                {
                    "type": "callback",
                    "text": "Выйти из аккаунта",
                    "payload": "logout"
                }
            ]
        ],
        [
            [
                {
                    "type": "open_app",
                    "text": "Войти в «МойДом» (пр-кт Славы, 8)",
                    "url": app_url
                }
            ],
            [
                {
                    "type": "callback",
                    "text": "Выйти из аккаунта",
                    "payload": "logout"
                }
            ]
        ],
        [
            [
                {
                    "type": "web_app",
                    "text": "Войти в «МойДом» (пр-кт Славы, 8)",
                    "web_app": {"url": app_url}
                }
            ],
            [
                {
                    "type": "callback",
                    "text": "Выйти из аккаунта",
                    "payload": "logout"
                }
            ]
        ],
        [
            [
                {
                    "type": "link",
                    "text": "Войти в «МойДом» (пр-кт Славы, 8)",
                    "url": native_open_url
                }
            ],
            [
                {
                    "type": "callback",
                    "text": "Выйти из аккаунта",
                    "payload": "logout"
                }
            ]
        ]
    ]

    for btns in button_variants:
        res = await send_to_user_or_chat(client, chat_id, user_id, text, btns)
        if res is not None and res.status_code == 200:
            break

async def send_deauthorized(client: httpx.AsyncClient, chat_id, user_id):
    if user_id:
        authorized_users.discard(user_id)
        await sync_auth_state(user_id, False)

    text = (
        "Вы успешно вышли из учётной записи «МойДом».\n\n"
        "Сессия завершена. Для повторного доступа подтвердите личность:"
    )
    buttons = [
        [
            {
                "type": "callback",
                "text": "Войти при помощи Госуслуги (ЕСИА)",
                "payload": "auth_gosuslugi"
            }
        ]
    ]
    await send_to_user_or_chat(client, chat_id, user_id, text, buttons)

async def bot_loop():
    marker = None
    async with httpx.AsyncClient(verify=False, timeout=35) as client:
        await init_bot_info(client)

        while True:
            try:
                params = {"timeout": 20}
                if marker:
                    params["marker"] = marker

                r = await client.get(f"{API_BASE}/updates", params=params, headers=headers)

                if r.status_code == 200:
                    data = r.json()
                    marker = data.get("marker", marker)
                    updates = data.get("updates", [])

                    for upd in updates:
                        upd_type = upd.get("update_type")

                        if upd_type == "bot_started":
                            chat_id = get_chat_id_from_update(upd)
                            user_id = upd.get("user", {}).get("user_id")
                            await send_welcome(client, chat_id, user_id)

                        elif upd_type == "message_created":
                            msg = upd.get("message", {})
                            body = msg.get("body", {})
                            text = body.get("text", "").strip().lower()
                            recipient = msg.get("recipient", {})
                            chat_id = recipient.get("chat_id") or get_chat_id_from_update(upd)
                            user_id = msg.get("sender", {}).get("user_id")

                            if text.startswith("/start"):
                                if user_id in authorized_users:
                                    await send_authorized(client, chat_id, user_id)
                                else:
                                    await send_welcome(client, chat_id, user_id)

                        elif upd_type == "message_callback":
                            cb = upd.get("callback", {})
                            cb_id = cb.get("callback_id")
                            cb_payload = cb.get("payload")
                            user_id = cb.get("user", {}).get("user_id")
                            chat_id = get_chat_id_from_update(upd)

                            if cb_payload == "auth_gosuslugi":
                                if cb_id:
                                    await answer_callback(client, cb_id, "Вход выполнен успешно!")
                                await send_authorized(client, chat_id, user_id)

                            elif cb_payload == "logout":
                                if cb_id:
                                    await answer_callback(client, cb_id, "Вы вышли из системы")
                                await send_deauthorized(client, chat_id, user_id)

            except Exception:
                await asyncio.sleep(2)
            await asyncio.sleep(0.2)

async def main():
    await asyncio.gather(
        start_health_server(),
        bot_loop()
    )

if __name__ == "__main__":
    asyncio.run(main())