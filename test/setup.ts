// Polyfills required by React Flow under jsdom.
// jsdom does not implement ResizeObserver, DOMMatrix, or `getBoundingClientRect` for SVG.
// React Flow uses these to compute viewport bounds; without them it throws on render.

const g = globalThis as unknown as Record<string, unknown>;

if (typeof g.ResizeObserver === 'undefined') {
  class ResizeObserverStub {
    observe(): void {
      // no-op
    }
    unobserve(): void {
      // no-op
    }
    disconnect(): void {
      // no-op
    }
  }
  g.ResizeObserver = ResizeObserverStub;
}

if (typeof g.DOMMatrixReadOnly === 'undefined') {
  class DOMMatrixStub {
    m22 = 1;
  }
  g.DOMMatrixReadOnly = DOMMatrixStub;
  g.DOMMatrix = DOMMatrixStub;
}
