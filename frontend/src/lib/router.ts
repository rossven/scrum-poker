import { useSyncExternalStore } from 'react';

// Üç sayfalık uygulama için küçük bir yönlendirici: /, /yeni, /r/KOD

export type Route = { name: 'home' } | { name: 'create' } | { name: 'room'; code: string };

function parse(path: string): Route {
  const room = /^\/r\/([A-Za-z0-9]{4,16})\/?$/.exec(path);
  if (room) return { name: 'room', code: room[1].toUpperCase() };
  if (path === '/yeni') return { name: 'create' };
  return { name: 'home' };
}

const listeners = new Set<() => void>();
window.addEventListener('popstate', () => listeners.forEach((l) => l()));

export function navigate(path: string) {
  window.history.pushState(null, '', path);
  listeners.forEach((l) => l());
}

export function useRoute(): Route {
  const path = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => window.location.pathname,
  );
  return parse(path);
}

export const roomPath = (code: string) => `/r/${code}`;
export const roomUrl = (code: string) => `${window.location.origin}${roomPath(code)}`;
