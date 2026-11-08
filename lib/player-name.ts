/** Shared player-name rule: two or more letters, one underscore, two or more letters. */
export const PLAYER_NAME_PATTERN = /^[A-Za-z]{2,}_[A-Za-z]{2,}$/;
export const PLAYER_NAME_PATTERN_HTML = "[A-Za-z]{2,}_[A-Za-z]{2,}";

export function isValidPlayerName(value: string): boolean {
  return PLAYER_NAME_PATTERN.test(value.trim());
}
