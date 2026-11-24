import type { ReactNode } from 'react';

type BtnProps = {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

export const BigButton = ({
  children,
  onClick,
  disabled = false,
  tone = 'brass',
  className = '',
}: BtnProps & { tone?: 'brass' | 'pass' | 'bust' | 'ghost' }) => {
  const tones = {
    brass: 'bg-brass text-desk shadow-[0_5px_0_#8a6d2c]',
    pass: 'bg-clear text-manila shadow-[0_5px_0_#1f6640]',
    bust: 'bg-crimson text-manila shadow-[0_5px_0_#a8281c]',
    ghost: 'border-2 border-manila/40 text-manila shadow-none',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`press stamp-text min-h-14 w-full cursor-pointer rounded-xl px-4 text-xl ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
};
