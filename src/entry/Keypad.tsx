import type { KeypadKey } from '../domain/draft.ts';
import { Keycap } from '../ui/Keycap.tsx';
import { PixelIcon } from '../ui/PixelIcon.tsx';

const KEYS: readonly KeypadKey[] = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '00', '0', 'del'];

/** The till's number pad. Digits fill the amount from the right. */
export function Keypad({ onPress }: { onPress: (key: KeypadKey) => void }) {
  return (
    <div
      role="group"
      aria-label="Amount keypad"
      className="grid grid-cols-3 gap-x-2 gap-y-3.5 px-[3px] pt-[3px] pb-[9px]"
    >
      {KEYS.map((key) => (
        <Keycap
          key={key}
          variant="key"
          onClick={() => onPress(key)}
          aria-label={key === 'del' ? 'Delete last digit' : undefined}
          className="flex h-11 items-center justify-center pb-0.5 text-keypad"
        >
          {key === 'del' ? <PixelIcon name="backspace" scale={3} /> : key}
        </Keycap>
      ))}
    </div>
  );
}
