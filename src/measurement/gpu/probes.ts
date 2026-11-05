/// <reference types="vite/client" />
import OffscreenWorker from './offscreen.worker?worker&inline';
import { workerRequest } from './worker-rpc';
import type { ColorSpaceResult, OffscreenResult } from './probe-types';
import { BENCH_W, BENCH_H, BENCH_VS, BENCH_FS } from './scenes';
import type { Resources } from './resources';
import { benchMkProg, _glLose, context2D, nextFrame } from './resources';

export function benchReadPixelsThroughput(scope: Resources) {
  const out: Record<number, { ms: number; mpx: number } | null> = {};
  for (const size of [256, 512]) {
    const c = Object.assign(scope.canvas(), { width: size, height: size });
    const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      out[size] = null;
      continue;
    }
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    const buf = new Uint8Array(size * size * 4);
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const N = 8;
    const t0 = performance.now();
    for (let i = 0; i < N; i++) gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    const dt = (performance.now() - t0) / N;
    out[size] = { ms: +dt.toFixed(3), mpx: +((size * size) / 1e6 / (dt / 1000)).toFixed(1) };
    _glLose(gl);
  }
  return out;
}

export function benchSubpixelRaster(scope: Resources) {
  const W = 256;
  const H = 16;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const VS = 'attribute vec2 p; void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision highp float; uniform vec3 u_col; void main(){gl_FragColor=vec4(u_col,1.);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) return null;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  const colLoc = gl.getUniformLocation(prog, 'u_col');
  const results = [];
  for (let i = 0; i < 8; i++) {
    const offset = i / 8;
    const colPx = i * 32;
    const edgePx = colPx + 16 + offset;
    const leftNdc = (colPx / W) * 2 - 1;
    const edgeNdc = (edgePx / W) * 2 - 1;
    const verts = new Float32Array([
      leftNdc,
      -1,
      edgeNdc,
      -1,
      leftNdc,
      1,
      edgeNdc,
      -1,
      edgeNdc,
      1,
      leftNdc,
      1,
    ]);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    const t = i / 7;
    gl.uniform3f(colLoc, 0.5 + t * 0.5, 0.8 - t * 0.3, 0.3 + t * 0.4);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    const edgeCol = Math.min(Math.round(edgePx), W - 1);
    const px = new Uint8Array(4);
    gl.readPixels(edgeCol, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    results.push({ offset: +offset.toFixed(3), filled: px[0]! > 64, r: px[0]! });
  }
  const tmp = Object.assign(scope.canvas(), { width: W, height: 32 });
  const ctx = context2D(tmp);
  ctx.drawImage(c, 0, 0, W, 16, 0, 8, W, 16);
  const subResult = { results, dataURL: tmp.toDataURL() };
  _glLose(gl);
  return subResult;
}

export async function benchFrameTiming(scope: Resources) {
  const N = 64;
  const c = Object.assign(scope.canvas(), { width: BENCH_W, height: BENCH_H });
  const gl = scope.gl(c, 'webgl', { antialias: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const prog = benchMkProg(gl, BENCH_VS, BENCH_FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), BENCH_W, BENCH_H);
  gl.viewport(0, 0, BENCH_W, BENCH_H);
  for (let i = 0; i < 6; i++) {
    await nextFrame();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
  }
  const timestamps = [];
  for (let i = 0; i <= N; i++) {
    const ts = await nextFrame();
    timestamps.push(ts);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.flush();
  }
  const dts = [];
  for (let i = 1; i < timestamps.length; i++) dts.push(timestamps[i]! - timestamps[i - 1]!);
  const mean = dts.reduce((a, b) => a + b, 0) / dts.length;
  const variance = dts.reduce((a, b) => a + (b - mean) * (b - mean), 0) / dts.length;
  const sigma = Math.sqrt(variance);
  const sorted = dts.slice().sort((a, b) => a - b);
  const p99 = sorted[Math.min(sorted.length - 1, Math.floor(dts.length * 0.99))]!;
  const maxDt = sorted[sorted.length - 1]!;
  const fps = 1000 / mean;
  const candidates = [240, 165, 144, 120, 90, 75, 72, 60, 50, 30];
  let vsync_hz = 60;
  let bestScore = Infinity;
  for (const hz of candidates) {
    const sc = Math.abs(mean - 1000 / hz);
    if (sc < bestScore) {
      bestScore = sc;
      vsync_hz = hz;
    }
  }
  gl.deleteBuffer(buf);
  _glLose(gl);
  return {
    fps_mean: +fps.toFixed(1),
    frame_ms_mean: +mean.toFixed(3),
    frame_ms_sigma: +sigma.toFixed(3),
    frame_ms_p99: +p99.toFixed(3),
    frame_ms_max: +maxDt.toFixed(3),
    vsync_hz,
    headroom_pct: +Math.max(0, ((1000 / 60 - mean) / (1000 / 60)) * 100).toFixed(1),
    samples: N,
  };
}

export function benchAAPattern(scope: Resources) {
  const W = 256;
  const H = 256;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const ctx = context2D(c);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5];
  const results = [];
  for (let i = 0; i < angles.length; i++) {
    const ang = (angles[i]! * Math.PI) / 180;
    const segH = H / 8;
    const cy = i * segH + segH / 2;
    const cx = W / 2;
    const len = 120;
    ctx.beginPath();
    ctx.moveTo(cx - (Math.cos(ang) * len) / 2, cy - (Math.sin(ang) * len) / 2);
    ctx.lineTo(cx + (Math.cos(ang) * len) / 2, cy + (Math.sin(ang) * len) / 2);
    ctx.stroke();
    const ix = Math.max(0, Math.round(cx) - 3);
    const iy = Math.max(0, Math.round(cy) - 3);
    const patch = ctx.getImageData(ix, iy, 7, 7);
    let full = 0;
    let partial = 0;
    for (let j = 0; j < patch.data.length; j += 4) {
      const v = patch.data[j]!;
      if (v > 200) full++;
      else if (v > 20) partial++;
    }
    results.push({ angle: angles[i]!, full, partial, spread: full + partial });
  }
  return { results, dataURL: c.toDataURL() };
}

export function benchColorSpace(scope: Resources) {
  const out: ColorSpaceResult = {};
  try {
    const c = Object.assign(scope.canvas(), { width: 1, height: 1 });
    const ctx = c.getContext('2d', { colorSpace: 'display-p3' });
    out.p3_supported = !!ctx;
    if (ctx) {
      ctx.fillStyle = 'color(display-p3 1 0 0)';
      ctx.fillRect(0, 0, 1, 1);
      const px = ctx.getImageData(0, 0, 1, 1).data;
      out.p3_red_srgb = [px[0]!, px[1]!, px[2]!];
    }
  } catch {
    out.p3_supported = false;
  }
  try {
    const c = Object.assign(scope.canvas(), { width: 1, height: 1 });
    const ctx = context2D(c);
    ctx.fillStyle = 'rgb(128,128,128)';
    ctx.fillRect(0, 0, 1, 1);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    out.gray128 = [px[0]!, px[1]!, px[2]!];
    out.gray128_delta = px[0]! - 128;
  } catch {
    out.gray128 = null;
    out.gray128_delta = null;
  }
  try {
    const c = Object.assign(scope.canvas(), { width: 1, height: 1 });
    const ctx = context2D(c);
    ctx.fillStyle = 'rgba(255,0,0,0.5)';
    ctx.fillRect(0, 0, 1, 1);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    out.alpha_half = px[3]!;
    out.alpha_half_delta = px[3]! - 128;
  } catch {
    out.alpha_half = null;
  }
  try {
    const gl = scope.gl(scope.canvas(), 'webgl');
    out.webgl_srgb = !!(gl && gl.getExtension('EXT_sRGB'));
  } catch {
    out.webgl_srgb = false;
  }
  try {
    const ctx = context2D(scope.canvas());
    const id = ctx.createImageData(1, 1, { colorSpace: 'srgb' });
    out.createimagedata_colorspace = !!id;
  } catch {
    out.createimagedata_colorspace = false;
  }
  return out;
}

export async function benchOffscreenCanvas(_scope: Resources) {
  const out: OffscreenResult = { supported: typeof OffscreenCanvas !== 'undefined' };
  if (!out.supported) return out;
  const t0 = performance.now();
  for (let i = 0; i < 10; i++) {
    const c = new OffscreenCanvas(256, 256);
    const ctx = c.getContext('2d');
    if (!ctx) throw new Error('Offscreen Canvas 2D unavailable');
    const rg = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    rg.addColorStop(0, 'rgba(255,80,180,0.9)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.arc(128, 128, 64, 0, Math.PI * 2);
    ctx.stroke();
  }
  out.main_ms = +((performance.now() - t0) / 10).toFixed(3);
  if (location.protocol === 'file:') {
    out.worker_ms = null;
    out.worker_error = 'n/a on file://';
    return out;
  }
  try {
    const workerMs = await workerRequest<number>(() => new OffscreenWorker(), null, 3000);
    out.worker_ms = +workerMs.toFixed(3);
    out.ratio = +(out.main_ms / out.worker_ms!).toFixed(3);
  } catch (e) {
    out.worker_ms = null;
    let message = String(e);
    if (e instanceof Error) message = e.message;
    out.worker_error = message.slice(0, 60);
  }
  return out;
}

export function benchRenderShapes(scope: Resources, canvas: HTMLCanvasElement) {
  const S = 256;
  canvas.width = S;
  canvas.height = S;
  const gl = scope.gl(canvas, 'webgl', {
    preserveDrawingBuffer: true,
    antialias: true,
    alpha: false,
  });
  if (!gl) return false;

  const VS = `attribute vec2 p; attribute vec4 a_col; varying vec4 v_col;
void main(){gl_Position=vec4(p,0.,1.); v_col=a_col;}`;
  const FS = `precision highp float; varying vec4 v_col;
void main(){gl_FragColor=v_col;}`;
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) return false;
  gl.useProgram(prog);
  gl.viewport(0, 0, S, S);
  gl.clearColor(0.04, 0.02, 0.08, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  const pl = gl.getAttribLocation(prog, 'p');
  const cl = gl.getAttribLocation(prog, 'a_col');

  const draw = (mode: number, verts: number[]): void => {
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 24, 0);
    gl.enableVertexAttribArray(cl);
    gl.vertexAttribPointer(cl, 4, gl.FLOAT, false, 24, 8);
    gl.drawArrays(mode, 0, verts.length / 6);
  };

  renderShapeGeometry(gl, draw);

  gl.deleteBuffer(buf);

  return true;
}

export function benchBlendPrecision(scope: Resources) {
  const c = Object.assign(scope.canvas(), { width: 1, height: 1 });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision highp float;uniform vec4 u_col;void main(){gl_FragColor=u_col;}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  const colLoc = gl.getUniformLocation(prog, 'u_col');

  const bgR = 200;
  const bgG = 100;
  const bgB = 50;
  const fgR = 30;
  const fgG = 220;
  const fgB = 180;
  const alphas = [1 / 3, 1 / 7, 127 / 255, 128 / 255, 2 / 3, 3 / 7, 5 / 9, 0.1, 0.9, 0.01];
  const tests = [];

  for (const alpha of alphas) {
    gl.disable(gl.BLEND);
    gl.clearColor(bgR / 255, bgG / 255, bgB / 255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform4f(colLoc, fgR / 255, fgG / 255, fgB / 255, alpha);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const expR = Math.round(fgR * alpha + bgR * (1 - alpha));
    const expG = Math.round(fgG * alpha + bgG * (1 - alpha));
    const expB = Math.round(fgB * alpha + bgB * (1 - alpha));
    tests.push({
      alpha: +alpha.toFixed(8),
      actual: [px[0]!, px[1]!, px[2]!],
      expected: [expR, expG, expB],
      delta: [px[0]! - expR, px[1]! - expG, px[2]! - expB],
    });
  }
  gl.deleteBuffer(buf);
  _glLose(gl);
  return { tests };
}

export function benchVaryingInterp(scope: Resources) {
  const W = 32;
  const H = 1;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const VS =
    'attribute vec2 p;attribute float a_val;varying float v_val;void main(){gl_Position=vec4(p,0.,1.);v_val=a_val;}';
  const FS =
    'precision highp float;varying float v_val;void main(){float v=clamp(v_val,0.0,1.0);float n=floor(v*16777215.0);gl_FragColor=vec4(floor(n/65536.0)/255.0,floor(mod(n,65536.0)/256.0)/255.0,mod(n,256.0)/255.0,1.0);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const verts = new Float32Array([-1, -1, 0.0, 1, -1, 1.0, -1, 1, 0.0, 1, 1, 1.0]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  const al = gl.getAttribLocation(prog, 'a_val');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 12, 0);
  gl.enableVertexAttribArray(al);
  gl.vertexAttribPointer(al, 1, gl.FLOAT, false, 12, 8);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const samples = [];
  for (let x = 0; x < W; x++) {
    const i = x * 4;
    const n = px[i]! * 65536 + px[i + 1]! * 256 + px[i + 2]!;
    const val = n / 16777215;
    const expected = (x + 0.5) / W;
    samples.push({
      x,
      value: +val.toFixed(7),
      expected: +expected.toFixed(7),
      delta: +(val - expected).toFixed(7),
    });
  }
  gl.deleteBuffer(buf);
  _glLose(gl);
  return { samples };
}

export function benchTexFilterPrecision(scope: Resources) {
  const W = 16;
  const H = 1;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const VS =
    'attribute vec2 p;varying vec2 v_uv;void main(){gl_Position=vec4(p,0.,1.);v_uv=p*0.5+0.5;}';
  const FS =
    'precision highp float;uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const texData = new Uint8Array([
    0, 0, 0, 255, 85, 85, 85, 255, 170, 170, 170, 255, 255, 255, 255, 255,
  ]);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const samples = [];
  for (let x = 0; x < W; x++) {
    const u = (x + 0.5) / W;
    samples.push({ u: +u.toFixed(4), r: px[x * 4]!, g: px[x * 4 + 1]!, b: px[x * 4 + 2]! });
  }
  gl.deleteBuffer(buf);
  gl.deleteTexture(tex);
  _glLose(gl);
  return { samples };
}

export function benchDerivativePrecision(scope: Resources) {
  const W = 4;
  const H = 4;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return null;
  const ext = gl.getExtension('OES_standard_derivatives');
  if (!ext) {
    _glLose(gl);
    return { supported: false };
  }
  const VS =
    'attribute vec2 p;varying vec2 v_uv;void main(){gl_Position=vec4(p,0.,1.);v_uv=p*0.5+0.5;}';
  const FS =
    '#extension GL_OES_standard_derivatives : enable\nprecision highp float;varying vec2 v_uv;void main(){float dx=dFdx(v_uv.x);float dy=dFdy(v_uv.y);gl_FragColor=vec4(dx*float(' +
    W +
    ')*0.5+0.5, dy*float(' +
    H +
    ')*0.5+0.5, v_uv.x, 1.0);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return { supported: true, error: 'shader compile failed' };
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const samples = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      samples.push({ x, y, dfdx_raw: px[i]!, dfdy_raw: px[i + 1]!, uv_x_raw: px[i + 2]! });
    }
  gl.deleteBuffer(buf);
  _glLose(gl);
  return { supported: true, w: W, h: H, samples };
}

export function benchDepthPrecision(scope: Resources) {
  const c = Object.assign(scope.canvas(), { width: 1, height: 1 });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false, depth: true });
  if (!gl) return null;
  const VS = 'attribute vec2 p;uniform float u_z;void main(){gl_Position=vec4(p,u_z,1.);}';
  const FS = 'precision highp float;uniform vec3 u_col;void main(){gl_FragColor=vec4(u_col,1.0);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  const zLoc = gl.getUniformLocation(prog, 'u_z');
  const colLoc = gl.getUniformLocation(prog, 'u_col');
  gl.viewport(0, 0, 1, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);

  const epsilons = [1e-1, 1e-2, 1e-3, 1e-4, 1e-5, 1e-6, 1e-7];
  const tests = [];
  for (const eps of epsilons) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniform1f(zLoc, 0.0);
    gl.uniform3f(colLoc, 1, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.uniform1f(zLoc, -eps);
    gl.uniform3f(colLoc, 0, 1, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let winner = 'back';
    if (px[1]! > 128) winner = 'front';
    tests.push({ epsilon: eps, winner, r: px[0]!, g: px[1]! });
  }
  gl.deleteBuffer(buf);
  _glLose(gl);
  return { tests };
}

export function benchStencilEdge(scope: Resources) {
  const W = 32;
  const H = 1;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl', { preserveDrawingBuffer: true, antialias: false, stencil: true });
  if (!gl) return null;
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision highp float;uniform vec3 u_col;void main(){gl_FragColor=vec4(u_col,1.0);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return null;
  }
  gl.useProgram(prog);
  const colLoc = gl.getUniformLocation(prog, 'u_col');
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1);
  gl.clearStencil(0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);

  gl.enable(gl.STENCIL_TEST);
  gl.stencilFunc(gl.ALWAYS, 1, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
  gl.colorMask(false, false, false, false);
  const triBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0.5, -1, -1, 1]), gl.STATIC_DRAW);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.colorMask(true, true, true, true);
  gl.stencilFunc(gl.EQUAL, 1, 0xff);
  gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.uniform3f(colLoc, 1, 1, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const boundary = [];
  for (let x = 0; x < W; x++) boundary.push(px[x * 4]!);
  gl.deleteBuffer(quadBuf);
  gl.deleteBuffer(triBuf);
  _glLose(gl);
  let edge_x = -1;
  for (let x = 1; x < W; x++)
    if (boundary[x]! !== boundary[x - 1]!) {
      edge_x = x;
      break;
    }
  return { boundary, edge_x, w: W };
}

export function benchMSAAPositions(scope: Resources) {
  const W = 32;
  const H = 1;
  const c = Object.assign(scope.canvas(), { width: W, height: H });
  const gl = scope.gl(c, 'webgl2', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return { supported: false };
  const maxSamples = gl.getParameter(gl.MAX_SAMPLES) as number;
  if (maxSamples < 4) {
    _glLose(gl);
    return { supported: true, maxSamples, error: 'max samples < 4' };
  }
  const samples = Math.min(8, maxSamples);
  const msFbo = gl.createFramebuffer();
  const msRbo = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, msRbo);
  gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA8, W, H);
  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, msRbo);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    _glLose(gl);
    return { supported: true, error: 'MS FBO incomplete' };
  }
  const resFbo = gl.createFramebuffer();
  const resTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, resTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, resFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, resTex, 0);

  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FS = 'precision highp float;void main(){gl_FragColor=vec4(1.,1.,1.,1.);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) {
    _glLose(gl);
    return { supported: true, error: 'shader failed' };
  }
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 0.0, -1, -1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, msFbo);
  gl.viewport(0, 0, W, H);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES, 0, 3);

  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, msFbo);
  gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, resFbo);
  gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);

  gl.bindFramebuffer(gl.FRAMEBUFFER, resFbo);
  const px = new Uint8Array(W * H * 4);
  gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const edge = [];
  for (let x = 0; x < W; x++) edge.push(px[x * 4]!);
  const edgeValues = [...new Set(edge.filter((v) => v > 0 && v < 255))].sort((a, b) => a - b);
  gl.deleteBuffer(buf);
  gl.deleteRenderbuffer(msRbo);
  gl.deleteFramebuffer(msFbo);
  gl.deleteFramebuffer(resFbo);
  gl.deleteTexture(resTex);
  _glLose(gl);
  return { supported: true, maxSamples, requestedSamples: samples, edge, edgeValues, w: W };
}

function renderShapeGeometry(
  gl: WebGLRenderingContext,
  draw: (mode: number, verts: number[]) => void,
) {
  function px(x: number, y: number) {
    return [(x / 256) * 2 - 1, 1 - (y / 256) * 2];
  }
  function v(x: number, y: number, r: number, g: number, b: number, a: number) {
    return [...px(x, y), r, g, b, a];
  }

  const lineAngles = [0, 15, 30, 45, 60, 75, 90, 135];
  for (let i = 0; i < lineAngles.length; i++) {
    const ang = (lineAngles[i]! * Math.PI) / 180;
    const cx = 32;
    const cy = 32 + i * 24;
    const len = 50;
    const hw = 0.5;
    const dx = Math.cos(ang);
    const dy = Math.sin(ang);
    const nx = -dy * hw;
    const ny = dx * hw;
    const x0 = cx - (dx * len) / 2;
    const y0 = cy - (dy * len) / 2;
    const x1 = cx + (dx * len) / 2;
    const y1 = cy + (dy * len) / 2;
    const t = i / 7;
    draw(gl.TRIANGLE_STRIP, [
      ...v(x0 + nx, y0 + ny, 0.8 + t * 0.2, 0.9 - t * 0.4, 0.3 + t * 0.5, 0.9),
      ...v(x0 - nx, y0 - ny, 0.8 + t * 0.2, 0.9 - t * 0.4, 0.3 + t * 0.5, 0.9),
      ...v(x1 + nx, y1 + ny, 0.8 + t * 0.2, 0.9 - t * 0.4, 0.3 + t * 0.5, 0.9),
      ...v(x1 - nx, y1 - ny, 0.8 + t * 0.2, 0.9 - t * 0.4, 0.3 + t * 0.5, 0.9),
    ]);
  }

  const circles: { cx: number; cy: number; r: number; col: [number, number, number, number] }[] = [
    { cx: 100, cy: 40, r: 18.0, col: [1, 0.3, 0.5, 0.85] },
    { cx: 145, cy: 40, r: 18.5, col: [0.3, 0.8, 1, 0.85] },
    { cx: 190, cy: 40, r: 19.0, col: [0.5, 1, 0.3, 0.85] },
    { cx: 235, cy: 40, r: 19.3, col: [1, 0.9, 0.2, 0.85] },
    { cx: 100, cy: 90, r: 8.5, col: [1, 0.5, 0.8, 0.9] },
    { cx: 130, cy: 90, r: 12.7, col: [0.4, 0.9, 0.7, 0.9] },
  ];
  for (const c of circles) {
    const N = 64;
    const fan = [...v(c.cx, c.cy, ...c.col)];
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      fan.push(...v(c.cx + Math.cos(a) * c.r, c.cy + Math.sin(a) * c.r, ...c.col));
    }
    draw(gl.TRIANGLE_FAN, fan);
  }

  const tris: [number[], number[], number[]][] = [
    [v(80, 130, 1, 0.3, 0.2, 0.8), v(120, 130, 1, 0.3, 0.2, 0.8), v(100, 95, 1, 0.3, 0.2, 0.8)],
    [v(130, 130, 0.2, 0.6, 1, 0.8), v(170, 130, 0.2, 0.6, 1, 0.8), v(130, 95, 0.2, 0.6, 1, 0.8)],
    [v(180, 130, 0.8, 1, 0.2, 0.8), v(240, 128, 0.8, 1, 0.2, 0.8), v(210, 100, 0.8, 1, 0.2, 0.8)],
    [v(80, 140, 1, 0.6, 0.9, 0.85), v(240, 142, 1, 0.6, 0.9, 0.85), v(160, 138, 1, 0.6, 0.9, 0.85)],
  ];
  for (const t of tris) draw(gl.TRIANGLES, [...t[0], ...t[1], ...t[2]]);

  const fan1 = [...v(70, 190, 1, 0.2, 0.4, 0.6)];
  const fan2 = [...v(100, 190, 0.2, 0.8, 0.4, 0.6)];
  const fan3 = [...v(85, 170, 0.3, 0.4, 1, 0.6)];
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    fan1.push(...v(70 + Math.cos(a) * 25, 190 + Math.sin(a) * 25, 1, 0.2, 0.4, 0.6));
    fan2.push(...v(100 + Math.cos(a) * 25, 190 + Math.sin(a) * 25, 0.2, 0.8, 0.4, 0.6));
    fan3.push(...v(85 + Math.cos(a) * 25, 170 + Math.sin(a) * 25, 0.3, 0.4, 1, 0.6));
  }
  draw(gl.TRIANGLE_FAN, fan1);
  draw(gl.TRIANGLE_FAN, fan2);
  draw(gl.TRIANGLE_FAN, fan3);

  const rects: {
    x: number;
    y: number;
    w: number;
    h: number;
    col: [number, number, number, number];
  }[] = [
    { x: 140.0, y: 155, w: 30, h: 12, col: [0.9, 0.5, 0.1, 0.85] },
    { x: 140.3, y: 172, w: 30, h: 12, col: [0.1, 0.9, 0.5, 0.85] },
    { x: 140.5, y: 189, w: 30, h: 12, col: [0.5, 0.1, 0.9, 0.85] },
    { x: 140.7, y: 206, w: 30, h: 12, col: [0.9, 0.9, 0.1, 0.85] },
  ];
  for (const r of rects) {
    draw(gl.TRIANGLE_STRIP, [
      ...v(r.x, r.y, ...r.col),
      ...v(r.x + r.w, r.y, ...r.col),
      ...v(r.x, r.y + r.h, ...r.col),
      ...v(r.x + r.w, r.y + r.h, ...r.col),
    ]);
  }

  for (let j = 0; j < 4; j++) {
    const ecx = 210;
    const ecy = 160 + j * 26;
    const rx = 18 + j * 2;
    const ry = 8 + j;
    const rot = j * 0.4;
    const col: [number, number, number, number] = [0.6 + j * 0.1, 0.3, 0.9 - j * 0.15, 0.8];
    const fan = [...v(ecx, ecy, ...col)];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const ex = Math.cos(a) * rx;
      const ey = Math.sin(a) * ry;
      const px2 = ecx + ex * Math.cos(rot) - ey * Math.sin(rot);
      const py2 = ecy + ex * Math.sin(rot) + ey * Math.cos(rot);
      fan.push(...v(px2, py2, ...col));
    }
    draw(gl.TRIANGLE_FAN, fan);
  }

  const starCx = 60;
  const starCy = 230;
  const starR = 20;
  const starIr = 8;
  const starPts = 7;
  const starVerts = [...v(starCx, starCy, 1, 0.85, 0.2, 0.9)];
  for (let i = 0; i <= starPts * 2; i++) {
    const a = (i / (starPts * 2)) * Math.PI * 2 - Math.PI / 2;
    let r = starIr;
    if (i % 2 === 0) r = starR;
    starVerts.push(...v(starCx + Math.cos(a) * r, starCy + Math.sin(a) * r, 1, 0.85, 0.2, 0.9));
  }
  draw(gl.TRIANGLE_FAN, starVerts);
}
