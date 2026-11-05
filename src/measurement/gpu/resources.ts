type GL = WebGLRenderingContext | WebGL2RenderingContext;

export class Resources {
  private canvases = new Set<HTMLCanvasElement>();
  private contexts = new Set<GL>();
  canvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    this.canvases.add(canvas);
    return canvas;
  }
  gl(
    canvas: HTMLCanvasElement,
    kind: 'webgl2',
    options?: WebGLContextAttributes,
  ): WebGL2RenderingContext | null;
  gl(
    canvas: HTMLCanvasElement,
    kind: 'webgl',
    options?: WebGLContextAttributes,
  ): WebGLRenderingContext | null;
  gl(
    canvas: HTMLCanvasElement,
    kind: 'webgl' | 'webgl2',
    options?: WebGLContextAttributes,
  ): GL | null;
  gl(
    canvas: HTMLCanvasElement,
    kind: 'webgl' | 'webgl2',
    options?: WebGLContextAttributes,
  ): GL | null {
    const gl = canvas.getContext(kind, options) as GL | null;
    if (gl) this.contexts.add(gl);
    return gl;
  }
  dispose(): void {
    for (const gl of this.contexts) _glLose(gl);
    for (const canvas of this.canvases) {
      canvas.width = 0;
      canvas.height = 0;
    }
    this.contexts.clear();
    this.canvases.clear();
  }
}

export function _glLose(gl: GL | null): void {
  try {
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // Context cleanup is best-effort; failure must not interrupt resource disposal.
  }
}

export function benchMkProg(
  gl: GL,
  vsrc: string,
  fsrc: string,
  diagnostics?: string[],
): WebGLProgram | null {
  const compile = (type: number, source: string): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) {
      diagnostics?.push('Shader allocation failed');
      return null;
    }
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    diagnostics?.push(
      gl.getShaderInfoLog(shader) || 'Shader compilation failed without an info log',
    );
    gl.deleteShader(shader);
    return null;
  };
  const vs = compile(gl.VERTEX_SHADER, vsrc);
  const fs = compile(gl.FRAGMENT_SHADER, fsrc);
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    diagnostics?.push('Program allocation failed');
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  diagnostics?.push(gl.getProgramInfoLog(program) || 'Program linking failed without an info log');
  gl.deleteProgram(program);
  return null;
}

export function context2D(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');
  return ctx;
}
export function benchRollingHash(buf: ArrayLike<number>): string {
  let h = 0;
  for (let i = 0; i < buf.length; i++) h = (h * 31 + buf[i]!) >>> 0;
  return h.toString(16).padStart(8, '0');
}
export function benchGetPixels(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width;
  tmp.height = canvas.height;
  try {
    const ctx = context2D(tmp);
    ctx.drawImage(canvas, 0, 0);
    return ctx.getImageData(0, 0, tmp.width, tmp.height).data;
  } finally {
    tmp.width = 0;
    tmp.height = 0;
  }
}
export const YIELD = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

export function nextFrame(timeout = 2000): Promise<number> {
  return new Promise((resolve, reject) => {
    let frame: number | undefined;
    const timer = setTimeout(() => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      reject(new Error('Animation frame timeout (document may be hidden)'));
    }, timeout);
    try {
      frame = requestAnimationFrame((timestamp) => {
        clearTimeout(timer);
        resolve(timestamp);
      });
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

export function must<T>(value: T | null | undefined): T {
  if (value == null) throw new Error('Browser resource allocation failed');
  return value;
}
