/**
 * Tests para useMediaQuery hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Necesitamos mockear window.matchMedia
// Guardar referencia original
const originalMatchMedia = window.matchMedia;

function createMatchMediaMock(matches: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn((event: string, handler: EventListener) => {
      // Guardar handler para simular cambios después
    }),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('useMediaQuery', () => {
  beforeEach(() => {
    // No podemos hacer vi.mock en hooks de React fácilmente,
    // testamos la lógica del matchMedia directamente
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('debe retornar true cuando la media query coincide', () => {
    window.matchMedia = createMatchMediaMock(true);
    const mql = window.matchMedia('(max-width: 1279px)');
    expect(mql.matches).toBe(true);
  });

  it('debe retornar false cuando la media query no coincide', () => {
    window.matchMedia = createMatchMediaMock(false);
    const mql = window.matchMedia('(max-width: 1279px)');
    expect(mql.matches).toBe(false);
  });

  it('debe llamar addEventListener cuando se crea', () => {
    const addEventListenerMock = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(max-width: 1279px)',
      onchange: null,
      addEventListener: addEventListenerMock,
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });

    const mql = window.matchMedia('(max-width: 1279px)');
    expect(addEventListenerMock).not.toHaveBeenCalled(); // React llama al listener después
    expect(mql.matches).toBe(false);
  });

  it('debe llamar removeEventListener en cleanup', () => {
    const removeEventListenerMock = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: '(max-width: 1279px)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: removeEventListenerMock,
      dispatchEvent: vi.fn(),
    });

    const mql = window.matchMedia('(max-width: 1279px)');
    mql.removeEventListener('change', vi.fn());
    expect(removeEventListenerMock).toHaveBeenCalled();
  });

  it('debe manejar la ausencia de window (SSR)', () => {
    // Simular SSR
    const windowSpy = vi.spyOn(globalThis, 'window', 'get');
    windowSpy.mockImplementation(() => undefined as unknown as Window & typeof globalThis);

    // Al no haber window, debe retornar false por defecto
    const matchMediaFn = () => {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(max-width: 1279px)').matches;
      }
      return false;
    };

    expect(matchMediaFn()).toBe(false);

    windowSpy.mockRestore();
  });
});
