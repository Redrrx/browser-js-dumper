export type ScanEntry = { type: string; display: string; [key: string]: unknown };
export type ScanMap = Map<string, ScanEntry>;
export type Progress = (namespace: string, count: number) => void;
export interface Activator {
  ns: string;
  get: () => unknown;
}
export type ProbeRecord = Record<string, unknown>;
export type ProbeSetter = (path: string, value: unknown) => void;

export interface BatteryInfo {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}
interface Brand {
  brand: string;
  version: string;
}
interface EntropyValues {
  architecture?: string;
  bitness?: string;
  model?: string;
  platform?: string;
  platformVersion?: string;
  uaFullVersion?: string;
  wow64?: boolean;
  formFactor?: string | string[];
  fullVersionList?: Brand[];
}
interface GPUAdapterProbe {
  isFallbackAdapter?: boolean;
  info?: GPUInfo;
  requestAdapterInfo?: () => Promise<GPUInfo>;
  features: Iterable<string>;
  limits: object;
}
interface GPUInfo {
  vendor: string;
  architecture: string;
  device: string;
  description: string;
}
export type ProbeNavigator = Omit<Navigator, 'gpu'> & {
  getBattery: () => Promise<BatteryInfo>;
  keyboard?: { getLayoutMap: () => Promise<Map<string, string>> };
  userAgentData?: {
    mobile: boolean;
    brands?: Brand[];
    getHighEntropyValues: (hints: string[]) => Promise<EntropyValues>;
  };
  gpu?: {
    getPreferredCanvasFormat: () => string;
    requestAdapter: () => Promise<GPUAdapterProbe | null>;
  };
};
export interface LocalFont {
  family: string;
  style: string;
  fullName: string;
  postscriptName: string;
}
export type ProbeWindow = Window &
  typeof globalThis & {
    queryLocalFonts?: () => Promise<LocalFont[]>;
    chrome?: { loadTimes?: () => unknown; csi?: () => unknown; runtime?: unknown; app?: unknown };
  };
export interface GLResult extends ProbeRecord {
  available: boolean;
  params: ProbeRecord;
  extensions: string[] | null;
  extensionData?: Record<string, ProbeRecord>;
  webgl2?: GLResult & { extensionData: Record<string, ProbeRecord> };
}
