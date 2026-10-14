FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends supervisor \
  && rm -rf /var/lib/apt/lists/*

# зависимости FastAPI+бота
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# код
COPY backend /app/backend
COPY bot.py /app/bot.py
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV UPLOADS_DIR=/tmp/uploads

CMD ["supervisord", "-n"]