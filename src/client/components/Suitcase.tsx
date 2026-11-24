import { findItem } from '../../shared/catalog';

type Props = {
  xrayedItemIds: string[];
  scanning?: boolean;
  slots?: number;
};

/** A closed suitcase with a CRT strip showing whatever the X-ray found. */
export const Suitcase = ({
  xrayedItemIds,
  scanning = false,
  slots = 3,
}: Props) => (
  <div className="relative mx-auto w-full max-w-[300px] pt-4">
    <div className="absolute top-0 left-1/2 h-6 w-20 -translate-x-1/2 rounded-t-xl border-4 border-b-0 border-leather-dark" />
    <div className="relative overflow-hidden rounded-xl border-4 border-leather-dark bg-leather shadow-[0_8px_0_rgb(0_0_0/0.4)]">
      <div className="absolute inset-y-0 left-8 w-3 bg-leather-dark/70" />
      <div className="absolute inset-y-0 right-8 w-3 bg-leather-dark/70" />
      <div className="relative m-3 grid h-20 grid-cols-3 gap-2 rounded-md border-2 border-black/60 bg-black/85 p-2">
        {Array.from({ length: slots }, (_, i) => {
          const item = xrayedItemIds[i]
            ? findItem(xrayedItemIds[i] ?? '')
            : undefined;
          return (
            <div
              key={i}
              className="grid place-items-center rounded border border-phosphor/25 text-center"
            >
              {item ? (
                <span className="flex flex-col items-center">
                  <span className="text-2xl leading-none drop-shadow-[0_0_6px_#4af626]">
                    {item.icon}
                  </span>
                  <span className="mt-0.5 font-mono text-[9px] leading-tight text-phosphor">
                    {item.name}
                  </span>
                </span>
              ) : (
                <span className="font-mono text-lg text-phosphor/40">?</span>
              )}
            </div>
          );
        })}
        {scanning && (
          <div className="xray-beam pointer-events-none absolute inset-y-0 w-6 bg-phosphor/50 blur-[2px]" />
        )}
      </div>
      <div className="flex justify-center gap-10 pb-2">
        <span className="h-2 w-5 rounded-sm bg-brass" />
        <span className="h-2 w-5 rounded-sm bg-brass" />
      </div>
    </div>
  </div>
);
