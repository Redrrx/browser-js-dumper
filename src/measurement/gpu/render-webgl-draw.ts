import { benchMkProg, must } from './resources';
import { UnsupportedRenderFeature } from './render-suite-types';

export type RenderGL = WebGLRenderingContext | WebGL2RenderingContext;
export interface WebGLCase {
  id: string;
  label: string;
  api?: 'webgl2';
  antialias?: boolean;
  premultipliedAlpha?: boolean;
  draw: (gl: RenderGL) => void;
}
export const QUAD = [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1];
export const TRIANGLE = [-0.83, -0.79, 0.91, -0.61, -0.17, 0.87];
const VERTEX = `attribute vec2 p;
uniform float u_depth;
varying vec2 uv;
void main(){uv=p*0.5+0.5;gl_Position=vec4(p,u_depth,1.0);gl_PointSize=7.0;}`;
const FRAGMENT = `precision mediump float;
uniform vec4 u_color;
void main(){gl_FragColor=u_color;}`;
export interface DrawOptions {
  mode?: number;
  color?: readonly number[];
  depth?: number;
  fragment?: string;
  vertex?: string;
  indices?: readonly number[];
}
export function program(gl: RenderGL, vertex: string, fragment: string) {
  const diagnostics: string[] = [];
  const value = benchMkProg(gl, vertex, fragment, diagnostics);
  if (!value) throw new Error(diagnostics.join('; ') || 'Shader program unavailable');
  gl.useProgram(value);
  return value;
}
export function draw(gl: RenderGL, vertices: readonly number[], options: DrawOptions = {}) {
  const shader = program(gl, options.vertex ?? VERTEX, options.fragment ?? FRAGMENT);
  const buffer = must(gl.createBuffer());
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const p = gl.getAttribLocation(shader, 'p');
  if (p >= 0) {
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
  }
  gl.uniform4fv(
    gl.getUniformLocation(shader, 'u_color'),
    options.color ?? [0.17, 0.67, 0.91, 0.73],
  );
  gl.uniform1f(gl.getUniformLocation(shader, 'u_depth'), options.depth ?? 0);
  let indices: WebGLBuffer | null = null;
  if (options.indices) {
    indices = must(gl.createBuffer());
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(options.indices), gl.STATIC_DRAW);
    gl.drawElements(options.mode ?? gl.TRIANGLES, options.indices.length, gl.UNSIGNED_SHORT, 0);
  } else gl.drawArrays(options.mode ?? gl.TRIANGLES, 0, vertices.length / 2);
  if (p >= 0) gl.disableVertexAttribArray(p);
  if (indices) gl.deleteBuffer(indices);
  gl.deleteBuffer(buffer);
  gl.deleteProgram(shader);
}
export function gl2(gl: RenderGL): WebGL2RenderingContext {
  if (typeof WebGL2RenderingContext === 'undefined' || !(gl instanceof WebGL2RenderingContext))
    throw new UnsupportedRenderFeature('WebGL2 unavailable');
  return gl;
}
export function texture(gl: RenderGL) {
  const value = must(gl.createTexture());
  gl.bindTexture(gl.TEXTURE_2D, value);
  const pixels = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      pixels.set([x * 17, y * 17, ((x ^ y) & 1) * 255, 255], (y * 16 + x) * 4);
    }
  }
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 16, 16, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return value;
}
export function sampleFragment(coordinates = 'uv') {
  return `precision mediump float; varying vec2 uv; uniform sampler2D image;
void main(){gl_FragColor=texture2D(image,${coordinates});}`;
}
