const TOKEN_KEY = 'building_safety_token';
const ORIGINAL_TOKEN_KEY = 'building_safety_original_admin_token';

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function startImpersonation(token: string) {
  const currentToken = getToken();
  if (currentToken && !localStorage.getItem(ORIGINAL_TOKEN_KEY)) {
    localStorage.setItem(ORIGINAL_TOKEN_KEY, currentToken);
  }
  saveToken(token);
}

export function stopImpersonation() {
  const originalToken = localStorage.getItem(ORIGINAL_TOKEN_KEY);
  localStorage.removeItem(ORIGINAL_TOKEN_KEY);
  if (originalToken) saveToken(originalToken);
  else clearToken();
  return originalToken;
}

export function isImpersonating() {
  return Boolean(localStorage.getItem(ORIGINAL_TOKEN_KEY));
}

export function clearAuthSession() {
  clearToken();
  localStorage.removeItem(ORIGINAL_TOKEN_KEY);
}
