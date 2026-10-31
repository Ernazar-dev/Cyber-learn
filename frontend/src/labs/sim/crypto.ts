// Pure helpers behind the cipher lab, the password meter and the CTF
// decoder tools. Ciphers touch only Latin A–Z, keep letter case and leave
// every other character (digits, spaces, o‘ / g‘ apostrophes) as it is.

const A = 65;
const a = 97;

function shiftLetter(ch: string, by: number) {
  const code = ch.charCodeAt(0);
  const base = code >= A && code <= A + 25 ? A : code >= a && code <= a + 25 ? a : -1;
  if (base < 0) return ch;
  return String.fromCharCode(base + ((((code - base + by) % 26) + 26) % 26));
}

export function caesar(text: string, shift: number) {
  return [...text].map((ch) => shiftLetter(ch, shift)).join("");
}

/** Every Caesar key at once: what an attacker tries in under a second. */
export function caesarAll(text: string) {
  return Array.from({ length: 25 }, (_, i) => ({ shift: i + 1, text: caesar(text, -(i + 1)) }));
}

export function atbash(text: string) {
  return [...text]
    .map((ch) => {
      const code = ch.charCodeAt(0);
      if (code >= A && code <= A + 25) return String.fromCharCode(A + 25 - (code - A));
      if (code >= a && code <= a + 25) return String.fromCharCode(a + 25 - (code - a));
      return ch;
    })
    .join("");
}

/** Vigenère: each letter is shifted by the next key letter; non-letters do not use up the key. */
export function vigenere(text: string, key: string, decrypt = false) {
  const shifts = [...key.toUpperCase()].filter((ch) => ch >= "A" && ch <= "Z").map((ch) => ch.charCodeAt(0) - A);
  if (shifts.length === 0) return text;
  let i = 0;
  return [...text]
    .map((ch) => {
      if (!/[A-Za-z]/.test(ch)) return ch;
      const by = shifts[i++ % shifts.length];
      return shiftLetter(ch, decrypt ? -by : by);
    })
    .join("");
}

export function rot13(text: string) {
  return caesar(text, 13);
}

/** A–Z only, upper case: the form classical ciphers and answers work in. */
export function lettersOnly(text: string) {
  return text.toUpperCase().replace(/[^A-Z]/g, "");
}

// ── Scytale (Sparta) ────────────────────────────────────────────────────
// The strip is wound around a rod with `turns` rows of letters: written
// across the rod row by row, it reads down the columns once unwound.

export function scytaleRows(text: string, turns: number) {
  const letters = lettersOnly(text);
  const rows = Math.max(2, Math.floor(turns));
  const cols = Math.max(1, Math.ceil(letters.length / rows));
  const padded = letters.padEnd(rows * cols, "X");
  return Array.from({ length: rows }, (_, r) => [...padded.slice(r * cols, (r + 1) * cols)]);
}

export function scytaleEncrypt(text: string, turns: number) {
  const grid = scytaleRows(text, turns);
  return grid[0].map((_, c) => grid.map((row) => row[c]).join("")).join("");
}

export function scytaleDecrypt(text: string, turns: number) {
  const letters = lettersOnly(text);
  const rows = Math.max(2, Math.floor(turns));
  const cols = Math.ceil(letters.length / rows);
  let out = "";
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out += letters[c * rows + r] ?? "";
  return out;
}

// ── Polybius square ─────────────────────────────────────────────────────
// 5 × 5 letters, I and J share a cell; each letter becomes "row column".

export const polybiusSquare = ["ABCDE", "FGHIK", "LMNOP", "QRSTU", "VWXYZ"];

export function polybiusCell(letter: string): [number, number] | null {
  const ch = letter.toUpperCase() === "J" ? "I" : letter.toUpperCase();
  if (!/^[A-Z]$/.test(ch)) return null;
  const row = polybiusSquare.findIndex((line) => line.includes(ch));
  return [row + 1, polybiusSquare[row].indexOf(ch) + 1];
}

export function polybiusEncrypt(text: string) {
  return [...lettersOnly(text)].map((ch) => polybiusCell(ch)!.join("")).join(" ");
}

export function polybiusDecrypt(text: string) {
  const digits = text.replace(/[^1-5]/g, "");
  let out = "";
  for (let i = 0; i + 1 < digits.length; i += 2) out += polybiusSquare[+digits[i] - 1][+digits[i + 1] - 1];
  return out;
}

// ── Morse code ──────────────────────────────────────────────────────────
// An encoding, not a cipher: the table is public. Letters are separated by
// a space and words by " / ".

const morseTable =
  ".- -... -.-. -.. . ..-. --. .... .. .--- -.- .-.. -- -. --- .--. --.- .-. ... - ..- ...- .-- -..- -.-- --.. ----- .---- ..--- ...-- ....- ..... -.... --... ---.. ----.".split(
    " ",
  );
export const morse: Record<string, string> = Object.fromEntries(
  [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"].map((ch, i) => [ch, morseTable[i]]),
);
const fromMorse = Object.fromEntries(Object.entries(morse).map(([ch, code]) => [code, ch]));

export function morseEncode(text: string) {
  return text
    .toUpperCase()
    .split(/\s+/)
    .map((word) =>
      [...word]
        .map((ch) => morse[ch])
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(" / ");
}

/** Tidies dots and dashes typed on any keyboard (·, •, –, —, _). */
export function normalizeMorse(code: string) {
  return code
    .replace(/[–—−_]/g, "-")
    .replace(/[·•*]/g, ".")
    .replace(/[^.\-/\s]/g, "")
    .trim()
    .split(/\s*\/\s*/)
    .map((word) => word.trim().split(/\s+/).join(" "))
    .join(" / ");
}

export function morseDecode(code: string) {
  return normalizeMorse(code)
    .split(" / ")
    .map((word) =>
      word
        .split(" ")
        .map((token) => (token ? (fromMorse[token] ?? "?") : ""))
        .join(""),
    )
    .join(" ");
}

// ── Frequency analysis (al-Kindi, 9th century) ──────────────────────────
// Letter shares per mille. English from the standard tables; Uzbek counted
// from this site's own Uzbek lessons (o‘ and g‘ read as O and G).

export const letterFrequencies: Record<"en" | "uz", number[]> = {
  en: [82, 15, 28, 43, 127, 22, 20, 61, 70, 2, 8, 40, 24, 67, 75, 19, 1, 60, 63, 91, 28, 10, 24, 2, 20, 1],
  uz: [143, 32, 12, 34, 28, 13, 28, 44, 134, 5, 29, 49, 29, 69, 53, 9, 21, 59, 59, 41, 36, 15, 0, 6, 29, 23],
};

export function letterCounts(text: string) {
  const counts = Array<number>(26).fill(0);
  for (const ch of lettersOnly(text)) counts[ch.charCodeAt(0) - A]++;
  return counts;
}

/** The Caesar shift whose decryption best matches the language (chi-squared). */
export function crackCaesar(text: string, language: "en" | "uz") {
  const counts = letterCounts(text);
  const total = counts.reduce((sum, n) => sum + n, 0);
  if (!total) return 0;
  let best = 0;
  let bestScore = Infinity;
  for (let shift = 0; shift < 26; shift++) {
    let score = 0;
    for (let i = 0; i < 26; i++) {
      const expected = Math.max((letterFrequencies[language][i] / 1000) * total, 0.5);
      score += (counts[(i + shift) % 26] - expected) ** 2 / expected;
    }
    if (score < bestScore) [best, bestScore] = [shift, score];
  }
  return best;
}

// ── Pigpen (Freemasons’) cipher ─────────────────────────────────────────
// A–I fill a # grid, J–R a dotted # grid, S–V an X and W–Z a dotted X.
// A letter is drawn as the lines around its cell.

export interface PigpenGlyph {
  shape: "grid" | "x";
  /** Grid cell walls: top, right, bottom, left. */
  walls: [boolean, boolean, boolean, boolean];
  /** X cell: the side the V opens towards. */
  opens: "up" | "right" | "down" | "left";
  dot: boolean;
}

export function pigpen(letter: string): PigpenGlyph | null {
  if (!/^[A-Za-z]$/.test(letter)) return null;
  const i = letter.toUpperCase().charCodeAt(0) - A;
  if (i < 18) {
    const cell = i % 9;
    const row = Math.floor(cell / 3);
    const col = cell % 3;
    return { shape: "grid", walls: [row > 0, col < 2, row < 2, col > 0], opens: "up", dot: i >= 9 };
  }
  // The X’s four cells: top (S, W), left, right, bottom.
  const opens = (["up", "left", "right", "down"] as const)[(i - 18) % 4];
  return { shape: "x", walls: [false, false, false, false], opens, dot: i >= 22 };
}

// ── Public-key idea: mixing paint ───────────────────────────────────────
// Mixing equal parts averages the colours, and the order does not matter —
// the intuition behind Diffie–Hellman key exchange.

export type Rgb = [number, number, number];

export function mix(...parts: Rgb[]): Rgb {
  return [0, 1, 2].map((c) => Math.round(parts.reduce((sum, p) => sum + p[c], 0) / parts.length)) as Rgb;
}

export const rgbCss = ([r, g, b]: Rgb) => `rgb(${r} ${g} ${b})`;

/** Returns null when the input is not valid Base64. */
export function fromBase64(text: string) {
  const clean = text.trim();
  if (!clean || !/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 === 1) return null;
  try {
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Accepts "48 65 6c", "48656c" or "0x48 0x65"; null when it is not hex. */
export function fromHex(text: string) {
  const clean = text.replace(/0x/gi, "").replace(/[\s:,-]/g, "");
  if (!clean || clean.length % 2 || !/^[0-9a-f]+$/i.test(clean)) return null;
  const bytes = Uint8Array.from(clean.match(/../g)!, (h) => parseInt(h, 16));
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

// ── Password strength ───────────────────────────────────────────────────

/** Guesses per second of an offline attack on a fast hash with one GPU rig. */
export const guessesPerSecond = 1e10;

// The first entries of every leaked-password list; an attacker tries them first.
const common = new Set([
  "123456", "12345678", "123456789", "1234567890", "12345", "qwerty", "qwerty123", "password", "password1",
  "parol", "parol123", "admin", "admin123", "111111", "000000", "iloveyou", "abc123", "qwertyuiop",
  "1q2w3e4r", "123123", "654321", "letmein", "welcome", "dragon", "football", "monkey", "salom", "salom123",
]);

export type CharClass = "lower" | "upper" | "digit" | "symbol";

export interface Strength {
  length: number;
  classes: CharClass[];
  /** Estimated entropy in bits after penalties. */
  bits: number;
  /** Average seconds to guess it at `guessesPerSecond`. */
  seconds: number;
  /** Why the estimate was cut down, if it was. */
  weakness: "common" | "repeat" | "sequence" | null;
}

const sequences = ["abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm", "0123456789"];

function hasSequence(lower: string) {
  for (const seq of sequences) {
    for (let i = 0; i + 4 <= seq.length; i++) {
      const run = seq.slice(i, i + 4);
      if (lower.includes(run) || lower.includes([...run].reverse().join(""))) return true;
    }
  }
  return false;
}

export function passwordStrength(password: string): Strength {
  const length = [...password].length;
  const classes: CharClass[] = [];
  if (/[a-z]/.test(password)) classes.push("lower");
  if (/[A-Z]/.test(password)) classes.push("upper");
  if (/[0-9]/.test(password)) classes.push("digit");
  if (/[^A-Za-z0-9]/.test(password)) classes.push("symbol");
  const pool = { lower: 26, upper: 26, digit: 10, symbol: 33 };
  const size = classes.reduce((sum, c) => sum + pool[c], 0);
  let bits = length && size ? length * Math.log2(size) : 0;

  const lower = password.toLowerCase();
  // Leetspeak is the first thing cracking rules undo: P@ssw0rd -> password.
  const unleet = lower.replace(/[@4]/g, "a").replace(/0/g, "o").replace(/3/g, "e").replace(/[5$]/g, "s");
  let weakness: Strength["weakness"] = null;
  if (common.has(lower) || common.has(unleet)) {
    weakness = "common";
    bits = Math.min(bits, 10);
  } else if (length >= 4 && new Set(lower).size <= Math.ceil(length / 4)) {
    weakness = "repeat";
    bits = Math.min(bits, length * 2);
  } else if (hasSequence(lower)) {
    weakness = "sequence";
    bits *= 0.6;
  }

  const seconds = bits ? 2 ** bits / 2 / guessesPerSecond : 0;
  return { length, classes, bits: Math.round(bits), seconds, weakness };
}

export type TimeUnit = "instant" | "seconds" | "minutes" | "hours" | "days" | "years" | "centuries" | "forever";

const minute = 60;
const hour = 3600;
const day = 86_400;
const year = 31_557_600;

export const tenYears = 10 * year;

/** Picks the largest unit that reads well, e.g. { unit: "days", value: 3 }. */
export function humanTime(seconds: number): { unit: TimeUnit; value: number } {
  if (seconds < 1) return { unit: "instant", value: 0 };
  if (seconds < minute) return { unit: "seconds", value: Math.round(seconds) };
  if (seconds < hour) return { unit: "minutes", value: Math.round(seconds / minute) };
  if (seconds < day) return { unit: "hours", value: Math.round(seconds / hour) };
  if (seconds < year) return { unit: "days", value: Math.round(seconds / day) };
  if (seconds < 100 * year) return { unit: "years", value: Math.round(seconds / year) };
  if (seconds < 1e6 * year) return { unit: "centuries", value: Math.round(seconds / year / 100) };
  return { unit: "forever", value: 0 };
}
