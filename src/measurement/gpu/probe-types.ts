export interface ColorSpaceResult {
  p3_supported?: boolean;
  p3_red_srgb?: number[];
  gray128?: number[] | null;
  gray128_delta?: number | null;
  alpha_half?: number | null;
  alpha_half_delta?: number;
  webgl_srgb?: boolean;
  createimagedata_colorspace?: boolean;
}
export interface OffscreenResult {
  supported: boolean;
  main_ms?: number;
  worker_ms?: number | null;
  worker_error?: string;
  ratio?: number;
}
