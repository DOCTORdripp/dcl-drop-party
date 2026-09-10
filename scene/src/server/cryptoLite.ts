import { encodeUtf8 as encodeUtf8Official } from "@dcl/sdk/internal/utf8";

/**
 * Isolate-safe SHA-256 / HMAC.
 * UTF-8 uses the official SDK codec (`@dcl/sdk/internal/utf8`), not a host TextEncoder.
 * SHA-256/HMAC stay the same algorithm as Convex `lib/security/hash.ts`.
 */
export function encodeUtf8(data: string): Uint8Array {
  return encodeUtf8Official(data);
}

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4,
  0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe,
  0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f,
  0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc,
  0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
  0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116,
  0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7,
  0xc67178f2,
];

function rotr(n: number, x: number): number {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Bytes(message: Uint8Array): Uint8Array {
  const bitLen = message.length * 8;
  const paddedLen = (message.length + 1 + 8 + 63) & ~63;
  const padded = new Uint8Array(paddedLen);
  padded.set(message);
  padded[message.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0);
  let h0 = 0x6a09e667,
    h1 = 0xbb67ae85,
    h2 = 0x3c6ef372,
    h3 = 0xa54ff53a;
  let h4 = 0x510e527f,
    h5 = 0x9b05688c,
    h6 = 0x1f83d9ab,
    h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(7, w[i - 15]!) ^ rotr(18, w[i - 15]!) ^ (w[i - 15]! >>> 3);
      const s1 = rotr(17, w[i - 2]!) ^ rotr(19, w[i - 2]!) ^ (w[i - 2]! >>> 10);
      w[i] = (w[i - 16]! + s0 + w[i - 7]! + s1) >>> 0;
    }
    let a = h0,
      b = h1,
      c = h2,
      d = h3,
      e = h4,
      f = h5,
      g = h6,
      h = h7;
    for (let i = 0; i < 64; i++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i]! + w[i]!) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  outView.setUint32(20, h5);
  outView.setUint32(24, h6);
  outView.setUint32(28, h7);
  return out;
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function sha256Hex(data: string): string {
  return toHex(sha256Bytes(encodeUtf8(data)));
}

export function hmacSha256Bytes(key: Uint8Array, message: Uint8Array): Uint8Array {
  const blockSize = 64;
  const keyBytes = key.length > blockSize ? sha256Bytes(key) : key;
  const keyPad = new Uint8Array(blockSize);
  keyPad.set(keyBytes);
  const inner = new Uint8Array(blockSize + message.length);
  const outerPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    inner[i] = keyPad[i]! ^ 0x36;
    outerPad[i] = keyPad[i]! ^ 0x5c;
  }
  inner.set(message, blockSize);
  const innerHash = sha256Bytes(inner);
  const outer = new Uint8Array(blockSize + innerHash.length);
  outer.set(outerPad);
  outer.set(innerHash, blockSize);
  return sha256Bytes(outer);
}

export function hmacSha256Hex(secret: string, message: string): string {
  return toHex(hmacSha256Bytes(encodeUtf8(secret), encodeUtf8(message)));
}

export function signServiceRequest(
  secret: string,
  args: { method: string; path: string; timestamp: number; nonce: string; body: string },
): string {
  return hmacSha256Hex(
    secret,
    ["v1", args.method.toUpperCase(), args.path, String(args.timestamp), args.nonce, sha256Hex(args.body)].join("\n"),
  );
}

export type RandomSource = (byteLength: number) => Uint8Array;

type HostCrypto = { getRandomValues: (array: Uint8Array) => Uint8Array };

function hostCrypto(): HostCrypto | undefined {
  const candidate = (globalThis as { crypto?: HostCrypto }).crypto;
  if (candidate && typeof candidate.getRandomValues === "function") {
    return candidate;
  }
  return undefined;
}

/**
 * Cryptographic randomness for the QuickJS isolate.
 * `@dcl/js-runtime` does not declare Web Crypto or Node crypto.
 * Prefer a host `crypto.getRandomValues` if the isolate actually provides one.
 * Otherwise HMAC-DRBG keyed by the trusted-service secret (unpredictable
 * without that secret; unique via counter + timestamp).
 */
export function createHmacDrbg(
  secret: string,
  options?: { allowHostCrypto?: boolean },
): RandomSource {
  if (secret.length < 16) {
    throw new Error("INVALID_INTERACTION");
  }
  const host = options?.allowHostCrypto === false ? undefined : hostCrypto();
  if (host) {
    return (byteLength: number) => {
      const out = new Uint8Array(byteLength);
      host.getRandomValues(out);
      return out;
    };
  }

  let key = encodeUtf8(secret);
  let value = hmacSha256Bytes(key, encodeUtf8(`dropparty-drbg-v0|${Date.now()}`));
  key = hmacSha256Bytes(key, concatBytes(value, encodeUtf8(`|reseed|${Date.now()}`)));
  let counter = 0;
  return (byteLength: number) => {
    const out = new Uint8Array(byteLength);
    let offset = 0;
    while (offset < byteLength) {
      counter += 1;
      value = hmacSha256Bytes(key, concatBytes(value, encodeUtf8(`|${counter}|${Date.now()}`)));
      const take = Math.min(value.length, byteLength - offset);
      out.set(value.subarray(0, take), offset);
      offset += take;
      key = hmacSha256Bytes(key, concatBytes(value, encodeUtf8(`|update|${counter}`)));
    }
    return out;
  };
}

export function randomHex(byteLength: number, randomBytes: RandomSource): string {
  if (byteLength <= 0) {
    throw new Error("INVALID_INTERACTION");
  }
  return toHex(randomBytes(byteLength));
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}
