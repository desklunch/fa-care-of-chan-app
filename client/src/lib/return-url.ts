const RETURN_URL_KEY = 'auth_return_url';

export function isValidReturnUrl(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//') && url !== '/';
}

export function storeReturnUrl(url: string): void {
  if (isValidReturnUrl(url)) {
    localStorage.setItem(RETURN_URL_KEY, url);
  }
}

export function getAndClearReturnUrl(): string | null {
  const url = localStorage.getItem(RETURN_URL_KEY);
  localStorage.removeItem(RETURN_URL_KEY);
  
  if (url && isValidReturnUrl(url)) {
    return url;
  }
  return null;
}
