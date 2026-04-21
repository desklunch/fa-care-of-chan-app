const RETURN_URL_KEY = 'auth_return_url';

const AUTHENTICATED_ROUTE_PATTERNS: string[] = [
  '/',
  '/dashboard',
  '/tasks',
  '/admin/features',
  '/admin/releases',
  '/admin/releases/:id',
  '/admin/theme',
  '/admin/roles',
  '/admin/vendors/tokens',
  '/admin/deal-settings',
  '/ai/context',
  '/amenities',
  '/app/analytics',
  '/app/features',
  '/app/features/new',
  '/app/features/:id',
  '/app/features/:id/edit',
  '/app/feedback',
  '/app/issues',
  '/app/issues/new',
  '/app/issues/:id',
  '/app/issues/:id/edit',
  '/app/logs',
  '/brands',
  '/clients',
  '/clients/contacts',
  '/clients/new',
  '/clients/:id',
  '/clients/:id/edit',
  '/comments',
  '/contacts',
  '/contacts/new',
  '/contacts/:id',
  '/contacts/:id/edit',
  '/deals',
  '/deals/mine',
  '/deals/new',
  '/deals/forms/new',
  '/deals/forms/:id/edit',
  '/deals/forms/:id',
  '/deals/forms',
  '/deals/forecast',
  '/deals/pipeline',
  '/deals/reports',
  '/deals/:id',
  '/deals/:id/edit',
  '/proposals',
  '/proposals/new',
  '/proposals/:id',
  '/forms/requests',
  '/forms/requests/new',
  '/forms/requests/:id',
  '/forms/requests/:id/edit',
  '/forms/new',
  '/forms/:id/edit',
  '/forms/:id',
  '/forms',
  '/guide',
  '/industries',
  '/manage/deal-statuses',
  '/manage/tags',
  '/notifications/preferences',
  '/profile',
  '/profile/edit',
  '/team',
  '/team/:id',
  '/team/:id/edit',
  '/vendors',
  '/vendors/contacts',
  '/vendors/new',
  '/vendors/:id',
  '/vendors/:id/edit',
  '/venues',
  '/venues/collections',
  '/venues/collections/new',
  '/venues/collections/:id',
  '/venues/collections/:id/edit',
  '/venues/new',
  '/venues/:id',
  '/venues/:id/edit',
];

const COMPILED_ROUTE_REGEXES: RegExp[] = AUTHENTICATED_ROUTE_PATTERNS.map(
  (pattern) => {
    const regexStr = pattern
      .split('/')
      .map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
      .join('/');
    return new RegExp(`^${regexStr}$`);
  },
);

function matchesKnownRoute(pathname: string): boolean {
  return COMPILED_ROUTE_REGEXES.some((re) => re.test(pathname));
}

export function isValidReturnUrl(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//') || url === '/') {
    return false;
  }

  let pathname: string;
  try {
    const parsed = new URL(url, 'http://placeholder.local');
    pathname = parsed.pathname;
  } catch {
    return false;
  }

  return matchesKnownRoute(pathname);
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
