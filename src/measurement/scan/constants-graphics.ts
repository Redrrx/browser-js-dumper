export const CANVAS_W = 500;
export const CANVAS_H = 200;

export const CANVAS_MEASURE_FONTS: [string, string][] = [
  ['16px Arial', 'mmmmmmmmmmlli'],
  ['16px serif', 'mmmmmmmmmmlli'],
  ['16px monospace', 'mmmmmmmmmmlli'],
  ['bold 20px Arial', 'Sphinx of quartz judge my vow'],
  ['italic 14px serif', '0Oljl| 1IiLl'],
];

export const CANVAS_TEXT_LAYERS: [string, string][] = [
  ['bold 14px Arial', 'Sphinx of quartz'],
  ['italic 12px serif', 'judge my vow 0Oljl|'],
  ['11px monospace', '1IiLl0O !@#$'],
];

export const CANVAS_SAMPLE_POINTS: [number, number][] = [
  [250, 100],
  [10, 10],
  [490, 10],
  [10, 190],
  [490, 190],
  [125, 100],
  [375, 100],
];

export const CANVAS_BLEND_MODES: GlobalCompositeOperation[] = [
  'multiply',
  'screen',
  'overlay',
  'difference',
  'xor',
];

export const WEBGL_CONSTANT_RANGE = { min: 0x0001, max: 0xffff };

export const GPU_FP_BIAS = 8.0;
export const GPU_FP_RANGE = 16.0;

export const GPU_FP_TESTS: [string, string, number, number][] = [
  ['sin', 'sin(u_a)', 0.5, 0.0],
  ['cos', 'cos(u_a)', 0.5, 0.0],
  ['tan', 'tan(u_a)', 0.5, 0.0],
  ['asin', 'asin(u_a)', 0.5, 0.0],
  ['acos', 'acos(u_a)', 0.5, 0.0],
  ['atan1', 'atan(u_a)', 1.0, 0.0],
  ['atan2', 'atan(u_a, u_b)', 1.0, 2.0],
  ['exp', 'exp(u_a)', 1.0, 0.0],
  ['log', 'log(u_a)', 2.718281828, 0.0],
  ['exp2', 'exp2(u_a)', 2.5, 0.0],
  ['log2', 'log2(u_a)', 5.0, 0.0],
  ['sqrt', 'sqrt(u_a)', 2.0, 0.0],
  ['inversesqrt', 'inversesqrt(u_a)', 2.0, 0.0],
  ['pow', 'pow(u_a, u_b)', 2.0, 0.333333343],
  ['fma', 'u_a * u_b + u_a', 1.0000001, 2.0000002],
  ['sum_fp', 'u_a + u_b', 0.1, 0.2],
  ['fract', 'fract(u_a)', 3.14159265358979, 0.0],
  ['mod', 'mod(u_a, u_b)', 10.5, 3.0],
  ['smoothstep', 'smoothstep(0.0, u_b, u_a)', 0.5, 1.0],
  ['mix', 'mix(u_a, u_b, 0.3)', 1.0, 4.0],
  ['normalize_x', 'normalize(vec2(u_a, u_b)).x', 3.0, 4.0],
  ['length_2d', 'length(vec2(u_a, u_b))', 3.0, 4.0],
  ['dot_2d', 'dot(vec2(u_a,u_a),vec2(u_b,u_b))', 0.5, 0.7],
  ['reflect_x', 'reflect(vec2(u_a,0.0),normalize(vec2(u_b,u_b))).x', 1.0, 1.0],
  ['cross_z', 'cross(vec3(u_a,u_b,0.0),vec3(u_b,u_a,0.0)).z', 0.6, 0.8],
];

export const WASM_FEATURES: [string, number[]][] = [
  [
    'simd',
    [
      0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 1, 123, 1, 123, 3, 2, 1, 0, 10, 6, 1, 4, 0, 32, 0,
      11,
    ],
  ],
  ['exceptions', [0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 1, 127, 0, 13, 3, 1, 0, 0]],
  [
    'tail_calls',
    [0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 10, 6, 1, 4, 0, 18, 0, 11],
  ],
  ['memory64', [0, 97, 115, 109, 1, 0, 0, 0, 5, 3, 1, 4, 0]],
  ['reference_types', [0, 97, 115, 109, 1, 0, 0, 0, 4, 4, 1, 111, 0, 0]],
  [
    'multi_value',
    [
      0, 97, 115, 109, 1, 0, 0, 0, 1, 6, 1, 96, 0, 2, 127, 127, 3, 2, 1, 0, 10, 8, 1, 6, 0, 65, 1,
      65, 2, 11,
    ],
  ],
];

export const DRM_KEY_SYSTEMS: [string, string][] = [
  ['clearkey', 'org.w3.clearkey'],
  ['widevine', 'com.widevine.alpha'],
  ['playready', 'com.microsoft.playready'],
  ['playready30', 'com.microsoft.playready.recommendation'],
  ['fairplay', 'com.apple.fps'],
  ['fairplay10', 'com.apple.fps.1_0'],
  ['primetime', 'com.adobe.primetime'],
];

export const DRM_BASE_CONFIGS: MediaKeySystemConfiguration[] = [
  {
    initDataTypes: ['cenc', 'keyids', 'webm'],
    videoCapabilities: [
      { contentType: 'video/mp4; codecs="avc1.42E01E"' },
      { contentType: 'video/mp4; codecs="avc1.4d401e"' },
      { contentType: 'video/webm; codecs="vp8"' },
      { contentType: 'video/webm; codecs="vp9"' },
      { contentType: 'video/webm; codecs="vp09.00.10.08"' },
    ],
    audioCapabilities: [
      { contentType: 'audio/mp4; codecs="mp4a.40.2"' },
      { contentType: 'audio/webm; codecs="vorbis"' },
      { contentType: 'audio/webm; codecs="opus"' },
    ],
  },
];

export const DRM_WIDEVINE_ROBUSTNESS: [string, string][] = [
  ['HW_SECURE_ALL', 'HW_SECURE_ALL'],
  ['HW_SECURE_DECODE', 'HW_SECURE_DECODE'],
  ['HW_SECURE_CRYPTO', 'HW_SECURE_CRYPTO'],
  ['SW_SECURE_DECODE', 'SW_SECURE_DECODE'],
  ['SW_SECURE_CRYPTO', 'SW_SECURE_CRYPTO'],
];
