// jsdom has no matchMedia. This fake answers min-width queries from one flag: tests start
// on the phone layout and call setDesktop(true) for the desktop one.
let desktop = false;
const listeners = new Set<() => void>();

export function setDesktop(value: boolean) {
  desktop = value;
  listeners.forEach((listener) => listener());
}

export function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string): MediaQueryList =>
      ({
        get matches() {
          return desktop && query.includes('min-width');
        },
        media: query,
        onchange: null,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });
}
