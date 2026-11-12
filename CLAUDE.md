# Expense Tracker

Client-only, single-user expense tracker. Portfolio project: code quality and clear decisions matter more than feature count. Full spec: https://claude.ai/artifact/HwkvyLNo7yWcfKctAkV7hV

The UI is "Till", a pixel-art receipt machine. `Till-design-hand-off.md` is the visual and behaviour spec and wins where it differs from the spec above (differences listed under Design).

## Stack
React + TypeScript (strict) + Vite, Tailwind, Vitest + Testing Library, Playwright (later). Deployed on Vercel. No backend.

## Commands
- `npm run dev` / `npm run build` / `npm run test` / `npm run lint` / `npm run typecheck`

## Non-negotiable rules
- Money is integer cents (`amountCents`). Never use floats for amounts. Parse input strings straight to cents.
- Display currency is SGD, locale en-SG, via one shared `Intl.NumberFormat` in `src/lib/money.ts`, shown as "S$" (`formatCents`) or bare on receipt lines (`formatAmount`).
- Expense dates are local `YYYY-MM-DD` strings. Never `toISOString()` or `new Date("YYYY-MM-DD")` for expense dates. Month key = first 7 chars.
- "Today" is passed into logic as a parameter, never read inside pure functions.
- All persistence goes through the repository interface. Components never touch localStorage.
- Storage root is versioned: `{ version, expenses, recurring, budgets, settings }`. Any shape change ships with a migration and a test.
- Domain logic (totals, filters, recurrence, budgets) lives in pure functions with unit tests in the same PR.
- Never use colour alone to show a category or a state. Always pair it with a label or icon.
- The clock is read once, in `src/main.tsx`; everything else receives `today`.
- No new runtime dependencies without asking. No chart library.

## Domain
- Categories (fixed, in code): Housing & property, Utilities, Food & dining, Transportation, Healthcare & medical, Savings & investments, Personal care & lifestyle, Insurance & protection, Debts & loans, Entertainment & leisure, Other.
- Savings & investments is excluded from spending totals, breakdown % and the chart, and shown as a separate "Saved" figure. It has no budget.
- Budgets: one monthly limit per category, applied to every month (past ones too).
- Recurring: monthly only. Generated lazily on load up to today. Day 29-31 clamps to month end. Idempotent (dedupe on recurringId + date). Template edits affect future occurrences only.
- Delete is instant, with an undo toast of about 5 s. No confirm dialogs, except for reset and import.

## Design (Till)
- Tokens live in `src/index.css` (`@theme`): the 13 hand-off colours only; Tailwind's default palette is off. Silkscreen sizes are multiples of 8px only (`text-pixel-8`, `text-pixel-16`); VT323 for lines and totals.
- One theme. Dark mode is dropped (the desk is already dark).
- Categories show as pixel icon + name. The per-category palette colours in `categories.ts` are not used and go when the department keys are built.
- Changes to apply in the phase that builds each feature:
  - First launch shows an empty receipt with "Load sample month"; no automatic seeding.
  - Max amount S$99,999.99 (7 digits; the keypad fills from the right). Description max 40 characters; empty uses the department name.
  - Delete is VOID on the edit screen, with Undo. Cancel asks "Discard this line?" / "Discard changes?" only when something changed.
- Touch targets at least 44px, even where the canvas draws 40px.
- Focus ring: 3px dashed, offset 4px; red on paper, red-on-dark on dark surfaces (plain red is under 3:1 there).

## Workflow
- One phase per branch and PR. Plan before coding. Keep CI green. Never skip or delete tests to pass.
- Conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Accessibility: labelled inputs, keyboard-operable everything, visible focus, contrast AA (text 4.5:1, non-text 3:1) on the Till palette.