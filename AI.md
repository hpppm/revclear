# AI Runtime Setup (Ollama)

This project uses a local AI runtime through Ollama by default.

## 1. Install Ollama

Install from the official site:

- https://ollama.com/download

After install, verify:

```bash
ollama --version
```

## 2. Start Ollama on localhost

Ollama should run on `http://localhost:11434`.

On many systems, Ollama auto-starts as a background service after install.  
If needed, start it manually:

```bash
ollama serve
```

Check it is reachable:

```bash
curl http://localhost:11434/api/tags
```

## 3. Download the model used by backend

Example model currently used in development:

```bash
ollama pull qwen2.5:3b
```

Optional quick test:

```bash
ollama run qwen2.5:3b "Say hello in one sentence."
```

## 4. Configure backend env

In `backend/.env`, set:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
# Optional override for codes matching:
# OLLAMA_CODES_MODEL=qwen2.5:3b
```

Optional (future hosted providers):

```env
# SOAP_API_URL=https://your-api/soap
# CODES_API_URL=https://your-api/codes/match
```

## 5. Start backend

```bash
cd backend
npm run dev
```

Expected startup lines include:

- `AI provider health: overall=healthy ...`
- `[AI Health] SOAP mode=ollama healthy=true ...`
- `[AI Health] CODES mode=ollama healthy=true ...`

## 6. Verify from API

Health endpoint:

```bash
curl http://localhost:3005/api/health/ai
```

You should see:

- `status: "healthy"` when Ollama is reachable and configured models are installed.
