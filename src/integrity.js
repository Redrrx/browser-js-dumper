ACTIVATORS.push({
  ns: "integrity",
  get: () => {
    const descToString = Object.getOwnPropertyDescriptor(Function.prototype, "toString")?.value;
    const nativeStr = fn => {
      if (typeof fn !== "function") return null;
      try { return (descToString || Function.prototype.toString).call(fn); } catch { return null; }
    };
    const isNative = fn => {
      const s = nativeStr(fn);
      return s === null ? null : s.includes("[native code]");
    };
    const descInfo = (obj, key) => {
      try {
        const d = Object.getOwnPropertyDescriptor(obj, key);
        if (!d) return null;
        return { configurable: d.configurable, writable: d.writable, enumerable: d.enumerable, hasGet: !!d.get, hasSet: !!d.set };
      } catch { return null; }
    };

    const native = {};
    for (const [label, getFn] of INTEGRITY_NATIVE_FNS) {
      try { native[label] = isNative(getFn()); } catch { native[label] = null; }
    }

    const proto = {};
    for (const [label, getPair] of INTEGRITY_PROTO_PAIRS) {
      try {
        const [obj, expectedProto] = getPair();
        proto[label] = Object.getPrototypeOf(obj) === expectedProto;
      } catch { proto[label] = null; }
    }

    const descriptors = {};
    for (const [obj, key] of INTEGRITY_DESCRIPTORS) {
      try { descriptors[obj.constructor?.name + "." + key] = descInfo(obj, key); } catch {}
    }

    const ownKeyDelta = {};
    const nativeNavKeys   = Object.getOwnPropertyNames(Navigator.prototype).length;
    const nativeScreenKeys= Object.getOwnPropertyNames(Screen.prototype).length;
    const actualNavKeys   = Object.getOwnPropertyNames(navigator).length;
    ownKeyDelta["Navigator.prototype.keys"]  = nativeNavKeys;
    ownKeyDelta["Screen.prototype.keys"]     = nativeScreenKeys;
    ownKeyDelta["navigator.own.keys"]        = actualNavKeys;
    ownKeyDelta["navigator.own.unexpected"]  = actualNavKeys > 0;

    const toStringTag = {};
    for (const [label, obj] of [
      ["window",      window],
      ["navigator",   navigator],
      ["document",    document],
      ["location",    location],
      ["screen",      screen],
      ["performance", performance],
    ]) {
      try { toStringTag[label] = Object.prototype.toString.call(obj); } catch { toStringTag[label] = null; }
    }

    const consistency = {};
    try { consistency["navigator.userAgent.value"]  = navigator.userAgent; } catch {}
    try { consistency["navigator.userAgent.desc"]   = Object.getOwnPropertyDescriptor(Navigator.prototype, "userAgent")?.get?.call(navigator); } catch {}
    consistency["userAgent.matches"] = consistency["navigator.userAgent.value"] === consistency["navigator.userAgent.desc"];

    try { consistency["screen.width.value"]  = screen.width; } catch {}
    try { consistency["screen.width.desc"]   = Object.getOwnPropertyDescriptor(Screen.prototype, "width")?.get?.call(screen); } catch {}
    consistency["screen.width.matches"] = consistency["screen.width.value"] === consistency["screen.width.desc"];

    return {
      webdriver:   navigator.webdriver,
      native,
      proto,
      descriptors,
      ownKeyDelta,
      toStringTag,
      consistency,
    };
  }
});
