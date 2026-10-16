# Multi-platform Python 3.12 Slim Base
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies required for PyMySQL, Cryptography, and Pillow
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project files
COPY backend/serv/ /app/serv/

WORKDIR /app/serv

# Collect static files for Django Admin (WhiteNoise)
RUN python manage.py collectstatic --noinput

# Render sets PORT dynamically (defaults to 10000 or 8000)
EXPOSE 8000 10000

# Run migrations and auto-seed on first boot, then boot Gunicorn
CMD sh -c "python manage.py migrate && python manage.py seed_cloud_db && gunicorn serv.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 120"
