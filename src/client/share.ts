import { showShareSheet, showToast } from '@devvit/web/client';

/** Native share sheet where available, else clipboard + toast. */
export const shareResult = async (text: string): Promise<void> => {
  try {
    await showShareSheet({ text });
    return;
  } catch (error) {
    console.warn('Share sheet unavailable, copying instead', error);
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast('Result copied. Paste it in the comments!');
  } catch {
    showToast("Couldn't copy. Long-press the result to copy it.");
  }
};
