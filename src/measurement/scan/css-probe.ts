import type { ScanMap, Progress, ProbeSetter } from './types.js';
import { YIELD, errorMessage } from './utils.js';
import { cssProbeEffects } from './css-effects.js';
import {
  CSS_PROBE_ELEMENTS,
  CSS_PROBE_INPUT_TYPES,
  CSS_SYSTEM_COLORS,
  CSS_COLOR_FORMATS,
  CSS_UNITS,
  CSS_TRANSFORMS,
  CSS_FONT_STACKS,
  CSS_MEDIA_EXTRA,
} from './constants-css.js';
export async function cssProbeAll(map: ScanMap, onProgress?: Progress): Promise<void> {
  const set = (k: string, v: unknown) => {
    let t = 'string';
    if (typeof v === 'boolean') t = 'boolean';
    if (typeof v === 'number') {
      t = 'float';
      if (Number.isInteger(v)) t = 'integer';
    }
    map.set(k, { type: t, display: String(v) });
  };

  const host = document.createElement('div');
  host.style.cssText =
    'position:fixed;left:-99999px;top:0;width:1024px;height:auto;' +
    'visibility:hidden;contain:layout style;font:16px monospace';
  document.body.appendChild(host);

  try {
    onProgress?.('css: elements', map.size);
    const mk = (tag: string, type?: string): HTMLElement => {
      const el = document.createElement(tag);
      if (el instanceof HTMLInputElement && type) el.type = type;
      if (el instanceof HTMLImageElement) el.alt = 'x';
      host.appendChild(el);
      return el;
    };
    const { baseCS, probeEls } = await probeElements(mk, host, set, map, onProgress);

    onProgress?.('css: supports', map.size);
    for (let i = 0; i < baseCS.length; i++) set('css_supports.prop.' + baseCS[i], true);
    await YIELD();

    probeValues(mk, set, map, onProgress);

    await YIELD();

    onProgress?.('css: metrics', map.size);
    probeMetrics(mk, probeEls, set);

    onProgress?.('css: media', map.size);
    for (const [k, q] of Object.entries(CSS_MEDIA_EXTRA)) {
      try {
        set('css_media.' + k, window.matchMedia(q).matches);
      } catch {
        set('css_media.' + k, 'error');
      }
    }

    await YIELD();
    onProgress?.('css: effects', map.size);
    cssProbeEffects(set);
  } catch (e) {
    set('css_probe.error', errorMessage(e));
  } finally {
    host.remove();
  }
}

type MakeElement = (tag: string, type?: string) => HTMLElement;

async function probeElements(
  mk: MakeElement,
  host: HTMLElement,
  set: ProbeSetter,
  map: ScanMap,
  onProgress?: Progress,
) {
  const baseEl = mk('div');
  const probeEls: [string, HTMLElement][] = [];
  for (const tag of CSS_PROBE_ELEMENTS) probeEls.push(['css_el_' + tag, mk(tag)]);
  for (const t of CSS_PROBE_INPUT_TYPES)
    probeEls.push(['css_el_input_' + t.replace(/-/g, '_'), mk('input', t)]);

  void host.offsetHeight;

  const baseCS = getComputedStyle(baseEl);
  const baseMap = Object.create(null) as Record<string, string>;
  for (let i = 0; i < baseCS.length; i++) {
    const p = baseCS.item(i);
    baseMap[p] = baseCS.getPropertyValue(p);
  }
  for (const p in baseMap) set('css_el__baseline.' + p, baseMap[p]);

  let n = 0;
  for (const [ns, el] of probeEls) {
    const cs = getComputedStyle(el);
    for (let i = 0; i < cs.length; i++) {
      const p = cs.item(i);
      const v = cs.getPropertyValue(p);
      if (v !== baseMap[p]) set(ns + '.' + p, v);
    }
    if (++n % 12 === 0) {
      onProgress?.('css: ' + ns, map.size);
      await YIELD();
    }
  }

  return { baseCS, probeEls };
}

function probeValues(mk: MakeElement, set: ProbeSetter, map: ScanMap, onProgress?: Progress): void {
  const probe = mk('div');

  for (const u of CSS_UNITS) {
    probe.style.width = u;
    set('css_units.' + u, getComputedStyle(probe).width);
  }
  probe.style.width = '';

  for (const c of CSS_SYSTEM_COLORS) {
    probe.style.color = '';
    probe.style.color = c;
    set('css_colors.system.' + c, getComputedStyle(probe).color);
  }
  for (const fmt of CSS_COLOR_FORMATS) {
    probe.style.color = '';
    probe.style.color = fmt;
    const out = getComputedStyle(probe).color;
    set('css_colors.fmt.' + fmt.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, ''), out);
  }
  probe.style.color = '';

  onProgress?.('css: theme', map.size);
  const themeEl = mk('div');
  const tcs = getComputedStyle(themeEl);
  for (const scheme of ['light', 'dark']) {
    themeEl.style.colorScheme = scheme;
    for (const c of CSS_SYSTEM_COLORS) {
      themeEl.style.color = '';
      themeEl.style.color = c;
      set('css_theme.' + scheme + '.' + c, tcs.color);
    }
  }
  themeEl.style.colorScheme = '';
  themeEl.style.color = '';
  let scheme = 'light';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) scheme = 'dark';
  set('css_theme.current.prefers_color_scheme', scheme);
  set('css_theme.current.forced_colors', window.matchMedia('(forced-colors: active)').matches);

  for (const t of CSS_TRANSFORMS) {
    probe.style.transform = t;
    set(
      'css_transform.' + t.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, ''),
      getComputedStyle(probe).transform,
    );
  }
  probe.style.transform = '';
}

function probeMetrics(mk: MakeElement, probeEls: [string, HTMLElement][], set: ProbeSetter): void {
  const meas = mk('span');
  meas.style.cssText = 'position:absolute;white-space:nowrap;font-size:64px;line-height:normal';
  meas.textContent = 'mmMwWiIl10AgfiflÅ中';
  for (const fam of CSS_FONT_STACKS) {
    meas.style.fontFamily = fam;
    void meas.offsetWidth;
    const r = meas.getBoundingClientRect();
    set(
      'css_metrics.font.' + fam.replace(/[^a-z0-9]+/gi, '_') + '.w',
      Math.round(r.width * 100) / 100,
    );
    set(
      'css_metrics.font.' + fam.replace(/[^a-z0-9]+/gi, '_') + '.h',
      Math.round(r.height * 100) / 100,
    );
  }

  for (const [ns, el] of probeEls) {
    if (!/^css_el_(input|select|textarea|button|progress|meter)/.test(ns)) continue;
    const r = el.getBoundingClientRect();
    if (r.width || r.height) {
      set('css_metrics.control.' + ns.slice(7) + '.w', Math.round(r.width * 100) / 100);
      set('css_metrics.control.' + ns.slice(7) + '.h', Math.round(r.height * 100) / 100);
    }
  }

  const sc = mk('div');
  sc.style.cssText = 'width:100px;height:100px;overflow:scroll';
  sc.appendChild(document.createElement('div')).style.height = '300px';
  void sc.offsetHeight;
  set('css_metrics.scrollbar_width', sc.offsetWidth - sc.clientWidth);
  set('css_metrics.device_pixel_ratio', window.devicePixelRatio);
}
