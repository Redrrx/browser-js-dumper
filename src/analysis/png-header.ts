export const MAX_PNG_PIXELS = 16_777_216;
export const MAX_PNG_DIMENSION = 16_384;
export const MAX_PNG_URL_LENGTH = 24_000_000;
const PREFIX = 'data:image/png;base64,';

export function validatePNGHeader(source: string): { width: number; height: number } {
  if (source.length > MAX_PNG_URL_LENGTH)
    throw new Error('Embedded PNG exceeds the encoded size limit');
  if (!source.startsWith(PREFIX)) throw new Error('Only embedded PNG images can be analyzed');
  const encoded = source.slice(PREFIX.length);
  if (encoded.length < 44 || encoded.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))
    throw new Error('Invalid or truncated PNG base64');
  const header = Uint8Array.from(atob(encoded.slice(0, 44)), (char) => char.charCodeAt(0));
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => header[index] === byte))
    throw new Error('Invalid PNG signature');
  const view = new DataView(header.buffer);
  if (view.getUint32(8) !== 13 || view.getUint32(12) !== 0x49484452)
    throw new Error('PNG must begin with a 13-byte IHDR');
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  if (
    !width ||
    !height ||
    width > MAX_PNG_DIMENSION ||
    height > MAX_PNG_DIMENSION ||
    width * height > MAX_PNG_PIXELS
  ) {
    throw new Error(
      `PNG dimensions exceed the limit: ${width}×${height}; use 1–${MAX_PNG_DIMENSION} pixels per axis and at most ${MAX_PNG_PIXELS} pixels`,
    );
  }
  validateEncoding(header);
  validateChecksum(header, view.getUint32(29));
  return { width, height };
}

function validateEncoding(header: Uint8Array) {
  const depths: Readonly<Record<number, readonly number[]>> = {
    0: [1, 2, 4, 8, 16],
    2: [8, 16],
    3: [1, 2, 4, 8],
    4: [8, 16],
    6: [8, 16],
  };
  if (
    !depths[header[25]!]?.includes(header[24]!) ||
    header[26] !== 0 ||
    header[27] !== 0 ||
    header[28]! > 1
  )
    throw new Error('Invalid PNG IHDR encoding');
}

function validateChecksum(header: Uint8Array, expected: number) {
  let crc = 0xffffffff;
  for (const byte of header.subarray(12, 29)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      let mask = 0;
      if (crc & 1) mask = 0xedb88320;
      crc = (crc >>> 1) ^ mask;
    }
  }
  if ((crc ^ 0xffffffff) >>> 0 !== expected) throw new Error('Invalid PNG IHDR checksum');
}
