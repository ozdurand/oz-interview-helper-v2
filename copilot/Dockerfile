# Copilot API — phase 0 (knowledge base + hybrid search)
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 DATA_DIR=/data
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY copilot ./copilot
COPY data ./data
# fixed uid/gid 1000: the Azure Files volume is mounted with uid=1000,gid=1000 (deploy/azure/main.bicep)
RUN groupadd --gid 1000 app && useradd --create-home --uid 1000 --gid 1000 app && mkdir -p /data && chown app:app /data
USER app
EXPOSE 8000
CMD ["uvicorn", "copilot.api:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--timeout-graceful-shutdown", "10"]
