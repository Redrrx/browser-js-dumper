import {
  GPU_FP_BIAS,
  GPU_FP_RANGE,
  GPU_FP_TESTS,
  WASM_FEATURES,
  DRM_KEY_SYSTEMS,
  DRM_BASE_CONFIGS,
  DRM_WIDEVINE_ROBUSTNESS,
} from './constants-graphics.js';
import { CSS_SUPPORTS_PROBES, CSS_COMPUTED_PROBES } from './constants-css.js';
import { errorMessage, errorName, probeNavigator, probeWindow, read, _glLose } from './utils.js';
import type { Activator, ProbeRecord } from './types.js';
export const advancedActivators: Activator[] = [
  {
    ns: 'gpu_fp',
    get: () => {
      if (typeof WebGLRenderingContext === 'undefined') return { available: false };
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const gl = canvas.getContext('webgl');
      if (!gl) return { available: false };

      const prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      const result: ProbeRecord & { tests?: Record<string, number | null> } = {
        available: true,
        highp_supported: prec && prec.precision > 0,
        highp_range_min: prec?.rangeMin ?? null,
        highp_range_max: prec?.rangeMax ?? null,
        highp_precision: prec?.precision ?? null,
      };

      const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
      const makeFS = (expr: string) =>
        `precision highp float;uniform float u_a,u_b;void main(){` +
        `float v=clamp((${expr}+${GPU_FP_BIAS}.0)/${GPU_FP_RANGE}.0,0.,1.);` +
        `float n=floor(v*16777215.0);` +
        `gl_FragColor=vec4(floor(n/65536.0)/255.0,floor(mod(n,65536.0)/256.0)/255.0,mod(n,256.0)/255.0,1.0);}`;

      const mkShader = (type: number, src: string) => {
        const s = gl.createShader(type);
        if (!s) return null;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
        gl.deleteShader(s);
        return null;
      };

      const vs = mkShader(gl.VERTEX_SHADER, VS);
      if (!vs) return { available: true, error: 'vs_compile_failed' };

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );

      const run = (expr: string, a: number, b: number) => {
        const fs = mkShader(gl.FRAGMENT_SHADER, makeFS(expr));
        if (!fs) return null;
        const prog = gl.createProgram();
        if (!prog) {
          gl.deleteShader(fs);
          return null;
        }
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.deleteProgram(prog);
          gl.deleteShader(fs);
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
        gl.deleteShader(fs);
        const n = px[0]! * 65536 + px[1]! * 256 + px[2]!;
        return Math.round(((n / 16777215) * GPU_FP_RANGE - GPU_FP_BIAS) * 1e7) / 1e7;
      };

      result.tests = {};
      for (const [name, expr, a = 0, b = 0] of GPU_FP_TESTS)
        try {
          result.tests[name] = run(expr, a, b);
        } catch {
          result.tests[name] = null;
        }

      gl.deleteShader(vs);
      gl.deleteBuffer(buf);
      _glLose(gl);
      return result;
    },
  },

  {
    ns: 'wasm',
    get: () => {
      if (typeof WebAssembly === 'undefined') return { available: false };
      const result: ProbeRecord & { features?: Record<string, boolean> } = { available: true };
      result.validate = WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
      result.features = {};
      for (const [name, bytes] of WASM_FEATURES)
        try {
          result.features[name] = WebAssembly.validate(new Uint8Array(bytes));
        } catch {
          result.features[name] = false;
        }
      return result;
    },
  },

  {
    ns: 'webrtc',
    get: () => {
      const result: ProbeRecord = { available: typeof RTCPeerConnection !== 'undefined' };
      if (!result.available) return result;
      try {
        const ac = RTCRtpSender.getCapabilities('audio');
        result.audioSendCodecs =
          ac?.codecs?.map((c) => ({
            mimeType: c.mimeType,
            clockRate: c.clockRate,
            channels: c.channels,
            sdpFmtpLine: c.sdpFmtpLine ?? null,
          })) ?? null;
      } catch {
        result.audioSendCodecs = null;
      }
      try {
        const vc = RTCRtpSender.getCapabilities('video');
        result.videoSendCodecs =
          vc?.codecs?.map((c) => ({
            mimeType: c.mimeType,
            clockRate: c.clockRate,
            sdpFmtpLine: c.sdpFmtpLine ?? null,
          })) ?? null;
      } catch {
        result.videoSendCodecs = null;
      }
      try {
        const ar = RTCRtpReceiver.getCapabilities('audio');
        result.audioRecvCodecs =
          ar?.codecs?.map((c) => ({
            mimeType: c.mimeType,
            clockRate: c.clockRate,
            channels: c.channels,
          })) ?? null;
      } catch {
        result.audioRecvCodecs = null;
      }
      try {
        const vr = RTCRtpReceiver.getCapabilities('video');
        result.videoRecvCodecs =
          vr?.codecs?.map((c) => ({ mimeType: c.mimeType, clockRate: c.clockRate })) ?? null;
      } catch {
        result.videoRecvCodecs = null;
      }
      return result;
    },
  },

  {
    ns: 'css',
    get: () => {
      const result: {
        supports: Record<string, boolean | null>;
        computed: Record<string, string | null>;
      } = { supports: {}, computed: {} };

      for (const probe of CSS_SUPPORTS_PROBES) {
        const [key, ...args] = probe;
        try {
          if (args.length === 1) result.supports[key] = CSS.supports(args[0]);
          else result.supports[key] = CSS.supports(args[0], args[1]);
        } catch {
          result.supports[key] = null;
        }
      }

      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;visibility:hidden';
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      for (const prop of CSS_COMPUTED_PROBES) {
        try {
          const v = cs.getPropertyValue(prop);
          result.computed[prop] = null;
          if (v !== '') result.computed[prop] = v;
        } catch {
          result.computed[prop] = null;
        }
      }
      document.body.removeChild(el);

      return result;
    },
  },

  {
    ns: 'keyboard',
    get: async () => {
      const result: ProbeRecord & { layout?: Record<string, string> } = {
        available: typeof probeNavigator().keyboard !== 'undefined',
      };
      if (!result.available) return result;
      try {
        const map = await probeNavigator().keyboard!.getLayoutMap();
        result.size = map.size;
        result.layout = {};
        for (const [code, key] of map) result.layout[code] = key;
      } catch (e) {
        result.error = errorName(e);
      }
      return result;
    },
  },

  {
    ns: 'drm',
    get: async () => {
      if (typeof navigator.requestMediaKeySystemAccess !== 'function') return { available: false };
      const result: ProbeRecord & {
        systems: Record<
          string,
          {
            supported: boolean;
            initDataTypes?: string[] | null;
            videoCodecs?: (string | undefined)[] | null;
            audioCodecs?: (string | undefined)[] | null;
          }
        >;
        widevine_robustness?: Record<string, boolean>;
      } = { available: true, systems: {} };

      result.systems = {};
      for (const [name, keySystem] of DRM_KEY_SYSTEMS) {
        try {
          const access = await navigator.requestMediaKeySystemAccess(keySystem, DRM_BASE_CONFIGS);
          const cfg = access.getConfiguration();
          result.systems[name] = {
            supported: true,
            initDataTypes: cfg.initDataTypes ?? null,
            videoCodecs: cfg.videoCapabilities?.map((c) => c.contentType) ?? null,
            audioCodecs: cfg.audioCapabilities?.map((c) => c.contentType) ?? null,
          };
        } catch {
          result.systems[name] = { supported: false };
        }
      }

      if (result.systems.widevine?.supported) {
        result.widevine_robustness = {};
        for (const [label, robustness] of DRM_WIDEVINE_ROBUSTNESS) {
          try {
            await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
              {
                initDataTypes: ['cenc'],
                videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"', robustness }],
              },
            ]);
            result.widevine_robustness[label] = true;
          } catch {
            result.widevine_robustness[label] = false;
          }
        }
      }

      return result;
    },
  },

  {
    ns: 'chrome',
    get: () => {
      if (typeof probeWindow().chrome === 'undefined') return { available: false };
      const r: ProbeRecord = { available: true };
      try {
        if (typeof probeWindow().chrome!.loadTimes === 'function')
          r.loadTimes = probeWindow().chrome!.loadTimes!();
      } catch (e) {
        r.loadTimesError = errorMessage(e);
      }
      try {
        if (typeof probeWindow().chrome!.csi === 'function') r.csi = probeWindow().chrome!.csi!();
      } catch (e) {
        r.csiError = errorMessage(e);
      }
      try {
        r.runtime = probeWindow().chrome!.runtime ?? null;
      } catch (e) {
        r.runtimeError = errorMessage(e);
      }
      try {
        r.app = probeWindow().chrome!.app ?? null;
      } catch (e) {
        r.appError = errorMessage(e);
      }
      return r;
    },
  },

  {
    ns: 'apis',
    get: () => ({
      bluetooth: typeof read(navigator, 'bluetooth') !== 'undefined',
      barcodeDetector: typeof read(window, 'BarcodeDetector') !== 'undefined',
      webShare: typeof navigator.share === 'function',
      credentials: typeof navigator.credentials !== 'undefined',
      paymentRequest: typeof PaymentRequest !== 'undefined',
      usb: typeof read(navigator, 'usb') !== 'undefined',
      serial: typeof read(navigator, 'serial') !== 'undefined',
      nfc: typeof read(window, 'NDEFReader') !== 'undefined',
      hid: typeof read(navigator, 'hid') !== 'undefined',
      fileSystemAccess: typeof read(window, 'showOpenFilePicker') === 'function',
      eyeDropper: typeof read(window, 'EyeDropper') !== 'undefined',
      contactPicker: typeof read(navigator, 'contacts') !== 'undefined',
      xr: typeof read(navigator, 'xr') !== 'undefined',
      webAuthn: typeof PublicKeyCredential !== 'undefined',
      speechRecognition:
        typeof (read(window, 'SpeechRecognition') ?? read(window, 'webkitSpeechRecognition')) !==
        'undefined',
      mediaCapabilities: typeof navigator.mediaCapabilities !== 'undefined',
      deviceOrientation: typeof DeviceOrientationEvent !== 'undefined',
      deviceMotion: typeof DeviceMotionEvent !== 'undefined',
      wakeLock: typeof navigator.wakeLock !== 'undefined',
      scheduler: typeof read(window, 'scheduler') !== 'undefined',
      idleDetector: typeof read(window, 'IdleDetector') !== 'undefined',
      windowManagement: typeof read(window, 'getScreenDetails') === 'function',
      screenOrientation: typeof screen.orientation !== 'undefined',
      pointerLock: typeof document.pointerLockElement !== 'undefined',
      pictureInPicture: typeof document.pictureInPictureEnabled !== 'undefined',
      presentation: typeof read(navigator, 'presentation') !== 'undefined',
      computePressure: typeof read(window, 'PressureObserver') !== 'undefined',
      webTransport: typeof WebTransport !== 'undefined',
      webCodecs: typeof VideoEncoder !== 'undefined',
      clipboard: typeof navigator.clipboard !== 'undefined',
      locks: typeof navigator.locks !== 'undefined',
      backgroundSync: typeof read(window, 'SyncManager') !== 'undefined',
      periodicSync: typeof read(window, 'PeriodicSyncManager') !== 'undefined',
      storageFoundation: typeof navigator.storage !== 'undefined',
      sharedStorage: typeof read(window, 'sharedStorage') !== 'undefined',
      topics: typeof read(document, 'browsingTopics') === 'function',
      fledge: typeof read(navigator, 'runAdAuction') === 'function',
      trustToken: typeof read(document, 'hasTrustToken') === 'function',
      privateStateToken: typeof read(document, 'hasPrivateToken') === 'function',
    }),
  },

  {
    ns: 'client_hints',
    get: async () => {
      const uad = probeNavigator().userAgentData;
      if (!uad) return { available: false };
      const result: ProbeRecord = {
        available: true,
        mobile: uad.mobile,
        brands: uad.brands?.map((b) => b.brand + ' ' + b.version).sort() ?? null,
      };
      try {
        const he = await uad.getHighEntropyValues([
          'architecture',
          'bitness',
          'model',
          'platform',
          'platformVersion',
          'uaFullVersion',
          'fullVersionList',
          'wow64',
          'formFactor',
        ]);
        result.architecture = he.architecture ?? null;
        result.bitness = he.bitness ?? null;
        result.model = he.model ?? null;
        result.platform = he.platform ?? null;
        result.platformVersion = he.platformVersion ?? null;
        result.uaFullVersion = he.uaFullVersion ?? null;
        result.wow64 = he.wow64 ?? null;
        result.formFactor = he.formFactor ?? null;
        if (Array.isArray(he.formFactor)) result.formFactor = he.formFactor.join(', ');
        result.fullVersionList =
          he.fullVersionList?.map((b) => b.brand + ' ' + b.version).sort() ?? null;
      } catch (e) {
        result.highEntropyError = errorMessage(e);
      }
      return result;
    },
  },
];
