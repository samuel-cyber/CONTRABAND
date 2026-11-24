import type { Item } from '../../shared/catalog';
import { itemValue, type DirectiveId } from '../../shared/directives';
import { formatMoney } from '../../shared/share';

type Props = {
  item: Item;
  directiveId: DirectiveId;
  size?: 'sm' | 'md';
  selected?: boolean;
  dimmed?: boolean;
  pulse?: boolean;
  onClick?: () => void;
};

export const ItemCard = ({
  item,
  directiveId,
  size = 'md',
  selected = false,
  dimmed = false,
  pulse = false,
  onClick,
}: Props) => {
  const value = itemValue(item, directiveId);
  const boosted = value !== item.value;
  const body = (
    <>
      <span
        aria-hidden
        className={
          size === 'sm' ? 'text-[28px] leading-none' : 'text-4xl leading-none'
        }
      >
        {item.icon}
      </span>
      <span className="mt-1 line-clamp-2 text-center text-[13px] leading-tight font-medium">
        {item.name}
      </span>
      <span className="mt-auto flex items-center gap-1 pt-0.5 font-mono text-xs font-bold">
        {formatMoney(value)}
        {boosted && (
          <span className="rounded bg-crimson px-1 text-[10px] text-manila">
            ×2
          </span>
        )}
      </span>
      <span
        className={`mt-0.5 rounded-full px-2 py-px text-[10px] font-bold tracking-wider uppercase ${
          item.contraband ? 'bg-crimson text-manila' : 'bg-clear text-manila'
        }`}
      >
        {item.contraband ? 'Contraband' : 'Legal'}
      </span>
    </>
  );
  const cls = `paper relative flex w-full flex-col items-center rounded-lg border-2 px-1 py-1.5 shadow-[0_3px_0_rgb(0_0_0/0.35)] ${
    selected ? 'border-phosphor ring-2 ring-phosphor' : 'border-manila-3'
  } ${dimmed ? 'opacity-40' : ''} ${pulse ? 'hint-pulse' : ''}`;

  if (!onClick) return <div className={cls}>{body}</div>;
  return (
    <button
      type="button"
      className={`${cls} press cursor-pointer`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {body}
      {selected && (
        <span className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-phosphor text-sm font-bold text-desk">
          ✓
        </span>
      )}
    </button>
  );
};
