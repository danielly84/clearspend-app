# ClearSpend

ClearSpend is a front-end prototype of a manager's expense review dashboard. It shows how AI-assisted review could fit into an approval workflow: each submitted expense carries a risk level, a confidence rating, a recommendation (approve, review, or reject), and a short explanation, and the manager acts on it from a single screen.

The demo covers:

- Summary cards for pending, ready-to-approve, needs-review, and high-risk expenses
- An alert banner summarizing flagged items (policy violations, possible duplicates, missing receipts)
- Risk filter tabs and sorting by risk, amount, or date
- Row selection with bulk approve and reject
- An expense detail drawer with receipt status, employee note, and the recommendation's reasoning, plus approve, reject, and undo actions
- Toast confirmations for approvals and rejections

The drawer's "Request Clarification" and "Request receipt from employee" buttons are visual placeholders and don't perform an action yet.

## Mock data and state

There is no backend. The ten expenses, including their risk levels, confidence ratings, recommendations, and reasoning, are static mock data in [`artifacts/clearspend/src/data/mock-expenses.ts`](artifacts/clearspend/src/data/mock-expenses.ts); no AI model or external API is called. Approvals, rejections, and selections live in React state in the browser and reset on reload.

## Tech stack

- React 19 and TypeScript
- Vite 7
- Tailwind CSS 4
- Radix UI primitives (toast, tooltip) with shadcn/ui-style components
- Framer Motion, Lucide icons, wouter (routing), date-fns
- pnpm workspace, deployed on Vercel

## Prerequisites

- Node.js 24 (see [`.nvmrc`](.nvmrc))
- pnpm 10.34.8, pinned via `packageManager` in `package.json`. With Corepack enabled (`corepack enable`), the pinned version is used automatically.

## Getting started

```bash
pnpm install
pnpm --filter @workspace/clearspend run dev
```

The dev server runs at http://localhost:5173 and listens on localhost only. To open it from another device on your network, run `pnpm --filter @workspace/clearspend run dev -- --host`.

## Checks

```bash
pnpm run typecheck                    # TypeScript, no emit
pnpm run build                        # typecheck, then production build
pnpm audit --audit-level moderate     # dependency advisories
```

The production build is written to `artifacts/clearspend/dist/public`. To serve it locally, run `pnpm --filter @workspace/clearspend run serve`.

GitHub Actions runs the same install, typecheck, build, and audit steps on pushes and pull requests to `vercel-baseline` (see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)).

## Repository structure

```text
.
├── artifacts/clearspend/      # The ClearSpend app (deployed to Vercel)
│   ├── src/
│   │   ├── pages/             # Dashboard and 404 page
│   │   ├── components/        # Expense drawer, badges, and UI primitives
│   │   ├── data/              # Mock expense data
│   │   ├── hooks/             # Toast state
│   │   └── lib/               # Utilities
│   ├── public/                # Static assets
│   ├── vercel.json            # SPA rewrite for client-side routes
│   └── vite.config.ts
├── .github/workflows/ci.yml   # CI: install, typecheck, build, audit
├── package.json               # Root scripts and pnpm version pin
├── pnpm-workspace.yaml        # Workspace packages, dependency catalog, pnpm settings
├── pnpm-lock.yaml
└── tsconfig.base.json         # Shared TypeScript options
```

The repository is a pnpm workspace with a single package. The workspace root holds the lockfile, shared TypeScript options, and the pinned pnpm version that the Vercel install relies on.

## Deployment (Vercel)

| Setting | Value |
|---|---|
| Framework Preset | Vite |
| Root Directory | `artifacts/clearspend` |
| Include files outside the root directory | Enabled |
| Install Command | `pnpm install --frozen-lockfile` |
| Build Command | `pnpm run build` |
| Output Directory | `dist/public` |
| Node.js Version | 24.x |
| Environment variable | `ENABLE_EXPERIMENTAL_COREPACK=1` (uses the pinned pnpm version) |

No application environment variables are required. [`artifacts/clearspend/vercel.json`](artifacts/clearspend/vercel.json) rewrites unknown paths to `index.html` so client-side routes, including the 404 page, work on direct load.
