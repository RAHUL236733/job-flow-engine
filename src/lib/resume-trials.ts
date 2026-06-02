/** Every account gets exactly this many successful resume analyses. */
export const RESUME_TRIALS_MAX = 2;

/** Bump when resetting grant policy so existing users receive a fresh 2-trial allowance. */
export const RESUME_TRIALS_GRANT_VERSION = "grant-2-per-account-v1";

export function trialsUsedStorageKey(userId: string): string {
  return `resume_trials_used_${userId}`;
}

export function trialsGrantFlagKey(userId: string): string {
  return `resume_trials_grant_${userId}`;
}

export function mockTrialsStorageKey(userId: string): string {
  return `mock_trials_${userId}`;
}

export function clampTrialsUsed(used: unknown): number {
  const n = Number(used);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(RESUME_TRIALS_MAX, Math.floor(n));
}

export function readTrialsUsed(userId: string, remoteUsed?: unknown): number {
  const localRaw = localStorage.getItem(trialsUsedStorageKey(userId));
  const localUsed = localRaw != null ? Number(localRaw) : 0;
  const remote = remoteUsed != null ? Number(remoteUsed) : 0;
  return clampTrialsUsed(
    Math.max(clampTrialsUsed(localUsed), clampTrialsUsed(remote)),
  );
}

export function trialsRemaining(userId: string, remoteUsed?: unknown): number {
  return Math.max(0, RESUME_TRIALS_MAX - readTrialsUsed(userId, remoteUsed));
}

export function persistTrialsUsed(userId: string, used: number): void {
  localStorage.setItem(trialsUsedStorageKey(userId), String(clampTrialsUsed(used)));
}

/** Call only after a successful analysis. Returns remaining trials. */
export function consumeResumeTrial(userId: string, remoteUsed?: unknown): number {
  const nextUsed = clampTrialsUsed(readTrialsUsed(userId, remoteUsed) + 1);
  persistTrialsUsed(userId, nextUsed);
  return Math.max(0, RESUME_TRIALS_MAX - nextUsed);
}

export const TRIALS_GRANT_METADATA_KEY = "trials_grant_version";

export function hasTrialsGrant(
  userId: string,
  userMetadata?: Record<string, unknown> | null,
): boolean {
  const localOk = localStorage.getItem(trialsGrantFlagKey(userId)) === RESUME_TRIALS_GRANT_VERSION;
  const remoteOk = userMetadata?.[TRIALS_GRANT_METADATA_KEY] === RESUME_TRIALS_GRANT_VERSION;
  return localOk || remoteOk;
}

export function needsTrialsGrantReset(
  userId: string,
  userMetadata?: Record<string, unknown> | null,
): boolean {
  return !hasTrialsGrant(userId, userMetadata);
}

export function applyTrialsGrantReset(userId: string): void {
  localStorage.setItem(trialsGrantFlagKey(userId), RESUME_TRIALS_GRANT_VERSION);
  persistTrialsUsed(userId, 0);
  localStorage.setItem(mockTrialsStorageKey(userId), "0");
}
