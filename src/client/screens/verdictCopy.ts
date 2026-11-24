import type { Reveal } from '../../shared/api';

export const verdictLine = (
  r: Reveal
): { title: string; tone: 'good' | 'bad'; hint: string } => {
  if (r.action === 'BUST' && !r.clean)
    return {
      title: 'Contraband seized',
      tone: 'good',
      hint: 'Busting contraband pays its full value.',
    };
  if (r.action === 'PASS' && r.clean)
    return {
      title: 'Clean. Waved through',
      tone: 'good',
      hint: 'Passing a clean bag pays $100.',
    };
  if (r.action === 'PASS')
    return {
      title: 'Smuggled through',
      tone: 'bad',
      hint: 'Letting contraband through costs $250.',
    };
  return {
    title: 'False arrest',
    tone: 'bad',
    hint: 'Busting a clean bag costs $300. They baited you.',
  };
};
