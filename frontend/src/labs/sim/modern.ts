// Modern ciphers for the cryptography lab, written out in full so students
// can watch every step: XOR / one-time pad, DES, AES-128, RC4, RSA,
// Diffie–Hellman and SHA-256. They are faithful to the standards (the tests
// check the official vectors) but are teaching code: not constant-time, no
// padding schemes. Never use them to protect real data.

// ── Bytes ───────────────────────────────────────────────────────────────

export const textToBytes = (text: string) => [...new TextEncoder().encode(text)];

export function bytesToText(bytes: number[]) {
  return new TextDecoder("utf-8", { fatal: false }).decode(Uint8Array.from(bytes));
}

export const hex = (bytes: number[], sep = " ") => bytes.map((b) => b.toString(16).padStart(2, "0")).join(sep);

export function hexToBytes(text: string): number[] | null {
  const clean = text.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (clean.length % 2 || !/^[0-9a-f]*$/i.test(clean)) return null;
  return (clean.match(/../g) ?? []).map((h) => parseInt(h, 16));
}

export const bits = (byte: number) => byte.toString(2).padStart(8, "0");

/** XOR with a repeating key — a one-time pad when the key is random and as long as the text. */
export function xorBytes(data: number[], key: number[]) {
  if (!key.length) return [...data];
  return data.map((b, i) => b ^ key[i % key.length]);
}

// ── RC4 (1987) ──────────────────────────────────────────────────────────

/** Key scheduling: the 256-byte state after mixing in the key. */
export function rc4Schedule(key: number[]) {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

export interface Rc4Step {
  i: number;
  j: number;
  /** Keystream byte produced at this step. */
  k: number;
  state: number[];
}

/** Generates `length` keystream bytes, keeping each step for the animation. */
export function rc4Keystream(key: number[], length: number) {
  const s = rc4Schedule(key.length ? key : [0]);
  const steps: Rc4Step[] = [];
  let i = 0;
  let j = 0;
  for (let n = 0; n < length; n++) {
    i = (i + 1) & 255;
    j = (j + s[i]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
    steps.push({ i, j, k: s[(s[i] + s[j]) & 255], state: [...s] });
  }
  return steps;
}

export function rc4(data: number[], key: number[]) {
  const stream = rc4Keystream(key, data.length);
  return data.map((b, n) => b ^ stream[n].k);
}

// ── DES (1977) ──────────────────────────────────────────────────────────
// Bits are kept as arrays of 0/1, numbered 1..64 like the standard’s tables.

const IP = [
  58, 50, 42, 34, 26, 18, 10, 2, 60, 52, 44, 36, 28, 20, 12, 4, 62, 54, 46, 38, 30, 22, 14, 6, 64, 56, 48, 40, 32, 24, 16, 8,
  57, 49, 41, 33, 25, 17, 9, 1, 59, 51, 43, 35, 27, 19, 11, 3, 61, 53, 45, 37, 29, 21, 13, 5, 63, 55, 47, 39, 31, 23, 15, 7,
];
const FP = IP.map((_, i) => IP.indexOf(i + 1) + 1);
const E = [
  32, 1, 2, 3, 4, 5, 4, 5, 6, 7, 8, 9, 8, 9, 10, 11, 12, 13, 12, 13, 14, 15, 16, 17, 16, 17, 18, 19, 20, 21, 20, 21, 22, 23, 24,
  25, 24, 25, 26, 27, 28, 29, 28, 29, 30, 31, 32, 1,
];
const P = [16, 7, 20, 21, 29, 12, 28, 17, 1, 15, 23, 26, 5, 18, 31, 10, 2, 8, 24, 14, 32, 27, 3, 9, 19, 13, 30, 6, 22, 11, 4, 25];
const PC1 = [
  57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31,
  23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
];
const PC2 = [
  14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45,
  33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32,
];
const SHIFTS = [1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1];
const SBOX = [
  [14, 4, 13, 1, 2, 15, 11, 8, 3, 10, 6, 12, 5, 9, 0, 7, 0, 15, 7, 4, 14, 2, 13, 1, 10, 6, 12, 11, 9, 5, 3, 8, 4, 1, 14, 8, 13, 6, 2, 11, 15, 12, 9, 7, 3, 10, 5, 0, 15, 12, 8, 2, 4, 9, 1, 7, 5, 11, 3, 14, 10, 0, 6, 13],
  [15, 1, 8, 14, 6, 11, 3, 4, 9, 7, 2, 13, 12, 0, 5, 10, 3, 13, 4, 7, 15, 2, 8, 14, 12, 0, 1, 10, 6, 9, 11, 5, 0, 14, 7, 11, 10, 4, 13, 1, 5, 8, 12, 6, 9, 3, 2, 15, 13, 8, 10, 1, 3, 15, 4, 2, 11, 6, 7, 12, 0, 5, 14, 9],
  [10, 0, 9, 14, 6, 3, 15, 5, 1, 13, 12, 7, 11, 4, 2, 8, 13, 7, 0, 9, 3, 4, 6, 10, 2, 8, 5, 14, 12, 11, 15, 1, 13, 6, 4, 9, 8, 15, 3, 0, 11, 1, 2, 12, 5, 10, 14, 7, 1, 10, 13, 0, 6, 9, 8, 7, 4, 15, 14, 3, 11, 5, 2, 12],
  [7, 13, 14, 3, 0, 6, 9, 10, 1, 2, 8, 5, 11, 12, 4, 15, 13, 8, 11, 5, 6, 15, 0, 3, 4, 7, 2, 12, 1, 10, 14, 9, 10, 6, 9, 0, 12, 11, 7, 13, 15, 1, 3, 14, 5, 2, 8, 4, 3, 15, 0, 6, 10, 1, 13, 8, 9, 4, 5, 11, 12, 7, 2, 14],
  [2, 12, 4, 1, 7, 10, 11, 6, 8, 5, 3, 15, 13, 0, 14, 9, 14, 11, 2, 12, 4, 7, 13, 1, 5, 0, 15, 10, 3, 9, 8, 6, 4, 2, 1, 11, 10, 13, 7, 8, 15, 9, 12, 5, 6, 3, 0, 14, 11, 8, 12, 7, 1, 14, 2, 13, 6, 15, 0, 9, 10, 4, 5, 3],
  [12, 1, 10, 15, 9, 2, 6, 8, 0, 13, 3, 4, 14, 7, 5, 11, 10, 15, 4, 2, 7, 12, 9, 5, 6, 1, 13, 14, 0, 11, 3, 8, 9, 14, 15, 5, 2, 8, 12, 3, 7, 0, 4, 10, 1, 13, 11, 6, 4, 3, 2, 12, 9, 5, 15, 10, 11, 14, 1, 7, 6, 0, 8, 13],
  [4, 11, 2, 14, 15, 0, 8, 13, 3, 12, 9, 7, 5, 10, 6, 1, 13, 0, 11, 7, 4, 9, 1, 10, 14, 3, 5, 12, 2, 15, 8, 6, 1, 4, 11, 13, 12, 3, 7, 14, 10, 15, 6, 8, 0, 5, 9, 2, 6, 11, 13, 8, 1, 4, 10, 7, 9, 5, 0, 15, 14, 2, 3, 12],
  [13, 2, 8, 4, 6, 15, 11, 1, 10, 9, 3, 14, 5, 0, 12, 7, 1, 15, 13, 8, 10, 3, 7, 4, 12, 5, 6, 11, 0, 14, 9, 2, 7, 11, 4, 1, 9, 12, 14, 2, 0, 6, 10, 13, 15, 3, 5, 8, 2, 1, 14, 7, 4, 10, 8, 13, 15, 12, 9, 0, 3, 5, 6, 11],
];

type Bits = number[];
const permute = (input: Bits, table: number[]) => table.map((n) => input[n - 1]);
const xorBits = (a: Bits, b: Bits) => a.map((bit, i) => bit ^ b[i]);
const rotl = (half: Bits, n: number) => [...half.slice(n), ...half.slice(0, n)];
const toBits = (bytes: number[]) => bytes.flatMap((b) => [...bits(b)].map(Number));
const fromBits = (b: Bits) => Array.from({ length: b.length / 8 }, (_, i) => parseInt(b.slice(i * 8, i * 8 + 8).join(""), 2));
const bitsHex = (b: Bits) => hex(fromBits(b), "");

function desSubkeys(key: number[]) {
  const k = permute(toBits(key), PC1);
  let c = k.slice(0, 28);
  let d = k.slice(28);
  return SHIFTS.map((s) => {
    c = rotl(c, s);
    d = rotl(d, s);
    return permute([...c, ...d], PC2);
  });
}

/** The Feistel function: expand, mix in the round key, S-boxes, permute. */
function feistel(right: Bits, subkey: Bits) {
  const x = xorBits(permute(right, E), subkey);
  const out: Bits = [];
  for (let s = 0; s < 8; s++) {
    const six = x.slice(s * 6, s * 6 + 6);
    const row = six[0] * 2 + six[5];
    const col = six[1] * 8 + six[2] * 4 + six[3] * 2 + six[4];
    out.push(...[...SBOX[s][row * 16 + col].toString(2).padStart(4, "0")].map(Number));
  }
  return permute(out, P);
}

export interface DesRound {
  round: number;
  /** Halves after this round, as hex. */
  left: string;
  right: string;
  key: string;
  f: string;
}

/** One 8-byte block. Decryption is the same network with the round keys reversed. */
export function desBlock(block: number[], key: number[], decrypt = false) {
  const keys = desSubkeys(key);
  if (decrypt) keys.reverse();
  const ip = permute(toBits(block), IP);
  let l = ip.slice(0, 32);
  let r = ip.slice(32);
  const rounds: DesRound[] = [];
  keys.forEach((k, i) => {
    const f = feistel(r, k);
    [l, r] = [r, xorBits(l, f)];
    rounds.push({ round: i + 1, left: bitsHex(l), right: bitsHex(r), key: bitsHex(k), f: bitsHex(f) });
  });
  return { output: fromBits(permute([...r, ...l], FP)), initial: { left: bitsHex(ip.slice(0, 32)), right: bitsHex(ip.slice(32)) }, rounds };
}

// ── AES-128 (2001) ──────────────────────────────────────────────────────
// The S-box is built from its definition (inverse in GF(2⁸) + affine map)
// instead of being typed in, so it cannot carry a typo.

const xtime = (b: number) => ((b << 1) ^ (b & 0x80 ? 0x1b : 0)) & 255;
function gmul(a: number, b: number) {
  let p = 0;
  for (; b; b >>= 1, a = xtime(a)) if (b & 1) p ^= a;
  return p;
}

export const aesSbox = (() => {
  const box = Array<number>(256);
  for (let x = 0; x < 256; x++) {
    let inv = 0;
    if (x) for (let y = 1; y < 256; y++) if (gmul(x, y) === 1) inv = y;
    let s = inv;
    for (let r = 1; r <= 4; r++) s ^= ((inv << r) | (inv >> (8 - r))) & 255;
    box[x] = s ^ 0x63;
  }
  return box;
})();
const aesInvSbox = aesSbox.reduce<number[]>((inv, v, i) => ((inv[v] = i), inv), []);

function expandKey(key: number[]) {
  const w: number[][] = [];
  for (let i = 0; i < 4; i++) w.push(key.slice(4 * i, 4 * i + 4));
  let rcon = 1;
  for (let i = 4; i < 44; i++) {
    let t = [...w[i - 1]];
    if (i % 4 === 0) {
      t = [aesSbox[t[1]] ^ rcon, aesSbox[t[2]], aesSbox[t[3]], aesSbox[t[0]]];
      rcon = xtime(rcon);
    }
    w.push(w[i - 4].map((b, j) => b ^ t[j]));
  }
  return Array.from({ length: 11 }, (_, r) => w.slice(4 * r, 4 * r + 4).flat());
}

// The state is 16 bytes in column order: byte (row, col) sits at col * 4 + row.
const addRoundKey = (s: number[], k: number[]) => s.map((b, i) => b ^ k[i]);
const subBytes = (s: number[], box = aesSbox) => s.map((b) => box[b]);
const shiftRows = (s: number[], dir = 1) => s.map((_, i) => s[(((i >> 2) + dir * (i & 3) + 4) % 4) * 4 + (i & 3)]);
function mixColumns(s: number[], m = [2, 3, 1, 1]) {
  const out = [...s];
  for (let c = 0; c < 4; c++) {
    const col = s.slice(c * 4, c * 4 + 4);
    for (let r = 0; r < 4; r++) out[c * 4 + r] = col.reduce((acc, b, k) => acc ^ gmul(b, m[(k - r + 4) % 4]), 0);
  }
  return out;
}

export type AesStage = "start" | "addRoundKey" | "subBytes" | "shiftRows" | "mixColumns";
export interface AesStep {
  round: number;
  stage: AesStage;
  state: number[];
}

/** Encrypts one 16-byte block and records the state after every stage. */
export function aesEncryptBlock(block: number[], key: number[]) {
  const keys = expandKey(key);
  const trace: AesStep[] = [{ round: 0, stage: "start", state: [...block] }];
  let s = addRoundKey(block, keys[0]);
  trace.push({ round: 0, stage: "addRoundKey", state: s });
  for (let round = 1; round <= 10; round++) {
    s = subBytes(s);
    trace.push({ round, stage: "subBytes", state: s });
    s = shiftRows(s);
    trace.push({ round, stage: "shiftRows", state: s });
    if (round < 10) {
      s = mixColumns(s);
      trace.push({ round, stage: "mixColumns", state: s });
    }
    s = addRoundKey(s, keys[round]);
    trace.push({ round, stage: "addRoundKey", state: s });
  }
  return { output: s, trace };
}

export function aesDecryptBlock(block: number[], key: number[]) {
  const keys = expandKey(key);
  let s = addRoundKey(block, keys[10]);
  for (let round = 9; round >= 0; round--) {
    s = subBytes(shiftRows(s, -1), aesInvSbox);
    s = addRoundKey(s, keys[round]);
    if (round > 0) s = mixColumns(s, [14, 11, 13, 9]);
  }
  return s;
}

/** Text → exactly 16 bytes (padded with PKCS#7, cut if longer) for one-block demos. */
export function toBlock(text: string, size = 16) {
  const bytes = textToBytes(text).slice(0, size);
  const pad = size - bytes.length;
  return [...bytes, ...Array<number>(pad).fill(pad)];
}

export function fromBlock(block: number[]) {
  const pad = block.at(-1) ?? 0;
  const valid = pad > 0 && pad <= block.length && block.slice(-pad).every((b) => b === pad);
  return bytesToText(valid ? block.slice(0, -pad) : block);
}

/** A 16-byte key from a passphrase-like string (teaching only; real systems use a KDF). */
export const keyFromText = (text: string, size = 16) => textToBytes(text.padEnd(size, "\0")).slice(0, size);

// ── Number theory: RSA (1977) and Diffie–Hellman (1976) ─────────────────

export function modPow(base: bigint, exp: bigint, mod: bigint) {
  if (mod === 1n) return 0n;
  let result = 1n;
  base %= mod;
  for (; exp > 0n; exp >>= 1n, base = (base * base) % mod) if (exp & 1n) result = (result * base) % mod;
  return result;
}

export function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a < 0n ? -a : a;
}

/** d such that (a · d) mod m = 1, or null when none exists. */
export function modInverse(a: bigint, m: bigint) {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];
  while (r) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return oldR === 1n ? ((oldS % m) + m) % m : null;
}

export function isPrime(n: number) {
  if (n < 2 || !Number.isInteger(n)) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
}

export interface RsaKeys {
  p: bigint;
  q: bigint;
  n: bigint;
  phi: bigint;
  e: bigint;
  d: bigint;
}

/** Textbook RSA from two primes; e is the smallest valid of 3, 5, 7, … unless given. */
export function rsaKeys(p: number, q: number, e?: number): RsaKeys | null {
  if (!isPrime(p) || !isPrime(q) || p === q) return null;
  const [P, Q] = [BigInt(p), BigInt(q)];
  const n = P * Q;
  const phi = (P - 1n) * (Q - 1n);
  let E = BigInt(e ?? 3);
  if (e === undefined) while (gcd(E, phi) !== 1n) E += 2n;
  const d = modInverse(E, phi);
  return d === null || E >= phi ? null : { p: P, q: Q, n, phi, e: E, d };
}

export const rsaEncrypt = (m: bigint, k: RsaKeys) => modPow(m, k.e, k.n);
export const rsaDecrypt = (c: bigint, k: RsaKeys) => modPow(c, k.d, k.n);

export function diffieHellman(p: number, g: number, a: number, b: number) {
  const [P, G] = [BigInt(p), BigInt(g)];
  const A = modPow(G, BigInt(a), P);
  const B = modPow(G, BigInt(b), P);
  return { A, B, sharedA: modPow(B, BigInt(a), P), sharedB: modPow(A, BigInt(b), P) };
}

// ── SHA-256 (2001) ──────────────────────────────────────────────────────
// The constants are the first 32 bits of the fractional parts of the square
// and cube roots of the first primes — computed here, not typed in.

const primes = (() => {
  const out: number[] = [];
  for (let n = 2; out.length < 64; n++) if (isPrime(n)) out.push(n);
  return out;
})();
const frac32 = (x: number) => Math.floor((x - Math.floor(x)) * 2 ** 32) >>> 0;
const K = primes.map((p) => frac32(Math.cbrt(p)));
const H0 = primes.slice(0, 8).map((p) => frac32(Math.sqrt(p)));
const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256(data: number[]) {
  const bytes = [...data, 0x80];
  while (bytes.length % 64 !== 56) bytes.push(0);
  const bitLength = data.length * 8;
  for (let i = 7; i >= 0; i--) bytes.push(Math.floor(bitLength / 2 ** (i * 8)) & 255);
  const h = [...H0];
  const w = Array<number>(64);
  for (let chunk = 0; chunk < bytes.length; chunk += 64) {
    for (let i = 0; i < 16; i++) {
      const o = chunk + i * 4;
      w[i] = ((bytes[o] << 24) | (bytes[o + 1] << 16) | (bytes[o + 2] << 8) | bytes[o + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      [hh, g, f, e, d, c, b, a] = [g, f, e, (d + t1) >>> 0, c, b, a, (t1 + t2) >>> 0];
    }
    [a, b, c, d, e, f, g, hh].forEach((v, i) => (h[i] = (h[i] + v) >>> 0));
  }
  return h.map((v) => v.toString(16).padStart(8, "0")).join("");
}

/** How many of the 256 bits differ between two hex digests. */
export function bitDifference(hexA: string, hexB: string) {
  let n = 0;
  for (let i = 0; i < hexA.length; i++) {
    let x = parseInt(hexA[i], 16) ^ parseInt(hexB[i], 16);
    for (; x; x &= x - 1) n++;
  }
  return n;
}
