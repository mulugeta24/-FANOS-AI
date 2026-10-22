FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --default-timeout=1000 --retries 10 -r requirements.txt

# App source
COPY . .

# Ensure the model directory exists
RUN mkdir -p /app/models /app/app/models

# Set AI_MODEL_PATH explicitly for the container (relative to /app)
ENV AI_MODEL_PATH="models/fanos_v3_xgboost_rare_improved.json"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
