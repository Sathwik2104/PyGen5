# Multi-platform Python 3.12 Slim Base
FROM python:3.12-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install Python dependencies directly
# (All dependencies in requirements.txt have prebuilt binary wheels on PyPI or are pure Python)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Django project files
COPY backend/serv/ /app/serv/

WORKDIR /app/serv

# Collect static files for WhiteNoise using in-memory dummy DB to avoid build-time DB dependencies
RUN DATABASE_URL=sqlite:///:memory: python manage.py collectstatic --noinput

# Render sets PORT dynamically (defaults to 10000 or 8000)
EXPOSE 8000 10000

# Run migrations and boot Gunicorn (NO local seed data is loaded into production)
CMD sh -c "python manage.py migrate && gunicorn serv.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --threads 2 --timeout 120"
