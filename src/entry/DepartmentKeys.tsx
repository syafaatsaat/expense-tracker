import { KEY_ORDER, getCategory } from '../domain/categories.ts';
import type { CategoryId } from '../domain/types.ts';
import { Keycap } from '../ui/Keycap.tsx';
import { PixelIcon } from '../ui/PixelIcon.tsx';

interface DepartmentKeysProps {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
}

/**
 * One key per department: icon, two-letter code and short name on the key, the full
 * department name for screen readers. Savings gets a double-width key with a dashed
 * inner line, because it is kept out of SPENT.
 */
export function DepartmentKeys({ value, onChange }: DepartmentKeysProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <p aria-hidden="true" className="font-pixel text-pixel-8 text-light">
        DEPARTMENT · SAVINGS STAYS OUT OF SPENT
      </p>
      <div
        role="group"
        aria-label="Department"
        className="grid grid-cols-4 gap-x-2.5 gap-y-4 px-[3px] pt-[3px] pb-[9px]"
      >
        {KEY_ORDER.map((id) => {
          const category = getCategory(id);
          const on = id === value;
          const saving = category.kind === 'saving';
          return (
            <Keycap
              key={id}
              variant={on ? 'selected' : 'paper'}
              pressed={on}
              onClick={() => onChange(id)}
              className={`flex h-[54px] min-w-0 flex-col justify-between px-1.5 pt-[7px] pb-1.5 text-left sm:px-2 ${saving ? 'col-span-2' : ''}`}
            >
              <span aria-hidden="true" className="flex items-start justify-between">
                <PixelIcon name={category.icon} />
                <span className={`font-pixel text-pixel-8 ${on ? 'text-olive' : 'text-muted'}`}>
                  {category.code}
                </span>
              </span>
              <span aria-hidden="true" className="truncate font-pixel text-pixel-8">
                {saving ? `${category.shortName} · NOT SPENT` : category.shortName}
              </span>
              <span className="sr-only">{category.name}</span>
              {saving ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-1 border-2 border-dashed border-current"
                />
              ) : null}
            </Keycap>
          );
        })}
      </div>
    </div>
  );
}
