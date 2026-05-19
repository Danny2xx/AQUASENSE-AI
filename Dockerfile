FROM python:3.11-slim

# Install Node.js 20 and curl
RUN apt-get update && apt-get install -y curl && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Node.js backend dependencies
COPY services/backend/package.json services/backend/package-lock.json services/backend/
RUN cd services/backend && npm ci --omit=dev

# Application code
COPY services/ml/ services/ml/
COPY services/backend/src/ services/backend/src/
COPY data/processed/ data/processed/
COPY packages/ packages/

# Startup script
COPY docker-start.sh .
RUN chmod +x docker-start.sh

ENV PORT=7860
ENV ML_SERVICE_URL=http://localhost:8001

EXPOSE 7860

CMD ["./docker-start.sh"]
