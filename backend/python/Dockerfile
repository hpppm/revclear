FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all python source files into the container
COPY . .

EXPOSE 8000

CMD ["python", "whisper_server.py"]
