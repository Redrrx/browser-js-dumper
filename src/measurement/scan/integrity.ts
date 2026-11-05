import {
  INTEGRITY_NATIVE_FNS,
  INTEGRITY_PROTO_PAIRS,
  integrityDescriptors,
} from './constants-integrity.js';
import { constructorName, errorMessage } from './utils.js';
import type { Activator, ProbeRecord } from './types.js';
function recordConsistency(
  consistency: ProbeRecord,
  path: string,
  matchKey: string,
  readValue: () => unknown,
  prototype: object,
  key: string,
  receiver: object,
): void {
  let valueRead = false;
  let descriptorRead = false;
  try {
    consistency[path + '.value'] = readValue();
    valueRead = true;
  } catch (e) {
    consistency[path + '.valueError'] = errorMessage(e);
  }
  try {
    const getter = Object.getOwnPropertyDescriptor(prototype, key)?.get;
    consistency[path + '.desc'] = getter?.call(receiver);
    descriptorRead = typeof getter === 'function';
  } catch (e) {
    consistency[path + '.descError'] = errorMessage(e);
  }
  consistency[matchKey] = null;
  if (valueRead && descriptorRead) {
    consistency[matchKey] = consistency[path + '.value'] === consistency[path + '.desc'];
  }
}

export const integrityActivator: Activator = {
  ns: 'integrity',
  get: () => {
    const descToString: unknown = Object.getOwnPropertyDescriptor(
      Function.prototype,
      'toString',
    )?.value;
    const nativeStr = (fn: unknown): string | null => {
      if (typeof fn !== 'function') return null;
      const stringify = (descToString ||
        Function.prototype.toString) as typeof Function.prototype.toString;
      try {
        return stringify.call(fn);
      } catch {
        return null;
      }
    };
    const isNative = (fn: unknown) => {
      const s = nativeStr(fn);
      if (s === null) return null;
      return s.includes('[native code]');
    };
    const descInfo = (obj: object, key: string) => {
      try {
        const d = Object.getOwnPropertyDescriptor(obj, key);
        if (!d) return null;
        return {
          configurable: d.configurable,
          writable: d.writable,
          enumerable: d.enumerable,
          hasGet: !!d.get,
          hasSet: !!d.set,
        };
      } catch {
        return null;
      }
    };

    const native: ProbeRecord = {};
    for (const [label, getFn] of INTEGRITY_NATIVE_FNS) {
      try {
        native[label] = isNative(getFn());
      } catch {
        native[label] = null;
      }
    }

    const proto: ProbeRecord = {};
    for (const [label, getPair] of INTEGRITY_PROTO_PAIRS) {
      try {
        const [obj, expectedProto] = getPair();
        proto[label] = Object.getPrototypeOf(obj) === expectedProto;
      } catch {
        proto[label] = null;
      }
    }

    const descriptors: ProbeRecord = {};
    for (const [obj, key] of integrityDescriptors()) {
      try {
        descriptors[constructorName(obj) + '.' + key] = descInfo(obj, key);
      } catch (e) {
        descriptors['unknown.' + key + '.error'] = errorMessage(e);
      }
    }

    const ownKeyDelta: ProbeRecord = {};
    const nativeNavKeys = Object.getOwnPropertyNames(Navigator.prototype).length;
    const nativeScreenKeys = Object.getOwnPropertyNames(Screen.prototype).length;
    const actualNavKeys = Object.getOwnPropertyNames(navigator).length;
    ownKeyDelta['Navigator.prototype.keys'] = nativeNavKeys;
    ownKeyDelta['Screen.prototype.keys'] = nativeScreenKeys;
    ownKeyDelta['navigator.own.keys'] = actualNavKeys;
    ownKeyDelta['navigator.own.unexpected'] = actualNavKeys > 0;

    const toStringTag: ProbeRecord = {};
    for (const [label, obj] of [
      ['window', window],
      ['navigator', navigator],
      ['document', document],
      ['location', location],
      ['screen', screen],
      ['performance', performance],
    ] as [string, object][]) {
      try {
        toStringTag[label] = Object.prototype.toString.call(obj);
      } catch {
        toStringTag[label] = null;
      }
    }

    const consistency: ProbeRecord = {};
    recordConsistency(
      consistency,
      'navigator.userAgent',
      'userAgent.matches',
      () => navigator.userAgent,
      Navigator.prototype,
      'userAgent',
      navigator,
    );
    recordConsistency(
      consistency,
      'screen.width',
      'screen.width.matches',
      () => screen.width,
      Screen.prototype,
      'width',
      screen,
    );

    return {
      webdriver: navigator.webdriver,
      native,
      proto,
      descriptors,
      ownKeyDelta,
      toStringTag,
      consistency,
    };
  },
};
