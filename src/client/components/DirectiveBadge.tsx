import { getDirective, type DirectiveId } from '../../shared/directives';

export const DirectiveBadge = ({
  id,
  compact = false,
}: {
  id: DirectiveId;
  compact?: boolean;
}) => {
  const d = getDirective(id);
  return (
    <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-md border-2 border-brass bg-desk-2 px-2 py-1 text-manila">
      <span aria-hidden className="text-lg leading-none">
        {d.icon}
      </span>
      <span className="min-w-0">
        <span className="stamp-text block truncate text-xs text-brass">
          {compact ? d.name : `Directive: ${d.name}`}
        </span>
        {!compact && (
          <span className="block truncate font-mono text-[11px] text-manila/80">
            {d.blurb}
          </span>
        )}
      </span>
    </div>
  );
};
