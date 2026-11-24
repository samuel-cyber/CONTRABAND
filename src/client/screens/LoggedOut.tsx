import { showLoginPrompt } from '@devvit/web/client';
import type { StateResponse } from '../../shared/api';
import { BigButton } from '../components/Buttons';
import { DirectiveBadge } from '../components/DirectiveBadge';

export const LoggedOut = ({ state }: { state: StateResponse }) => (
  <div className="desk flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
    <div className="stamp-text -rotate-3 rounded-md border-4 border-crimson px-4 py-1 text-4xl text-crimson">
      Contrabluff
    </div>
    <DirectiveBadge id={state.directiveId} />
    <p className="font-mono text-sm text-manila/80">
      Pack a bag. Inspect five strangers. Bluff your way through customs.
    </p>
    <BigButton onClick={() => showLoginPrompt()}>Log in to clock in</BigButton>
  </div>
);
