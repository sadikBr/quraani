/**
 * One sound at a time across the app: the recitation and the adhkar recordings each claim the
 * audio before playing, which stops whichever was playing before.
 */
let current: { owner: string; release: () => void } | null = null;

export function claimAudio(owner: string, release: () => void) {
  const previous = current;
  current = { owner, release };
  if (previous && previous.owner !== owner) previous.release();
}

/** Called by an owner that stopped on its own. */
export function releaseAudio(owner: string) {
  if (current?.owner === owner) current = null;
}
