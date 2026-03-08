const ACTIVATORS = [

  { ns: "navigator",      get: () => navigator },
  { ns: "visualViewport", get: () => visualViewport },
  { ns: "screen",         get: () => screen },
  { ns: "performance",    get: () => performance },
  { ns: "history",        get: () => history },
  { ns: "location",       get: () => location },
  { ns: "document",       get: () => document },
  { ns: "crypto",         get: () => crypto },
  { ns: "indexedDB",      get: () => indexedDB },
  { ns: "caches",         get: () => caches },

  {
    ns: "canvas",
    get: () => {
      const c = document.createElement("canvas");
      c.width = CANVAS_W; c.height = CANVAS_H;
      const ctx = c.getContext("2d");
      const W = CANVAS_W, H = CANVAS_H;

      const rg = ctx.createRadialGradient(W/2,H/2,10,W/2,H/2,W/2);
      rg.addColorStop(0,"#1a1a2e"); rg.addColorStop(0.5,"#16213e"); rg.addColorStop(1,"#0f3460");
      ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);

      ctx.save(); ctx.translate(W/2, H/2);
      for (let i = 0; i < 12; i++) {
        const a = (i/12)*Math.PI*2, r1=60, r2=90;
        ctx.beginPath(); ctx.moveTo(0,0);
        ctx.bezierCurveTo(
          Math.cos(a-0.3)*r1, Math.sin(a-0.3)*r1,
          Math.cos(a+0.3)*r2, Math.sin(a+0.3)*r2,
          Math.cos(a)*r2,     Math.sin(a)*r2
        );
        ctx.strokeStyle = `hsla(${(i/12)*360},90%,65%,0.8)`;
        ctx.lineWidth = 1.5; ctx.stroke();
      }
      ctx.restore();

      const lg = ctx.createLinearGradient(0,0,W,H);
      ["rgba(255,100,100,0.3)","rgba(100,255,100,0.3)","rgba(100,100,255,0.3)",
       "rgba(255,255,100,0.3)","rgba(255,100,255,0.3)"].forEach((col,i) => lg.addColorStop(i/4, col));
      ctx.fillStyle = lg; ctx.fillRect(0,0,W,H);

      ctx.beginPath(); ctx.moveTo(0, H/2);
      for (let x = 0; x <= W; x += 2)
        ctx.lineTo(x, H/2 + Math.sin(x/W*Math.PI*4)*40 + Math.sin(x/W*Math.PI*7)*15 + Math.cos(x/W*Math.PI*11)*8);
      ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();

      ctx.save();
      ctx.beginPath(); ctx.ellipse(W*0.25, H*0.5, 40, 30, Math.PI/6, 0, Math.PI*2); ctx.clip();
      ctx.fillStyle = "rgba(255,200,50,0.8)"; ctx.fillRect(0,0,W,H);
      ctx.restore();

      ctx.save(); ctx.shadowColor = "rgba(0,255,200,0.9)"; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(W*0.75, H*0.5, 25, 0, Math.PI*2);
      ctx.fillStyle = "rgba(0,200,180,0.7)"; ctx.fill(); ctx.restore();

      CANVAS_TEXT_LAYERS.forEach(([f,t],i) => {
        ctx.font = f; ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.fillText(t, 8, 18+i*16);
      });

      CANVAS_BLEND_MODES.forEach((mode,i) => {
        ctx.globalCompositeOperation = mode;
        ctx.fillStyle = `hsla(${i*72},80%,60%,0.6)`;
        ctx.beginPath(); ctx.arc(350+i*8, 100+i*6, 20, 0, Math.PI*2); ctx.fill();
      });
      ctx.globalCompositeOperation = "source-over";

      const result = { measureText: {}, pixels: {}, rowHash: null, pixelHash: null, context: {} };

      for (const [font, text] of CANVAS_MEASURE_FONTS) {
        ctx.font = font;
        const m = ctx.measureText(text);
        const k = font.replace(/\s+/g,"_").replace(/[^a-z0-9_]/gi,"");
        result.measureText[k] = {
          width:                    m.width,
          actualBoundingBoxAscent:  m.actualBoundingBoxAscent,
          actualBoundingBoxDescent: m.actualBoundingBoxDescent,
          fontBoundingBoxAscent:    m.fontBoundingBoxAscent  ?? null,
          fontBoundingBoxDescent:   m.fontBoundingBoxDescent ?? null,
        };
      }

      for (const [px, py] of CANVAS_SAMPLE_POINTS) {
        const d = ctx.getImageData(px, py, 1, 1).data;
        result.pixels[`x${px}_y${py}`] = `${d[0]},${d[1]},${d[2]},${d[3]}`;
      }

      const row = ctx.getImageData(0, Math.round(H/2), W, 1).data;
      let rh = 0; for (let i = 0; i < row.length; i++) rh = ((rh*31) + row[i]) >>> 0;
      result.rowHash = rh;

      let ph = 0;
      for (const v of Object.values(result.pixels))
        for (const n of v.split(",").map(Number)) ph = ((ph*31) + n) >>> 0;
      result.pixelHash = ph;

      result.context = ctx;
      return result;
    }
  },

  {
    ns: "audio",
    get: async () => {
      const ac   = new OfflineAudioContext(1, 44100, 44100);
      const osc  = ac.createOscillator();
      const comp = ac.createDynamicsCompressor();
      osc.type = "triangle"; osc.frequency.value = 10000;
      osc.connect(comp); comp.connect(ac.destination); osc.start(0);
      const buf  = await ac.startRendering();
      const data = buf.getChannelData(0);

      let sum = 0, min = Infinity, max = -Infinity;
      for (let i = 0; i < data.length; i++) {
        const v = data[i]; sum += Math.abs(v);
        if (v < min) min = v; if (v > max) max = v;
      }
      let hash = 0;
      for (let i = 0; i < 4096; i++) hash = ((hash*31) + Math.round(data[i]*1e9)) >>> 0;

      return {
        sampleRate:       buf.sampleRate,
        length:           buf.length,
        numberOfChannels: buf.numberOfChannels,
        channelData:      { sum, min, max, mean: sum / data.length, hash4096: hash },
        compressor: {
          threshold: comp.threshold.value, knee: comp.knee.value,
          ratio:     comp.ratio.value,     attack: comp.attack.value, release: comp.release.value,
        },
        context: {
          sampleRate: ac.sampleRate, length: ac.length,
          numberOfChannels: ac.numberOfChannels, currentTime: ac.currentTime,
        },
      };
    }
  },

  {
    ns: "webgl",
    get: () => {
      const c  = document.createElement("canvas");
      const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
      if (!gl) return { available: false };

      const result = { available: true, params: {}, extensions: null };

      const walkGlParams = (ctx) => {
        const out = {};
        const seen = new Set();
        let p = Object.getPrototypeOf(ctx);
        while (p && p !== Object.prototype) {
          for (const k of Object.getOwnPropertyNames(p)) {
            if (seen.has(k)) continue; seen.add(k);
            try {
              const v = ctx[k];
              if (typeof v === "number" && Number.isInteger(v) && v > WEBGL_CONSTANT_RANGE.min && v < WEBGL_CONSTANT_RANGE.max) {
                try {
                  const r = ctx.getParameter(v);
                  if (r == null) continue;
                  out[k] = r instanceof Float32Array || r instanceof Int32Array ? Array.from(r) : r;
                } catch {}
              }
            } catch {}
          }
          p = Object.getPrototypeOf(p);
        }
        return out;
      };

      const enumExtension = (ctx, name) => {
        try {
          const ext = ctx.getExtension(name);
          if (!ext) return null;
          const out = {};
          for (const k of Object.getOwnPropertyNames(Object.getPrototypeOf(ext)).concat(Object.getOwnPropertyNames(ext))) {
            try {
              const v = ext[k];
              if (typeof v === "function") continue;
              out[k] = v instanceof Float32Array || v instanceof Int32Array ? Array.from(v) : v;
            } catch {}
          }
          return out;
        } catch { return null; }
      };

      try { result.extensions = gl.getSupportedExtensions(); } catch {}
      result.params = walkGlParams(gl);

      try {
        const dbgExt = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbgExt) {
          result.unmaskedVendor   = gl.getParameter(dbgExt.UNMASKED_VENDOR_WEBGL);
          result.unmaskedRenderer = gl.getParameter(dbgExt.UNMASKED_RENDERER_WEBGL);
        }
      } catch {}

      if (result.extensions) {
        result.extensionData = {};
        for (const name of result.extensions) {
          const d = enumExtension(gl, name);
          if (d && Object.keys(d).length) result.extensionData[name] = d;
        }
      }

      const c2 = document.createElement("canvas");
      const gl2 = c2.getContext("webgl2");
      if (gl2) {
        result.webgl2 = { available: true, params: {}, extensions: null, extensionData: {} };
        try { result.webgl2.extensions = gl2.getSupportedExtensions(); } catch {}
        result.webgl2.params = walkGlParams(gl2);
        if (result.webgl2.extensions) {
          for (const name of result.webgl2.extensions) {
            const d = enumExtension(gl2, name);
            if (d && Object.keys(d).length) result.webgl2.extensionData[name] = d;
          }
        }
      }

      return result;
    }
  },

  {
    ns: "storage",
    get: async () => {
      const est = await navigator.storage.estimate();
      return {
        quota:     est.quota,
        usage:     est.usage,
        persisted: await navigator.storage.persisted().catch(() => null),
      };
    }
  },

  {
    ns: "fonts",
    get: async () => {
      const result = { method: null, count: 0, families: null, checks: null };

      if (typeof queryLocalFonts === "function") {
        try {
          const local = await queryLocalFonts();
          const families = new Set(local.map(f => f.family));
          result.method   = "queryLocalFonts";
          result.count    = families.size;
          result.families = [...families].sort();
          result.raw      = local.map(f => ({ family: f.family, style: f.style, fullName: f.fullName, postscriptName: f.postscriptName }));
        } catch(e) {
          result.method = "queryLocalFonts_denied";
        }
      }

      if (!result.families) {
        const checks = {};
        for (const f of FONT_FAMILIES)
          try { checks[f.replace(/\s/g,"_")] = document.fonts.check("16px " + f); } catch {}
        result.method  = "checklist";
        result.count   = Object.values(checks).filter(Boolean).length;
        result.checks  = checks;
      }

      result.documentFontsSize = document.fonts.size;
      return result;
    }
  },

  {
    ns: "layout",
    get: () => {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;top:10px;left:10px;width:100px;height:50px;font:16px Arial;padding:4px;border:2px solid red";
      el.textContent = "probe";
      document.body.appendChild(el);
      const br = el.getBoundingClientRect(), cr = el.getClientRects()[0] || {};

      const p = document.createElement("p");
      p.style.cssText = "position:fixed;top:0;left:0;font:16px Arial;visibility:hidden;white-space:nowrap";
      p.textContent = "Hello World sphinx of quartz";
      document.body.appendChild(p);
      const range = document.createRange();
      range.selectNodeContents(p);
      const rbr = range.getBoundingClientRect(), rcr = range.getClientRects()[0] || {};

      document.body.removeChild(el);
      document.body.removeChild(p);

      return {
        element: {
          boundingClientRect: { top: br.top, left: br.left, width: br.width, height: br.height, right: br.right, bottom: br.bottom },
          clientRect0:        { top: cr.top, left: cr.left, width: cr.width, height: cr.height },
        },
        range: {
          boundingClientRect: { top: rbr.top, left: rbr.left, width: rbr.width, height: rbr.height },
          clientRect0:        { top: rcr.top, left: rcr.left, width: rcr.width, height: rcr.height },
        },
      };
    }
  },

  {
    ns: "svg",
    get: () => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
      svg.style.cssText = "position:fixed;top:0;left:0;visibility:hidden";
      svg.setAttribute("width","600"); svg.setAttribute("height","200");

      const defs = [["Arial",16,"Hello SVG World"],["serif",14,"Sphinx of black quartz"],["monospace",12,"0Oljl| 1IiLl"]];
      const result = {};
      const txts = defs.map(([fam,sz,content]) => {
        const t = document.createElementNS("http://www.w3.org/2000/svg","text");
        t.setAttribute("x","10"); t.setAttribute("y","50");
        t.setAttribute("font-family",fam); t.setAttribute("font-size",String(sz));
        t.textContent = content;
        svg.appendChild(t);
        return { el:t, fam, sz };
      });
      document.body.appendChild(svg);

      for (const { el, fam, sz } of txts) {
        const bb = el.getBBox(), ext = el.getExtentOfChar(0);
        result[`${fam}_${sz}`] = {
          bbox:                { x: bb.x, y: bb.y, width: bb.width, height: bb.height },
          computedTextLength:  el.getComputedTextLength(),
          subStringLength_0_5: el.getSubStringLength(0, 5),
          extentOfChar0:       { x: ext.x, y: ext.y, width: ext.width, height: ext.height },
        };
      }
      document.body.removeChild(svg);
      return result;
    }
  },

  {
    ns: "intl",
    get: () => {
      const ref    = new Date(DATE_REF);
      const result = { resolvedOptions: {}, formats: {}, numberFormats: {}, collator: {}, segmenter: {}, listFormat: {}, displayNames: {} };

      for (const fmt of ["DateTimeFormat","NumberFormat","Collator","RelativeTimeFormat","PluralRules","Segmenter","ListFormat"])
        try { result.resolvedOptions[fmt] = new Intl[fmt]().resolvedOptions(); } catch {}

      for (const [opts, key] of DATE_REF_FORMATS)
        try { result.formats[key] = new Intl.DateTimeFormat(undefined, opts).format(ref); } catch {}

      try { result.numberFormats.default  = new Intl.NumberFormat().format(1234567.89); } catch {}
      try { result.numberFormats.currency = new Intl.NumberFormat(undefined,{style:"currency",currency:"USD"}).format(99.99); } catch {}
      try { result.numberFormats.percent  = new Intl.NumberFormat(undefined,{style:"percent"}).format(0.4567); } catch {}
      try { result.collator.compareAB     = new Intl.Collator().compare("a","b"); } catch {}
      try { result.supportedLocales       = Intl.DateTimeFormat.supportedLocalesOf(["en","zh","ar","ja","fr","de"]).join(", "); } catch {}

      try {
        const seg = new Intl.Segmenter(undefined, { granularity: "word" });
        result.segmenter.words = [...seg.segment("Hello world test")].filter(s => s.isWordLike).map(s => s.segment);
        result.segmenter.grapheme_count = [...new Intl.Segmenter().segment("e\u0301cafe\u0301")].length;
      } catch {}

      try { result.listFormat.conjunction  = new Intl.ListFormat(undefined,{style:"long",type:"conjunction"}).format(["a","b","c"]); } catch {}
      try { result.listFormat.disjunction  = new Intl.ListFormat(undefined,{style:"long",type:"disjunction"}).format(["a","b","c"]); } catch {}
      try { result.listFormat.unit_short   = new Intl.ListFormat(undefined,{style:"short",type:"unit"}).format(["5km","3min"]); } catch {}

      try {
        const dnLang = new Intl.DisplayNames(undefined, { type: "language" });
        result.displayNames.en = dnLang.of("en");
        result.displayNames.zh = dnLang.of("zh");
        result.displayNames.ar = dnLang.of("ar");
      } catch {}
      try {
        const dnReg = new Intl.DisplayNames(undefined, { type: "region" });
        result.displayNames.US = dnReg.of("US");
        result.displayNames.CN = dnReg.of("CN");
      } catch {}
      try {
        const dnCur = new Intl.DisplayNames(undefined, { type: "currency" });
        result.displayNames.USD = dnCur.of("USD");
        result.displayNames.EUR = dnCur.of("EUR");
      } catch {}

      return result;
    }
  },

  {
    ns: "date",
    get: () => {
      const ref = new Date(DATE_REF);
      const now = new Date();
      return {
        timezoneOffset:     now.getTimezoneOffset(),
        timezone:           Intl.DateTimeFormat().resolvedOptions().timeZone,
        toString_tz:        now.toString().replace(/^[^(]*/,"").replace(/[()]/g,""),
        toLocaleString:     ref.toLocaleString(),
        toLocaleDateString: ref.toLocaleDateString(),
        toLocaleTimeString: ref.toLocaleTimeString(),
        refYear:            ref.getFullYear(),
        refMonth:           ref.getMonth(),
        refDay:             ref.getDate(),
        refHours:           ref.getHours(),
      };
    }
  },

  {
    ns: "speech",
    get: () => {
      const voices = speechSynthesis.getVoices();
      const byName = {};
      for (const v of voices)
        byName[v.name] = { lang: v.lang, localService: v.localService, default: v.default };
      return { count: voices.length, voices: byName };
    }
  },

  {
    ns: "media",
    get: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const counts  = { audioinput:0, audiooutput:0, videoinput:0 };
        for (const d of devices) if (d.kind in counts) counts[d.kind]++;
        return { total: devices.length, ...counts };
      } catch { return { available: false }; }
    }
  },

  {
    ns: "permissions",
    get: async () => {
      const result = {};
      for (const name of PERMISSION_NAMES) {
        try { result[name] = (await navigator.permissions.query({ name })).state; }
        catch { result[name] = "unsupported"; }
      }
      return result;
    }
  },

  {
    ns: "battery",
    get: async () => {
      try {
        const b = await navigator.getBattery();
        return { charging: b.charging, level: b.level, chargingTime: b.chargingTime, dischargingTime: b.dischargingTime };
      } catch { return { available: false }; }
    }
  },

  {
    ns: "media_queries",
    get: () => {
      const result = {};
      for (const [k, q] of Object.entries(MEDIA_QUERIES))
        try { result[k] = window.matchMedia(q).matches; } catch { result[k] = null; }
      return result;
    }
  },

  {
    ns: "error_stack",
    get: () => {
      const e = new Error("probe");
      return {
        stack:      e.stack || null,
        stackLines: e.stack ? e.stack.split("\n").length : 0,
        hasAt:      e.stack ? e.stack.includes(" at ") : null,
      };
    }
  },

  {
    ns: "math_precision",
    get: () => {
      const result = {};
      for (const [key, fn] of MATH_PROBES)
        try { result[key] = fn(); } catch { result[key] = null; }
      return result;
    }
  },

  {
    ns: "plugins",
    get: () => ({
      length:    navigator.plugins.length,
      names:     Array.from(navigator.plugins).map(p => p.name),
      mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
    })
  },

  {
    ns: "gpu_fp",
    get: () => {
      if (typeof WebGLRenderingContext === "undefined") return { available: false };
      const canvas = document.createElement("canvas");
      canvas.width = 1; canvas.height = 1;
      const gl = canvas.getContext("webgl");
      if (!gl) return { available: false };

      const prec = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
      const result = {
        available:       true,
        highp_supported: prec && prec.precision > 0,
        highp_range_min: prec?.rangeMin ?? null,
        highp_range_max: prec?.rangeMax ?? null,
        highp_precision: prec?.precision ?? null,
      };

      const VS = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
      const makeFS = expr =>
        `precision highp float;uniform float u_a,u_b;void main(){` +
        `float v=clamp((${expr}+${GPU_FP_BIAS}.0)/${GPU_FP_RANGE}.0,0.,1.);` +
        `float n=floor(v*16777215.0);` +
        `gl_FragColor=vec4(floor(n/65536.0)/255.0,floor(mod(n,65536.0)/256.0)/255.0,mod(n,256.0)/255.0,1.0);}`;

      const mkShader = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (gl.deleteShader(s), null);
      };

      const vs = mkShader(gl.VERTEX_SHADER, VS);
      if (!vs) return { available: true, error: "vs_compile_failed" };

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

      const run = (expr, a, b) => {
        const fs = mkShader(gl.FRAGMENT_SHADER, makeFS(expr));
        if (!fs) return null;
        const prog = gl.createProgram();
        gl.attachShader(prog, vs); gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
          gl.deleteProgram(prog); gl.deleteShader(fs); return null;
        }
        gl.useProgram(prog);
        const pl = gl.getAttribLocation(prog, "p");
        gl.enableVertexAttribArray(pl);
        gl.vertexAttribPointer(pl, 2, gl.FLOAT, false, 0, 0);
        gl.uniform1f(gl.getUniformLocation(prog, "u_a"), a);
        gl.uniform1f(gl.getUniformLocation(prog, "u_b"), b);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        const px = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        gl.deleteProgram(prog); gl.deleteShader(fs);
        const n = px[0] * 65536 + px[1] * 256 + px[2];
        return Math.round((n / 16777215 * GPU_FP_RANGE - GPU_FP_BIAS) * 1e7) / 1e7;
      };

      result.tests = {};
      for (const [name, expr, a = 0, b = 0] of GPU_FP_TESTS)
        try { result.tests[name] = run(expr, a, b); } catch { result.tests[name] = null; }

      gl.deleteShader(vs);
      gl.deleteBuffer(buf);
      return result;
    }
  },

  {
    ns: "wasm",
    get: () => {
      const result = { available: typeof WebAssembly !== "undefined" };
      if (!result.available) return result;
      result.validate = WebAssembly.validate(new Uint8Array([0,97,115,109,1,0,0,0]));
      result.features = {};
      for (const [name, bytes] of WASM_FEATURES)
        try { result.features[name] = WebAssembly.validate(new Uint8Array(bytes)); } catch { result.features[name] = false; }
      return result;
    }
  },

  {
    ns: "webrtc",
    get: () => {
      const result = { available: typeof RTCPeerConnection !== "undefined" };
      if (!result.available) return result;
      try {
        const ac = RTCRtpSender.getCapabilities("audio");
        result.audioSendCodecs = ac?.codecs?.map(c => ({ mimeType: c.mimeType, clockRate: c.clockRate, channels: c.channels, sdpFmtpLine: c.sdpFmtpLine ?? null })) ?? null;
      } catch { result.audioSendCodecs = null; }
      try {
        const vc = RTCRtpSender.getCapabilities("video");
        result.videoSendCodecs = vc?.codecs?.map(c => ({ mimeType: c.mimeType, clockRate: c.clockRate, sdpFmtpLine: c.sdpFmtpLine ?? null })) ?? null;
      } catch { result.videoSendCodecs = null; }
      try {
        const ar = RTCRtpReceiver.getCapabilities("audio");
        result.audioRecvCodecs = ar?.codecs?.map(c => ({ mimeType: c.mimeType, clockRate: c.clockRate, channels: c.channels })) ?? null;
      } catch { result.audioRecvCodecs = null; }
      try {
        const vr = RTCRtpReceiver.getCapabilities("video");
        result.videoRecvCodecs = vr?.codecs?.map(c => ({ mimeType: c.mimeType, clockRate: c.clockRate })) ?? null;
      } catch { result.videoRecvCodecs = null; }
      return result;
    }
  },

  {
    ns: "css",
    get: () => {
      const result = { supports: {}, computed: {} };

      for (const probe of CSS_SUPPORTS_PROBES) {
        const [key, ...args] = probe;
        try { result.supports[key] = CSS.supports(...args); } catch { result.supports[key] = null; }
      }

      const el = document.createElement("div");
      el.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;visibility:hidden";
      document.body.appendChild(el);
      const cs = getComputedStyle(el);
      for (const prop of CSS_COMPUTED_PROBES) {
        try {
          const v = cs.getPropertyValue(prop);
          result.computed[prop] = v !== "" ? v : null;
        } catch { result.computed[prop] = null; }
      }
      document.body.removeChild(el);

      return result;
    }
  },

  {
    ns: "keyboard",
    get: async () => {
      const result = { available: typeof navigator.keyboard !== "undefined" };
      if (!result.available) return result;
      try {
        const map = await navigator.keyboard.getLayoutMap();
        result.size = map.size;
        result.layout = {};
        for (const [code, key] of map) result.layout[code] = key;
      } catch(e) { result.error = e?.name ?? "error"; }
      return result;
    }
  },

  {
    ns: "drm",
    get: async () => {
      const result = { available: typeof navigator.requestMediaKeySystemAccess === "function" };
      if (!result.available) return result;

      result.systems = {};
      for (const [name, keySystem] of DRM_KEY_SYSTEMS) {
        try {
          const access = await navigator.requestMediaKeySystemAccess(keySystem, DRM_BASE_CONFIGS);
          const cfg = access.getConfiguration();
          result.systems[name] = {
            supported:    true,
            initDataTypes: cfg.initDataTypes ?? null,
            videoCodecs:   cfg.videoCapabilities?.map(c => c.contentType) ?? null,
            audioCodecs:   cfg.audioCapabilities?.map(c => c.contentType) ?? null,
          };
        } catch { result.systems[name] = { supported: false }; }
      }

      if (result.systems.widevine?.supported) {
        result.widevine_robustness = {};
        for (const [label, robustness] of DRM_WIDEVINE_ROBUSTNESS) {
          try {
            await navigator.requestMediaKeySystemAccess("com.widevine.alpha", [{
              initDataTypes: ["cenc"],
              videoCapabilities: [{ contentType: 'video/mp4; codecs="avc1.42E01E"', robustness }],
            }]);
            result.widevine_robustness[label] = true;
          } catch { result.widevine_robustness[label] = false; }
        }
      }

      return result;
    }
  },

  {
    ns: "chrome",
    get: () => {
      if (typeof window.chrome === "undefined") return { available: false };
      const r = { available: true };
      try { if (typeof chrome.loadTimes === "function") r.loadTimes = chrome.loadTimes(); } catch {}
      try { if (typeof chrome.csi       === "function") r.csi       = chrome.csi();       } catch {}
      try { r.runtime = chrome.runtime ?? null; } catch {}
      try { r.app     = chrome.app     ?? null; } catch {}
      return r;
    }
  },

  {
    ns: "apis",
    get: () => ({
      bluetooth:          typeof navigator.bluetooth !== "undefined",
      barcodeDetector:    typeof BarcodeDetector !== "undefined",
      webShare:           typeof navigator.share === "function",
      credentials:        typeof navigator.credentials !== "undefined",
      paymentRequest:     typeof PaymentRequest !== "undefined",
      usb:                typeof navigator.usb !== "undefined",
      serial:             typeof navigator.serial !== "undefined",
      nfc:                typeof NDEFReader !== "undefined",
      hid:                typeof navigator.hid !== "undefined",
      fileSystemAccess:   typeof window.showOpenFilePicker === "function",
      eyeDropper:         typeof EyeDropper !== "undefined",
      contactPicker:      typeof navigator.contacts !== "undefined",
      xr:                 typeof navigator.xr !== "undefined",
      webAuthn:           typeof PublicKeyCredential !== "undefined",
      speechRecognition:  typeof (window.SpeechRecognition ?? window.webkitSpeechRecognition) !== "undefined",
      mediaCapabilities:  typeof navigator.mediaCapabilities !== "undefined",
      deviceOrientation:  typeof DeviceOrientationEvent !== "undefined",
      deviceMotion:       typeof DeviceMotionEvent !== "undefined",
      wakeLock:           typeof navigator.wakeLock !== "undefined",
      scheduler:          typeof window.scheduler !== "undefined",
      idleDetector:       typeof window.IdleDetector !== "undefined",
      windowManagement:   typeof window.getScreenDetails === "function",
      screenOrientation:  typeof screen.orientation !== "undefined",
      pointerLock:        typeof document.pointerLockElement !== "undefined",
      pictureInPicture:   typeof document.pictureInPictureEnabled !== "undefined",
      presentation:       typeof navigator.presentation !== "undefined",
      computePressure:    typeof PressureObserver !== "undefined",
      webTransport:       typeof WebTransport !== "undefined",
      webCodecs:          typeof VideoEncoder !== "undefined",
      clipboard:          typeof navigator.clipboard !== "undefined",
      locks:              typeof navigator.locks !== "undefined",
      backgroundSync:     typeof SyncManager !== "undefined",
      periodicSync:       typeof PeriodicSyncManager !== "undefined",
      storageFoundation:  typeof navigator.storage !== "undefined",
      sharedStorage:      typeof window.sharedStorage !== "undefined",
      topics:             typeof document.browsingTopics === "function",
      fledge:             typeof navigator.runAdAuction === "function",
      trustToken:         typeof document.hasTrustToken === "function",
      privateStateToken:  typeof document.hasPrivateToken === "function",
    })
  },
];
