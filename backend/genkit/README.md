# Genkit Setup (Backend)

This folder keeps the Genkit flows and tools used during local development with the Dev UI.

## Environment

- Add your Google AI key to `backend/.env`:
  ```
  GEMINI_API_KEY=your_google_ai_key
  # or use GOOGLE_API_KEY
  ```
- The config automatically loads `.env` from the backend folder.

## Commands

- Build the Genkit TypeScript:
  ```bash
  npm run build:genkit
  ```
- Start the backend with the Dev UI on port `4000`:
  ```bash
  genkit start --port 4000 -- npm run dev
  ```
  This will start the Express API and bring up the Genkit Developer UI on http://localhost:4000.

## Included flow & tool

- `soapToCodes` flow (`genkit/flows/soapToCodes.ts`): turns an encounter transcript into a SOAP note. If `transcript` is omitted in the input, it falls back to mock data.
- `loadMedicalCodes` tool (`genkit/tools/loadMedicalCodes.ts`): loads `genkit/data/mockEncounter.json` so you can test the flow without Whisper.
