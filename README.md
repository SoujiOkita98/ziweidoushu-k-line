# life-kline — Zi Wei Dou Shu × “Life K-Line”

Personal project, just for fun.

## Status

MVP 1.5 — Landing page is still a prototype and everything is a work in progress.

This is a small Next.js app that:
- Generates a Zi Wei Dou Shu (紫微斗数) chart (via `iztro`)
- Renders a 4×4 palace board UI
- Generates a playful “life K-line” curve (0–100) and visualizes it with ECharts
- Optionally calls an AI “master” for analysis + chat (OpenAI Responses API)

## Demo

- Local: `http://localhost:3000`

## Getting Started

```bash
cd life-kline
npm install
npm run dev
```

## Environment Variables

Create `life-kline/.env.local`:

```bash
OPENAI_API_KEY=your_key_here
```

Notes:
- If you don’t set `OPENAI_API_KEY`, `/api/analysis` and `/api/chat` won’t work.
- Current AI config lives in `src/lib/aiConfig.ts` (per-feature `model` + `reasoningEffort`), and is used by `src/lib/ai.ts`.
- AI persona (tone/style) lives in `src/lib/aiPersona.ts` and applies to both analysis + chat.
- If your chosen `model` isn’t available, the server falls back to `OPENAI_FALLBACK_MODEL` (default: `gpt-5-nano`).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Project Structure

- `src/app/page.tsx`: main UI (form, tabs, results)
- `src/app/api/chart/route.ts`: generates chart + K-line (MVP scoring included)
- `src/app/api/analysis/route.ts`: AI analysis endpoint
- `src/app/api/chat/route.ts`: AI chat endpoint (“master”)
- `src/components/ChartBoard.tsx`: 4×4 Zi Wei palace board
- `src/components/LifeKline.tsx`: ECharts-based “life K-line” chart
- `src/components/MasterChat.tsx`: chat UI
- `src/lib/ziwei.ts`: wraps `iztro` and normalizes palace data
- `src/lib/kline.ts`: K-line generation logic (stars/transforms → score curve)
- `src/lib/ai.ts`: OpenAI Responses API client + helpers

## Disclaimer

This project is for entertainment only (just for fun).  
It’s not financial/medical/legal advice, and it’s not meant to be “accurate” astrology.

## License

MIT — see `LICENSE`.
