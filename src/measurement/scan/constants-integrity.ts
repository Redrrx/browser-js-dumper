import { probeNavigator } from './utils.js';
export const INTEGRITY_NATIVE_FNS: [string, () => unknown][] = [
  ['Function.prototype.toString', () => Function.prototype.toString],
  ['Object.getOwnPropertyDescriptor', () => Object.getOwnPropertyDescriptor],
  ['Object.defineProperty', () => Object.defineProperty],
  ['document.createElement', () => document.createElement],
  ['window.fetch', () => window.fetch],
  ['XMLHttpRequest.open', () => XMLHttpRequest.prototype.open],
  ['JSON.stringify', () => JSON.stringify],
  ['JSON.parse', () => JSON.parse],
  ['Array.prototype.push', () => Array.prototype.push],
  ['Proxy', () => Proxy],
  ['Reflect.get', () => Reflect.get],
  ['history.pushState', () => history.pushState],
  ['performance.now', () => performance.now],
  ['crypto.getRandomValues', () => crypto.getRandomValues],
  ['navigator.getBattery', () => probeNavigator().getBattery],
  ['navigator.permissions.query', () => navigator.permissions?.query],
  ['CanvasRenderingContext2D.getImageData', () => CanvasRenderingContext2D.prototype.getImageData],
  ['CanvasRenderingContext2D.fillText', () => CanvasRenderingContext2D.prototype.fillText],
  ['WebGLRenderingContext.getParameter', () => WebGLRenderingContext?.prototype?.getParameter],
  ['WebGLRenderingContext.getExtension', () => WebGLRenderingContext?.prototype?.getExtension],
  ['speechSynthesis.getVoices', () => speechSynthesis.getVoices],
  ['navigator.mediaDevices.enumerateDevices', () => navigator.mediaDevices?.enumerateDevices],
];

export const INTEGRITY_PROTO_PAIRS: [string, () => [object, object]][] = [
  ['navigator', () => [navigator, Navigator.prototype]],
  ['document', () => [document, Document.prototype]],
  ['location', () => [location, Location.prototype]],
  ['screen', () => [screen, Screen.prototype]],
  ['history', () => [history, History.prototype]],
  ['performance', () => [performance, Performance.prototype]],
];

export const integrityDescriptors = (): [object, string][] => [
  [Navigator.prototype, 'userAgent'],
  [Navigator.prototype, 'hardwareConcurrency'],
  [Navigator.prototype, 'language'],
  [Navigator.prototype, 'platform'],
  [Navigator.prototype, 'cookieEnabled'],
  [Navigator.prototype, 'onLine'],
  [Screen.prototype, 'width'],
  [Screen.prototype, 'height'],
  [Screen.prototype, 'colorDepth'],
  [Screen.prototype, 'pixelDepth'],
];
