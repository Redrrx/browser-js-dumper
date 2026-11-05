export {};
const worker = globalThis as unknown as {
  onmessage: (() => void) | null;
  postMessage(value: number): void;
};
worker.onmessage = () => {
  const t = performance.now();
  for (let i = 0; i < 10; i++) {
    const c = new OffscreenCanvas(256, 256);
    const x = c.getContext('2d');
    if (!x) throw new Error('Offscreen Canvas 2D unavailable');
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,80,180,0.9)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 256, 256);
  }
  worker.postMessage((performance.now() - t) / 10);
};
