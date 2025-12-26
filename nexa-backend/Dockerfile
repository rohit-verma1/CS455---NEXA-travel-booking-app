# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

# Install required system deps
RUN apt-get update && \
    apt-get install -y curl gcc libpq-dev libssl-dev && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install uv (Astral package manager)
RUN pip install uv

# Copy dependency files first (for better caching)
COPY pyproject.toml uv.lock ./

# Sync dependencies (production lock)
RUN uv sync --frozen

# Install additional runtime deps
RUN uv pip install whitenoise

# Copy the rest of the app
COPY . .

# Collect static files
RUN uv run python manage.py collectstatic --noinput

EXPOSE 8000

# Run Django with Uvicorn
CMD ["uv", "run", "uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000"]
