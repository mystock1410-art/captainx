FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Hugging Face Spaces and most PaaS pass PORT via env; default to 7860 (HF) / 8000 (local).
ENV PORT=7860

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

EXPOSE 7860

# Use shell form so ${PORT} is expanded by the host (HF Spaces, Fly, Render all set this).
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT}
