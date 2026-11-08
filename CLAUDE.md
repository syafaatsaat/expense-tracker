# Expense Tracker

Client-only, single-user expense tracker. Portfolio project: code quality and clear decisions matter more than feature count. Full spec: https://claude.ai/artifact/HwkvyLNo7yWcfKctAkV7hV

## Stack
React + TypeScript (strict) + Vite, Tailwind, Vitest + Testing Library, Playwright (later). Deployed on Vercel. No backend.

## Commands
- `npm run dev` / `npm run build` / `npm run test` / `npm run lint` / `npm run typecheck`

## Non-negotiable rules
- Money is integer cents (`amountCents`). Never use floats for amounts. Parse input strings straight to cents.
- Display currency is SGD, locale en-SG, via one shared `Intl.NumberFormat` in `src/lib/money.ts`.
- Expense dates are local `YYYY-MM-DD` strings. Never `toISOString()` or `new Date("YYYY-MM-DD")` for expense dates. Month key = first 7 chars.
- "Today" is passed into logic as a parameter, never read inside pure functions.
- All persistence goes through the repository interface. Components never touch localStorage.
- Storage root is versioned: `{ version, expenses, recurring, budgets, settings }`. Any shape change ships with a migration and a test.
- Domain logic (totals, filters, recurrence, budgets) lives in pure functions with unit tests in the same PR.
- Never use colour alone to show a category or a state. Always pair it with a label or icon.
- No new runtime dependencies without asking. No chart library.

## Domain
- Categories (fixed, in code): Housing & property, Utilities, Food & dining, Transportation, Healthcare & medical, Savings & investments, Personal care & lifestyle, Insurance & protection, Debts & loans, Entertainment & leisure, Other.
- Savings & investments is excluded from spending totals, breakdown % and the chart, and shown as a separate "Saved" figure. It has no budget.
- Budgets: one monthly limit per category, applied to every month (past ones too).
- Recurring: monthly only. Generated lazily on load up to today. Day 29-31 clamps to month end. Idempotent (dedupe on recurringId + date). Template edits affect future occurrences only.
- Delete is instant, with an undo toast of about 5 s. No confirm dialogs, except for reset and import.

## Workflow
- One phase per branch and PR. Plan before coding. Keep CI green. Never skip or delete tests to pass.
- Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Accessibility: labelled inputs, keyboard-operable everything, visible focus, contrast AA in both themes.