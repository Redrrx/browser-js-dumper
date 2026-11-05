import { BENCH_W, BENCH_VS, WEBGL_PRESETS, CANVAS_PRESETS, DEFAULT_TEXT_STRINGS } from './scenes';
import { benchMkProg, context2D } from './resources';
import type { Resources } from './resources';
import type { AnalysisConfig, ParamValue } from './types';

export function benchRenderWebGLWithConfig(
  scope: Resources,
  canvas: HTMLCanvasElement,
  cfg: AnalysisConfig,
  size?: number,
) {
  const S = size || BENCH_W;
  canvas.width = S;
  canvas.height = S;
  const gl = scope.gl(canvas, 'webgl', { preserveDrawingBuffer: true, antialias: false });
  if (!gl) return false;
  let fs;
  if (cfg.webgl.presetId === 'custom') {
    fs = cfg.webgl.customGlsl;
  } else {
    const preset = WEBGL_PRESETS.find((p) => p.id === cfg.webgl.presetId);
    if (!preset || !preset.buildFs) return false;
    const pv: Record<string, ParamValue> = {};
    for (const pd of preset.params)
      pv[pd.id] = cfg.webgl.params[cfg.webgl.presetId]?.[pd.id] ?? pd.default;
    try {
      fs = preset.buildFs(pv);
    } catch (error) {
      throw new Error('Shader preset builder failed: ' + String(error), { cause: error });
    }
  }
  const diagnostics: string[] = [];
  const prog = benchMkProg(gl, BENCH_VS, fs, diagnostics);
  if (!prog) throw new Error(diagnostics.join('\n') || 'Shader program unavailable');
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const pl = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(pl);
  gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
  gl.uniform2f(gl.getUniformLocation(prog, 'u_res'), S, S);
  gl.viewport(0, 0, S, S);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  return true;
}

export function benchRenderCanvas2DWithConfig(
  canvas: HTMLCanvasElement,
  cfg: AnalysisConfig,
  size?: number,
) {
  const preset = CANVAS_PRESETS.find((p) => p.id === cfg.canvas.presetId);
  const S = preset?.canvasSize || size || BENCH_W;
  canvas.width = S;
  canvas.height = S;
  const ctx = context2D(canvas);
  const W = S;
  const H = S;

  if (preset?.render) {
    preset.render(ctx, W, H);
    return true;
  }

  let layers;
  let texts;
  if (preset && preset.id !== 'custom') {
    layers = preset.defaultLayers ?? cfg.canvas.layers;
    texts = preset.defaultTextStrings ?? cfg.canvas.texts;
  } else {
    layers = cfg.canvas.layers;
    texts = cfg.canvas.texts;
  }

  renderCanvasBackground(ctx, W, H, layers);
  renderCanvasPaths(ctx, W, H, layers);
  renderCanvasEffects(ctx, W, H, layers);
  renderCanvasText(ctx, W, H, layers, texts);

  return true;
}

function renderCanvasBackground(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layers: AnalysisConfig['canvas']['layers'],
) {
  if (layers.linearGradientBg) {
    const lg = ctx.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, '#0d0221');
    lg.addColorStop(0.5, '#0a1830');
    lg.addColorStop(1, '#091a12');
    ctx.fillStyle = lg;
    ctx.fillRect(0, 0, W, H);
  } else {
    ctx.fillStyle = '#0d0221';
    ctx.fillRect(0, 0, W, H);
  }

  if (layers.radialGradientBlobs) {
    const rg = ctx.createRadialGradient(W * 0.28, H * 0.28, 0, W * 0.28, H * 0.28, H * 0.34);
    rg.addColorStop(0, 'rgba(255,80,180,0.92)');
    rg.addColorStop(0.55, 'rgba(90,30,255,0.55)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);
    const rg2 = ctx.createRadialGradient(W * 0.77, H * 0.77, 0, W * 0.77, H * 0.77, H * 0.27);
    rg2.addColorStop(0, 'rgba(0,220,180,0.85)');
    rg2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg2;
    ctx.fillRect(0, 0, W, H);
  }
}

function renderCanvasPaths(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layers: AnalysisConfig['canvas']['layers'],
) {
  if (layers.arcs) {
    const arcs: [number, number, number, number, number, string, number][] = [
      [W / 2, H / 2, W * 0.354, 0, 2 * Math.PI, 'rgba(255,200,0,0.88)', 1.5],
      [W / 2, H / 2, W * 0.26, 0.52, 5.28, 'rgba(0,220,255,0.82)', 1.2],
      [W / 2, H / 2, W * 0.171, 1.05, 4.71, 'rgba(120,255,80,0.78)', 1.0],
      [W * 0.148, H * 0.78, W * 0.115, 0, 2 * Math.PI, 'rgba(255,120,40,0.85)', 1.3],
      [W * 0.852, H * 0.227, W * 0.089, 0.2, 5.9, 'rgba(200,60,255,0.82)', 1.1],
      [W / 2, H / 2, W * 0.43, 0.8, 3.6, 'rgba(255,60,100,0.5)', 0.8],
    ];
    for (const [x, y, r, s, e, c, w] of arcs) {
      ctx.beginPath();
      ctx.arc(x, y, r, s, e);
      ctx.strokeStyle = c;
      ctx.lineWidth = w;
      ctx.stroke();
    }
  }

  if (layers.beziers) {
    ctx.lineWidth = 1.4;
    const bz: [string, number, number, number, number, number, number, number, number][] = [
      [
        'rgba(255,50,150,0.88)',
        W * 0.07,
        H * 0.7,
        W * 0.29,
        H * 0.07,
        W * 0.71,
        H * 0.95,
        W * 0.95,
        H * 0.23,
      ],
      [
        'rgba(40,210,255,0.82)',
        W * 0.04,
        H * 0.38,
        W * 0.46,
        H * 0.79,
        W * 0.54,
        H * 0.07,
        W * 0.97,
        H * 0.56,
      ],
      [
        'rgba(160,255,50,0.78)',
        W * 0.19,
        H * 0.89,
        W * 0.23,
        H * 0.5,
        W * 0.77,
        H * 0.5,
        W * 0.83,
        H * 0.89,
      ],
      ['rgba(255,180,0,0.75)', W / 2, H * 0.04, W * 0.27, H / 2, W * 0.73, H / 2, W / 2, H * 0.96],
    ];
    for (const [c, x0, y0, cx1, cy1, cx2, cy2, x1, y1] of bz) {
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x1, y1);
      ctx.strokeStyle = c;
      ctx.stroke();
    }
  }
}

function renderCanvasEffects(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layers: AnalysisConfig['canvas']['layers'],
) {
  if (layers.shadowBlur) {
    ctx.save();
    ctx.shadowBlur = 14;
    ctx.shadowColor = 'rgba(255,160,0,0.9)';
    ctx.fillStyle = 'rgba(255,224,60,0.96)';
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.82, W * 0.066, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowColor = 'rgba(60,160,255,0.85)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(100,200,255,0.92)';
    ctx.fillRect(W * 0.656, H * 0.656, W * 0.086, H * 0.086);
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(255,50,200,0.7)';
    ctx.fillStyle = 'rgba(200,80,255,0.85)';
    ctx.beginPath();
    ctx.arc(W * 0.156, H * 0.828, W * 0.055, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  if (layers.screenComposite) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(255,0,100,0.38)';
    ctx.beginPath();
    ctx.arc(W * 0.398, H * 0.57, W * 0.148, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,255,120,0.38)';
    ctx.beginPath();
    ctx.arc(W * 0.555, H * 0.57, W * 0.148, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }
}

function renderCanvasText(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  layers: AnalysisConfig['canvas']['layers'],
  texts: AnalysisConfig['canvas']['texts'],
) {
  if (layers.text && texts && texts.length) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.84)';
    const sc = W / 256;
    const pos = [
      [7, 20],
      [7, 36],
      [7, 51],
      [7, H - 20],
      [7, H - 6],
    ];
    texts.slice(0, 5).forEach((t, i) => {
      const font = t.font.replace(
        /(\d+(?:\.\d+)?)px/,
        (_, n) => (parseFloat(n) * sc).toFixed(1) + 'px',
      );
      ctx.font = font;
      let bottomOffset = 0;
      if (i > 2) bottomOffset = H - 256 * sc;
      ctx.fillText(
        t.text,
        Math.round(pos[i]![0]! * sc),
        Math.round(pos[i]![1]! * sc + bottomOffset),
      );
    });
    ctx.restore();
  }
}

export function defaultConfig(): AnalysisConfig {
  const wparams: Record<string, Record<string, ParamValue>> = {};
  for (const p of WEBGL_PRESETS) {
    wparams[p.id] = {};
    for (const pd of p.params) wparams[p.id]![pd.id] = pd.default;
  }
  return {
    webgl: {
      presetId: 'entangled',
      params: wparams,
      customGlsl: `precision highp float;
uniform vec2 u_res;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  gl_FragColor = vec4(uv, 0.5 + 0.5 * sin(uv.x * 12.566), 1.0);
}`,
    },
    canvas: {
      presetId: 'fingerprint',
      layers: {
        linearGradientBg: true,
        radialGradientBlobs: true,
        arcs: true,
        beziers: true,
        shadowBlur: true,
        screenComposite: true,
        text: true,
      },
      texts: DEFAULT_TEXT_STRINGS.map((t) => ({ ...t })),
    },
  };
}
