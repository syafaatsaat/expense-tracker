import { PixelIcon } from '../ui/PixelIcon.tsx';

/** Everything stopping PRINT, listed at once under the card and announced. */
export function ErrorList({ id, messages }: { id: string; messages: readonly string[] }) {
  return (
    <div
      id={id}
      role="alert"
      className="paper flex flex-col gap-1 px-2.5 py-2 text-line text-red shadow-[0_0_0_3px_var(--color-red)]"
    >
      {messages.map((message) => (
        <p key={message} className="flex items-center gap-2.5">
          <PixelIcon name="alert" className="shrink-0" />
          {message}
        </p>
      ))}
    </div>
  );
}
