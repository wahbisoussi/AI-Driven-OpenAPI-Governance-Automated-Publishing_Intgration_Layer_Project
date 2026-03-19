# 1. Start with an official Python image
FROM python:3.11-slim

# 2. Set the working directory
WORKDIR /app

# 3. Install system dependencies & Node.js 18
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Spectral Linter globally
RUN npm install -g @stoplight/spectral-cli

# 5. Copy requirements file
COPY requirements.txt .

# 6. STEP ONE: Install Small/Fast Core Libraries
# This fixes the "multipart" error instantly and is very fast.
RUN pip install --default-timeout=1000 \
    fastapi uvicorn sqlalchemy psycopg2-binary \
    pydantic python-multipart python-dotenv requests pyyaml

# 7. STEP TWO: Install Heavy AI Libraries (The 1.5GB stuff)
# We give this a massive 30-minute timeout (2000s) to handle hiccups.
RUN pip install --default-timeout=2000 \
    sentence-transformers>=2.6.0 pgvector==0.2.4

# 8. STEP THREE: Final verification
# Ensures everything in requirements.txt is satisfied.
RUN pip install -r requirements.txt

# 9. Copy the rest of the application
COPY . .

# 10. Expose and Start
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]