# ClearSpend

Interactive expense-review demo built with React, TypeScript, Vite, and Tailwind CSS. All data is mock data in `artifacts/clearspend/src/data/mock-expenses.ts`; there is no backend.

## Requirements

- Node.js 24
- pnpm 10 (pinned via `packageManager`; run `corepack enable` to use it)

## Development

```bash
pnpm install
pnpm --filter @workspace/clearspend run dev        # http://localhost:5173
pnpm --filter @workspace/clearspend run typecheck
pnpm --filter @workspace/clearspend run build      # outputs artifacts/clearspend/dist/public
```

The dev server listens on localhost only. To test from another device on your network, run `pnpm --filter @workspace/clearspend run dev -- --host`.

## Deployment (Vercel)

| Setting | Value |
|---|---|
| Root Directory | `artifacts/clearspend` |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build` |
| Output Directory | `dist/public` |

`artifacts/clearspend/vercel.json` rewrites unknown paths to `index.html` so client-side routes work on direct load.

## Repository layout

This is a pnpm workspace. The deployed app is `artifacts/clearspend`. The other packages (`artifacts/api-server`, `artifacts/mockup-sandbox`, `lib/*`, `scripts`) came from the original project template and are not used by the frontend.
