import { BENCH_W, BENCH_H, BENCH_VS, BENCH_FS } from './scenes';
import { GPU_FP_BIAS, GPU_FP_RANGE, GPU_FP_TESTS } from './fp';
import type { Resources } from './resources';
import { benchMkProg, _glLose, must } from './resources';

export function benchPrecisionMatrix(scope: Resources) {
  const canvas = scope.canvas();
  canvas.width = 1;
  canvas.height = 1;
  const gl = scope.gl(canvas, 'webgl');
  if (!gl) return null;
  const result: Record<
    string,
    Record<string, { rangeMin: number; rangeMax: number; precision: number } | null>
  > = { vs: {}, fs: {} };
  const shaders: [string, number][] = [
    ['vs', gl.VERTEX_SHADER],
    ['fs', gl.FRAGMENT_SHADER],
  ];
  const precs: [string, number][] = [
    ['highp_float', gl.HIGH_FLOAT],
    ['mediump_float', gl.MEDIUM_FLOAT],
    ['lowp_float', gl.LOW_FLOAT],
    ['highp_int', gl.HIGH_INT],
    ['mediump_int', gl.MEDIUM_INT],
    ['lowp_int', gl.LOW_INT],
  ];
  for (const [sn, st] of shaders)
    for (const [pn, pt] of precs) {
      const p = gl.getShaderPrecisionFormat(st, pt);
      result[sn]![pn] = null;
      if (p)
        result[sn]![pn] = { rangeMin: p.rangeMin, rangeMax: p.rangeMax, precision: p.precision };
    }
  _glLose(gl);
  return result;
}

export function benchFPTests(scope: Resources, precision: 'highp' | 'mediump') {
  const canvas = scope.canvas();
  canvas.width = 1;
  canvas.height = 1;
  const gl = scope.gl(canvas, 'webgl');
  if (!gl) return null;
  const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const makeFS = (expr: string) =>
    'precision ' +
    precision +
    ' float;uniform ' +
    precision +
    ' float u_a,u_b;void main(){' +
    precision +
    ' float r=(' +
    expr +
    ');' +
    'highp float v=clamp((r+' +
    GPU_FP_BIAS +
    '.0)/' +
    GPU_FP_RANGE +
    '.0,0.,1.);' +
    'highp float n=floor(v*16777215.0);' +
    'gl_FragColor=vec4(floor(n/65536.0)/255.0,floor(mod(n,65536.0)/256.0)/255.0,mod(n,256.0)/255.0,1.0);}';
  const vs = (() => {
    const s = must(gl.createShader(gl.VERTEX_SHADER));
    gl.shaderSource(s, VS);
    gl.compileShader(s);
    return s;
  })();
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const run = (expr: string, a: number, b: number) => {
    const s = must(gl.createShader(gl.FRAGMENT_SHADER));
    gl.shaderSource(s, makeFS(expr));
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    const prog = must(gl.createProgram());
    gl.attachShader(prog, vs);
    gl.attachShader(prog, s);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      gl.deleteShader(s);
      return null;
    }
    gl.useProgram(prog);
    const pl = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pl);
    gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_a'), a);
    gl.uniform1f(gl.getUniformLocation(prog, 'u_b'), b);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(4);
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    gl.deleteProgram(prog);
    gl.deleteShader(s);
    const n = px[0]! * 65536 + px[1]! * 256 + px[2]!;
    return Math.round(((n / 16777215) * GPU_FP_RANGE - GPU_FP_BIAS) * 1e7) / 1e7;
  };
  const result: Record<string, number | null> = {};
  for (const [name, expr, a = 0, b = 0] of GPU_FP_TESTS)
    try {
      result[name] = run(expr, a, b);
    } catch {
      result[name] = null;
    }
  gl.deleteShader(vs);
  gl.deleteBuffer(buf);
  _glLose(gl);
  return result;
}

export function benchTextureSample(scope: Resources) {
  const canvas = scope.canvas();
  canvas.width = 1;
  canvas.height = 1;
  const gl = scope.gl(canvas, 'webgl');
  if (!gl) return null;
  const VS =
    'attribute vec2 p;varying vec2 v_uv;void main(){gl_Position=vec4(p,0.,1.);v_uv=p*0.5+0.5;}';
  const FS =
    'precision highp float;uniform sampler2D u_tex;varying vec2 v_uv;void main(){gl_FragColor=texture2D(u_tex,v_uv);}';
  const prog = benchMkProg(gl, VS, FS);
  if (!prog) return null;
  gl.useProgram(prog);
  const texData = new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255,
  ]);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 2, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, texData);
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
  gl.viewport(0, 0, 1, 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const px = new Uint8Array(4);
  gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const texResult = {
    sampled: [px[0]!, px[1]!, px[2]!, px[3]!],
    expected: [128, 128, 128, 255],
    delta: [px[0]! - 128, px[1]! - 128, px[2]! - 128],
  };
  _glLose(gl);
  return texResult;
}

export function benchFloatReadback(scope: Resources) {
  const c = Object.assign(scope.canvas(), { width: BENCH_W, height: BENCH_H });
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = scope.gl(c, 'webgl2');
  const isWGL2 = !!gl;
  if (!gl) gl = scope.gl(c, 'webgl');
  if (!gl) return null;
  if (isWGL2) {
    if (!gl.getExtension('EXT_color_buffer_float')) return null;
  } else {
    if (!gl.getExtension('OES_texture_float') || !gl.getExtension('WEBGL_color_buffer_float'))
      return null;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  if (isWGL2)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      (gl as WebGL2RenderingContext).RGBA32F,
      BENCH_W,
      BENCH_H,
      0,
      gl.RGBA,
      gl.FLOAT,
      null,
    );
  else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, BENCH_W, BENCH_H, 0, gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
    return null;
  }
  const prog = benchMkProg(gl, BENCH_VS, BENCH_FS);
  if (!prog) {
    gl.deleteTexture(tex);
    gl.deleteFramebuffer(fbo);
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
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  const data = new Float32Array(BENCH_W * BENCH_H * 4);
  gl.readPixels(0, 0, BENCH_W, BENCH_H, gl.RGBA, gl.FLOAT, data);
  gl.deleteBuffer(buf);
  gl.deleteTexture(tex);
  gl.deleteFramebuffer(fbo);
  _glLose(gl);
  return data;
}
