import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CURRENCY_SYMBOL } from '../config.ts';
import { getCategory } from '../domain/categories.ts';
import {
  DESCRIPTION_MAX,
  digitsToCents,
  draftToInput,
  emptyDraft,
  isDraftDirty,
  pressKey,
  validateDraft,
  type Draft,
  type KeypadKey,
} from '../domain/draft.ts';
import type { Expense, LocalDate } from '../domain/types.ts';
import { addDays, formatDayHeader } from '../lib/dates.ts';
import { formatAmount, formatCents } from '../lib/money.ts';
import type { ExpenseInput, WriteError, WriteResult } from '../storage/repository.ts';
import { DarkCard } from '../ui/DarkCard.tsx';
import { Keycap } from '../ui/Keycap.tsx';
import { TallText } from '../ui/TallText.tsx';
import { DateControl } from './DateControl.tsx';
import { DatePicker } from './DatePicker.tsx';
import { DepartmentKeys } from './DepartmentKeys.tsx';
import { DiscardDialog } from './DiscardDialog.tsx';
import { ErrorList } from './ErrorList.tsx';
import { Keypad } from './Keypad.tsx';

interface NewLineProps {
  today: LocalDate;
  /** Today, or the last day of a past month when back-filling it. */
  initialDate: LocalDate;
  /**
   * `screen`: the phone's full-screen entry view, with TILL and CANCEL on top.
   * `column`: the desktop entry column, always there; it clears itself after each print.
   */
  layout: 'screen' | 'column';
  onPrint: (input: ExpenseInput) => Promise<WriteResult<Expense>>;
  /** Leaves the screen layout. Not used by the column. */
  onCancel?: () => void;
}

function saveErrorMessage(error: WriteError): string {
  switch (error) {
    case 'storage-full':
      return "Couldn't save the line: this browser's storage is full.";
    case 'storage-unavailable':
      return "Couldn't save the line: this browser isn't letting the app save.";
    default:
      return "Couldn't save the line. Try again.";
  }
}

/** The new-line card: description, amount, date, department keys, keypad and PRINT. */
export function NewLine({ today, initialDate, layout, onPrint, onCancel }: NewLineProps) {
  const initial = useMemo(() => emptyDraft(initialDate), [initialDate]);
  const [draft, setDraft] = useState<Draft>(initial);
  // Errors show only after the first PRINT, then follow every change.
  const [attempted, setAttempted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const descriptionRef = useRef<HTMLInputElement>(null);
  const ids = { title: useId(), description: useId(), amount: useId(), errors: useId() };

  const errors = useMemo(() => validateDraft(draft, today), [draft, today]);
  const showErrors = attempted && errors.length > 0;
  const messages = [
    ...(showErrors ? errors.map((e) => e.message) : []),
    ...(saveError ? [saveError] : []),
  ];
  const descriptionInvalid = showErrors && errors.some((e) => e.field === 'description');
  const amountInvalid = showErrors && errors.some((e) => e.field === 'amount');

  // The phone view opens on the card itself, not the text field, so the on-screen
  // keyboard stays closed and typed digits go straight to the amount.
  useEffect(() => {
    if (layout === 'screen') rootRef.current?.focus();
  }, [layout]);

  const update = (change: (draft: Draft) => Draft) => {
    setDraft(change);
    setSaveError(null);
  };
  const press = (key: KeypadKey) => update((d) => ({ ...d, digits: pressKey(d.digits, key) }));

  const print = async () => {
    if (saving) return;
    setAttempted(true);
    if (errors.length > 0) return;
    setSaving(true);
    const result = await onPrint(draftToInput(draft));
    setSaving(false);
    if (!result.ok) {
      setSaveError(saveErrorMessage(result.error));
      return;
    }
    setDraft(emptyDraft(initialDate));
    setAttempted(false);
    if (layout === 'column') descriptionRef.current?.focus();
  };

  const cancel = () => {
    if (isDraftDirty(draft, initial)) setConfirmOpen(true);
    else onCancel?.();
  };

  // Digits and Backspace typed anywhere on the card (except the text field and the open
  // dialogs) work the keypad.
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target instanceof HTMLInputElement || target.closest('dialog')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      press(event.key as KeypadKey);
    } else if (event.key === 'Backspace') {
      event.preventDefault();
      press('del');
    }
  };

  const cents = digitsToCents(draft.digits);
  const category = getCategory(draft.categoryId);
  const length = draft.description.trim().length;
  const when =
    draft.date === today
      ? 'TODAY'
      : draft.date === addDays(today, -1)
        ? 'YESTERDAY'
        : formatDayHeader(draft.date);
  const printLabel = showErrors
    ? `FIX ${errors.length} ${errors.length === 1 ? 'ERROR' : 'ERRORS'} TO PRINT`
    : cents > 0
      ? `PRINT LINE - ${formatCents(cents)}`
      : 'PRINT LINE';

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      aria-labelledby={ids.title}
      role="region"
      className={`flex flex-col gap-4 outline-none ${layout === 'screen' ? 'min-h-dvh px-[15px] pt-2 pb-[18px]' : ''}`}
    >
      <h2 id={ids.title} className="sr-only">
        New line
      </h2>
      {layout === 'screen' ? (
        <div className="flex items-center justify-between">
          <p aria-hidden="true" className="text-light">
            <TallText sx={3} sy={4} align="start">
              TILL
            </TallText>
          </p>
          <button
            type="button"
            onClick={cancel}
            className="h-11 font-pixel text-pixel-8 text-light underline"
          >
            CANCEL
          </button>
        </div>
      ) : null}

      <DarkCard className="flex flex-col gap-1.5 px-3 pt-2.5 pb-3">
        <div className="flex justify-between font-pixel text-pixel-8 text-olive">
          <label htmlFor={ids.description}>
            NEW LINE<span className="sr-only"> description</span>
          </label>
          <span aria-hidden="true">{formatDayHeader(draft.date)}</span>
        </div>
        <div className="flex items-end gap-2.5">
          <input
            ref={descriptionRef}
            id={ids.description}
            value={draft.description}
            onChange={(e) => {
              const description = e.target.value;
              update((d) => ({ ...d, description }));
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void print();
              }
            }}
            placeholder="what was it?"
            autoComplete="off"
            enterKeyHint="done"
            aria-invalid={descriptionInvalid || undefined}
            aria-describedby={messages.length > 0 ? ids.errors : undefined}
            className={`h-10 min-w-0 flex-1 border-0 border-b-2 border-dashed bg-transparent p-0 text-entry text-light placeholder:text-olive ${descriptionInvalid ? 'border-red-on-dark' : 'border-locked-on-ink'}`}
          />
          <p className={`shrink-0 text-amount ${amountInvalid ? 'text-red-on-dark' : ''}`}>
            <label htmlFor={ids.amount} className="sr-only">
              Amount
            </label>
            <output id={ids.amount} aria-live="polite">
              <span className="sr-only">{CURRENCY_SYMBOL}</span>
              {formatAmount(cents)}
            </output>
            <span aria-hidden="true" className="caret">
              _
            </span>
          </p>
        </div>
        <div className="flex justify-between gap-2 text-line text-olive">
          <p aria-hidden="true" className="min-w-0 truncate">
            &gt; {category.code} {category.name.toUpperCase()} · {when}
            {cents > 0 ? ` · ${formatCents(cents)}` : ''}
          </p>
          {length > DESCRIPTION_MAX ? (
            <span className="shrink-0 text-red-on-dark">
              {length}/{DESCRIPTION_MAX}
            </span>
          ) : null}
        </div>
        <DateControl
          today={today}
          value={draft.date}
          onChange={(date) => update((d) => ({ ...d, date }))}
          onPick={() => setPickerOpen(true)}
        />
      </DarkCard>

      {messages.length > 0 ? <ErrorList id={ids.errors} messages={messages} /> : null}

      <DepartmentKeys
        value={draft.categoryId}
        onChange={(categoryId) => update((d) => ({ ...d, categoryId }))}
      />

      <DarkCard className="mt-auto flex flex-col gap-1.5 p-2">
        <Keypad onPress={press} />
        <Keycap
          variant="paper"
          disabled={showErrors}
          aria-busy={saving || undefined}
          onClick={() => void print()}
          className="mx-[3px] mb-[9px] flex h-12 items-center justify-center"
        >
          <TallText sx={2} sy={3}>
            {printLabel}
          </TallText>
        </Keycap>
      </DarkCard>

      <DatePicker
        open={pickerOpen}
        today={today}
        selected={draft.date}
        onPick={(date) => {
          update((d) => ({ ...d, date }));
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />
      <DiscardDialog
        open={confirmOpen}
        preview={{
          description: (draft.description.trim() || 'UNTITLED').toUpperCase(),
          amount: formatAmount(cents),
        }}
        onKeep={() => setConfirmOpen(false)}
        onDiscard={() => {
          setConfirmOpen(false);
          onCancel?.();
        }}
      />
    </div>
  );
}
