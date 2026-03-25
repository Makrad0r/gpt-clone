const STORAGE_KEY = "anonymous_session_token";

export function getAnonymousSessionToken() {
  return localStorage.getItem(STORAGE_KEY);
}

export function setAnonymousSessionToken(token: string) {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearAnonymousSessionToken() {
  localStorage.removeItem(STORAGE_KEY);
}
