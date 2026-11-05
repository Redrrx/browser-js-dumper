import { draw, gl2, program, QUAD, sampleFragment, texture, TRIANGLE } from './render-webgl-draw';
import type { RenderGL, WebGLCase } from './render-webgl-draw';
import { must } from './resources';
import { UnsupportedRenderFeature } from './render-suite-types';

const MIN_FILTERS = [
  'NEAREST',
  'LINEAR',
  'NEAREST_MIPMAP_NEAREST',
  'LINEAR_MIPMAP_NEAREST',
  'NEAREST_MIPMAP_LINEAR',
  'LINEAR_MIPMAP_LINEAR',
] as const;
function uploadCanvas(gl: RenderGL, flip: boolean, premultiply: boolean) {
  const source = document.createElement('canvas');
  source.width = 8;
  source.height = 8;
  try {
    const ctx = source.getContext('2d');
    if (!ctx) throw new UnsupportedRenderFeature('Canvas texture source unavailable');
    ctx.fillStyle = 'rgba(221,43,107,0.37)';
    ctx.fillRect(0, 0, 8, 5);
    ctx.fillStyle = 'rgba(23,191,73,0.81)';
    ctx.fillRect(0, 5, 8, 3);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, premultiply);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } finally {
    source.width = 0;
    source.height = 0;
  }
}
function multisample(gl: RenderGL) {
  const context = gl2(gl);
  if (context.getParameter(context.MAX_SAMPLES) < 4)
    throw new UnsupportedRenderFeature('4× MSAA unavailable');
  const buffer = must(context.createRenderbuffer());
  const target = must(context.createFramebuffer());
  context.bindRenderbuffer(context.RENDERBUFFER, buffer);
  context.renderbufferStorageMultisample(context.RENDERBUFFER, 4, context.RGBA8, 128, 128);
  context.bindFramebuffer(context.FRAMEBUFFER, target);
  context.framebufferRenderbuffer(
    context.FRAMEBUFFER,
    context.COLOR_ATTACHMENT0,
    context.RENDERBUFFER,
    buffer,
  );
  if (context.checkFramebufferStatus(context.FRAMEBUFFER) !== context.FRAMEBUFFER_COMPLETE)
    throw new Error('MSAA framebuffer incomplete');
  context.clear(context.COLOR_BUFFER_BIT);
  draw(context, TRIANGLE);
  context.bindFramebuffer(context.READ_FRAMEBUFFER, target);
  context.bindFramebuffer(context.DRAW_FRAMEBUFFER, null);
  context.blitFramebuffer(
    0,
    0,
    128,
    128,
    0,
    0,
    128,
    128,
    context.COLOR_BUFFER_BIT,
    context.NEAREST,
  );
  context.bindFramebuffer(context.FRAMEBUFFER, null);
  context.deleteFramebuffer(target);
  context.deleteRenderbuffer(buffer);
}
function instanced(gl: RenderGL) {
  const context = gl2(gl);
  const shader = program(
    context,
    `#version 300 es
const vec2 points[3]=vec2[3](vec2(-0.35,-0.3),vec2(0.35,-0.3),vec2(0.0,0.35));
flat out vec3 color;
void main(){float x=float(gl_InstanceID%2)-0.5;float y=float(gl_InstanceID/2)-0.5;
gl_Position=vec4(points[gl_VertexID]+vec2(x,y),0.0,1.0);color=vec3(x+0.5,y+0.5,0.7);}`,
    `#version 300 es
precision mediump float;flat in vec3 color;out vec4 result;
void main(){result=vec4(color,1.0);}`,
  );
  context.drawArraysInstanced(context.TRIANGLES, 0, 3, 4);
  context.deleteProgram(shader);
}
function flatInterpolation(gl: RenderGL) {
  const context = gl2(gl);
  const shader = program(
    context,
    `#version 300 es
const vec2 points[3]=vec2[3](vec2(-0.8,-0.7),vec2(0.9,-0.6),vec2(-0.2,0.9));
flat out vec3 color;
void main(){gl_Position=vec4(points[gl_VertexID],0.0,1.0);color=vec3(float(gl_VertexID)/2.0,0.3,0.7);}`,
    `#version 300 es
precision mediump float;flat in vec3 color;out vec4 result;void main(){result=vec4(color,1.0);}`,
  );
  context.drawArrays(context.TRIANGLES, 0, 3);
  context.deleteProgram(shader);
}
export const WEBGL_TEXTURE_CASES: readonly WebGLCase[] = [
  ...(['NEAREST', 'LINEAR'] as const).map((filter) => ({
    id: `texture_mag_${filter.toLowerCase()}`,
    label: `Texture magnification: ${filter}`,
    draw(gl: RenderGL) {
      const image = texture(gl);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl[filter]);
      draw(gl, QUAD, { fragment: sampleFragment('uv*0.91+0.023') });
      gl.deleteTexture(image);
    },
  })),
  ...MIN_FILTERS.map((filter) => ({
    id: `texture_min_${filter.toLowerCase()}`,
    label: `Texture minification: ${filter}`,
    draw(gl: RenderGL) {
      const image = texture(gl);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl[filter]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      draw(gl, QUAD, { fragment: sampleFragment('uv*15.37+0.021') });
      gl.deleteTexture(image);
    },
  })),
  ...(['CLAMP_TO_EDGE', 'REPEAT', 'MIRRORED_REPEAT'] as const).map((wrap) => ({
    id: `texture_wrap_${wrap.toLowerCase()}`,
    label: `Texture wrapping: ${wrap}`,
    draw(gl: RenderGL) {
      const image = texture(gl);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl[wrap]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl[wrap]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      draw(gl, QUAD, { fragment: sampleFragment('uv*2.73-0.61') });
      gl.deleteTexture(image);
    },
  })),
  ...[false, true].flatMap((flip) =>
    [false, true].map((premultiply) => ({
      id: `upload_flip_${String(flip)}_premultiply_${String(premultiply)}`,
      label: `DOM texture: flipY=${flip}, premultiplyAlpha=${premultiply}`,
      draw(gl: RenderGL) {
        const image = texture(gl);
        uploadCanvas(gl, flip, premultiply);
        draw(gl, QUAD, { fragment: sampleFragment() });
        gl.deleteTexture(image);
      },
    })),
  ),
  {
    id: 'unpack_alignment',
    label: 'RGB texture upload with padded row alignment',
    draw(gl) {
      const image = texture(gl);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGB,
        3,
        2,
        0,
        gl.RGB,
        gl.UNSIGNED_BYTE,
        new Uint8Array([
          255, 0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 31, 73, 151, 211, 53, 97, 117, 199, 43, 0, 0, 0,
        ]),
      );
      draw(gl, QUAD, { fragment: sampleFragment() });
      gl.deleteTexture(image);
    },
  },
  {
    id: 'texture_float',
    label: 'Floating-point texture sampling',
    draw(gl) {
      if (!gl.getExtension('OES_texture_float'))
        throw new UnsupportedRenderFeature('OES_texture_float unavailable');
      const image = texture(gl);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        2,
        2,
        0,
        gl.RGBA,
        gl.FLOAT,
        new Float32Array([
          0.1, 0.2, 0.3, 1, 0.499, 0.501, 0.9, 1, 0.999, 0.001, 0.7, 1, 1.1, -0.1, 0.4, 1,
        ]),
      );
      draw(gl, QUAD, { fragment: sampleFragment() });
      gl.deleteTexture(image);
    },
  },
  {
    id: 'framebuffer',
    label: 'Offscreen RGBA framebuffer render and sample',
    draw(gl) {
      const image = texture(gl);
      const target = must(gl.createFramebuffer());
      gl.bindFramebuffer(gl.FRAMEBUFFER, target);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, image, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error('RGBA framebuffer incomplete');
      gl.viewport(0, 0, 16, 16);
      gl.clear(gl.COLOR_BUFFER_BIT);
      draw(gl, TRIANGLE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, 128, 128);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      draw(gl, QUAD, { fragment: sampleFragment() });
      gl.deleteFramebuffer(target);
      gl.deleteTexture(image);
    },
  },
  {
    id: 'webgl2_srgb',
    label: 'WebGL2 sRGB texture decoding',
    api: 'webgl2',
    draw(gl) {
      const context = gl2(gl);
      const image = texture(context);
      context.texImage2D(
        context.TEXTURE_2D,
        0,
        context.SRGB8_ALPHA8,
        2,
        2,
        0,
        context.RGBA,
        context.UNSIGNED_BYTE,
        new Uint8Array([128, 64, 192, 255, 32, 224, 96, 255, 240, 128, 16, 255, 48, 96, 160, 255]),
      );
      draw(context, QUAD, { fragment: sampleFragment() });
      context.deleteTexture(image);
    },
  },
  { id: 'webgl2_msaa', label: 'WebGL2 explicit 4× MSAA resolve', api: 'webgl2', draw: multisample },
  {
    id: 'webgl2_instancing',
    label: 'WebGL2 instancing and gl_InstanceID',
    api: 'webgl2',
    draw: instanced,
  },
  {
    id: 'webgl2_flat',
    label: 'WebGL2 flat interpolation / provoking vertex',
    api: 'webgl2',
    draw: flatInterpolation,
  },
];
