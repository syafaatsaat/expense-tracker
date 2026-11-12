# Till design hand-off

Nov 12, 2026 · @Kai

Build tier 1 to the pixel Till screens A to J on the [design canvas](https://claude.ai/artifact/Rexn3QY9W6z7EbUUFssZym); this doc is the spec those screens leave implicit.

## Tokens

Thirteen colours, two fonts and a 3px pixel unit cover every screen. Red appears only on totals, VOID, errors, today in the calendar and the selected-key outline.

| Token | Hex | Used for |
| --- | --- | --- |
| desk | #4A4639 | App background |
| desk-dither | #423F33 | 4px checkerboard over desk |
| ink | #24221D | Text on paper, dark panels, dark keycap faces |
| ink-deep | #141310 | Printer slot, dark keycap sides, panel borders |
| ink-edge | #0A0907 | Keycap outlines on dark keys |
| key | #36332B | Number keys, unselected date keys |
| paper | #E6DEC6 | Receipts, paper keycap faces |
| paper-side | #B9B096 | Paper keycap sides |
| muted | #5E5847 | Day headers, codes, secondary text on paper |
| olive | #A9AE93 | Labels on dark panels |
| light | #EDE6CF | Text on dark panels |
| red | #A8402E | Totals, VOID, errors, selected outline |
| red-on-dark | #E0735E | Error text on the dark new-line card |

**Type.** Silkscreen for labels and keys, VT323 for receipt lines, amounts and body text.

- Silkscreen only at multiples of 8px, or the pixels blur. Small labels use 8 to 12px.
- Display text (TILL, button labels, TOTAL SPENT) uses the tall technique in Components.
- VT323: 19 to 24px for lines and body, 44 to 52px for big totals.

**Pixel units.** Borders 3px (2px on small stamps). Keycap side 6px, 2px when pressed. Hard shadow 6px right and 6px down at 30% black, no blur. Receipt teeth 12px wide, 6px deep in 2px steps.

## Components

Six components carry the whole look. Build them first, then screens are mostly layout.

**Keycap** (every real button). A face with a 3px outline and a 6px darker side below.

| State | Face | Side | Movement |
| --- | --- | --- | --- |
| Up | Paper or ink | 6px | None |
| Pressed (while held) | Same | 2px | Face drops 4px, springs back on release |
| Selected toggle | Ink face, light text, red outline | 2px | Stays down |
| Disabled | #8C866F, flat | None | None; `aria-disabled`, cursor not-allowed |

- Variants: paper (side paper-side), dark (side ink-deep), danger (red face, side #6E2418).
- Not keycaps: text links (Cancel, Back, Undo, Clear all), month arrows, receipt lines.
- Grids of keycaps need about 14px row gap so the sides don't touch the next row.

**Receipt.**

- Attached to the printer slot: flat top tucked 6px under the slot, zigzag bottom.
- Torn off (past months, loose summaries): zigzag on both edges, the top the exact inverse of the bottom teeth.
- Lines: department icon, description, square-dot leader, amount. Day header above each group in Silkscreen.
- VOID: red Silkscreen stamp with a 2px red border, line struck through and greyed.
- Footer: double rule, TOTAL SPENT in red, SAVED line, decorative barcode.

**Pixel icon.** A 9x9 bitmap drawn as one 1x1 rect per pixel in an SVG with `shape-rendering="crispEdges"` and `fill="currentColor"`, scaled 2x. One `PixelIcon` component plus a map of bitmaps; no image files.

**Tall text.** Silkscreen at 8 x sx px, then `transform: scaleY(sy / sx)`. Buttons use 2x3, the TILL logo 3x4. Width stays true for layout and every pixel stays whole.

**Dark card.** Ink panel with a 3px ink-deep border and hard shadow. Used for the total panel, the new-line card and the number pad.

**Sheet and dialog.** Paper panel over a 72 to 78% ink scrim. Calendar slides up from the bottom; confirmations sit centred. Primary action on the right.

## Motion

Every animation moves in whole steps, never smooth easing, so it reads as pixel art. All of them switch off under `prefers-reduced-motion: reduce`.

| Animation | Trigger | Duration | Steps | Detail |
| --- | --- | --- | --- | --- |
| Paper feed | A line is printed or saved | 560 ms | 7 | Whole receipt drops 28px into place |
| Line print-in | Same, on the new line | 560 ms, 120 ms delay | 4 | Clip reveals the line top to bottom; line keeps a paper-shade highlight until the next action |
| VOID stamp | A line is voided | 260 ms | 3 | Scale 2.4 to 0.85 to 1, fades in |
| Keycap press | Pointer down / up | 80 ms | 2 | Face 4px down, side 6px to 2px |
| Caret blink | Amount being typed | 1 s loop | 1 | Underscore after the amount |

Not yet built in the prototype, worth adding in code: month switch slides the receipt sideways in 4 steps, and a torn receipt tears along its teeth when a month closes.

## Behaviour rules

These are the decisions the screens encode; unit-test each one.

**Money.**

- Amounts are integer cents. The keypad fills from the right like a till: 5, 8, 0 gives 5.80.
- Max 7 digits (S$99,999.99); further digits are ignored.
- Savings lines count toward SAVED, never toward SPENT, the chart or category shares.

**Dates.**

- TODAY / YESTERDAY / PICK DATE sits in the new-line card; it is not a department key.
- The calendar is Monday-first, today outlined red, future days locked.
- A line dated in another month prints to that month's receipt and shows "Printed to OCT 2026 receipt".

**Editing.**

- Tap a printed line to open it in EDIT LINE mode, prefilled. SAVE LINE reprints it in date order.
- VOID lives on the edit screen as a red keycap; Undo appears after. Tapping a voided line restores it.
- Cancel asks "Discard this line?" (new) or "Discard changes?" (edit) only when something changed.

**Filter and search.**

- Departments combine: tap several to show any of them. ALL clears them.
- Search matches description text within the current month and active departments.
- While filtered, the header shows the filtered total and "of" the month total; the receipt carries a red FILTER stamp and a subtotal.
- No matches: say what was searched and where, offer Clear search and All depts.

**Validation** (checked on PRINT, shown under the card, all at once).

| Field | Rule | Message |
| --- | --- | --- |
| Amount | Above 0.00 | Type an amount above 0.00. |
| Description | 40 characters max; empty uses the department name | Description is 43 characters. Keep it to 40. |
| Date | Not in the future | Prevented by the calendar lock, no message |

PRINT stays disabled and says how many errors remain ("Fix 2 errors to print").

## Screen map

All on the "Till pixel" rows of the canvas. The earlier rows are exploration only.

| Screen | Defines |
| --- | --- |
| A. Home | Total panel, printer slot, attached receipt, VOID line, Undo toast, ADD LINE |
| B. New line | Dark new-line card, date control, department keys, number pad, PRINT |
| C. Months | The one chart (hanging month receipts), category share table, torn summary receipt |
| D. Prototype | Working add, edit, void, undo, date picker, discard dialog, all motion |
| E. First launch | Empty receipt, Load sample month (demo data) |
| F. Desktop | Three columns: entry with Enter and F1 to F11, receipt, chart and shares |
| G. Filter and search | Open filter panel, combined departments, filtered receipt |
| H. No matches | Empty search result and recovery actions |
| I. Validation errors | Error list, invalid fields, disabled PRINT |
| J. Past month | Torn, closed receipt; Back to Nov; ADD TO OCT for back-filling |

## Build notes

The canvas files are reference, not source: rebuild in React, TypeScript and Tailwind.

- **Tailwind:** put the colour tokens in `theme.extend.colors`; add the keycap, dither and hard-shadow utilities in one `@layer components` block.
- **Components:** `Keycap`, `PixelIcon`, `TallText`, `Receipt` (attached or torn), `ReceiptLine`, `DarkCard`, `Sheet`, `Dialog`, `Keypad`, `DatePicker`. Screens compose these.
- **The one chart:** hand-written SVG of hanging receipts, crisp edges, values printed under each strip, as in screen C.
- **Fonts:** Silkscreen and VT323 from Google Fonts; set `font-display: swap` and size Silkscreen only in multiples of 8.
- **Accessibility:** real buttons and labels everywhere; focus ring is a 3px dashed red outline offset 4px; `aria-pressed` on toggles; `role="alert"` on the error list; check contrast of muted text on paper and olive on ink with a contrast tool before shipping.
- **Not designed yet (tier 2):** budgets and recurring lines. Design each at the start of its phase. Dark mode is dropped: the desk is already dark and dark receipts would break the paper metaphor.
- **Change the build plan:** make phase 1 build the components above against a static screen before any data work.
