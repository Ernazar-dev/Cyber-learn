// Enigma I as the Wehrmacht used it: rotors I, II, III (left to right),
// reflector B, ring settings at A, no plugboard. Each key press first turns
// the rotors (including the middle rotor's "double step"), then the current
// runs right → left through the rotors, bounces off the reflector and runs
// back left → right. Wirings are the historical ones.

const A = 65;
const mod = (n: number) => ((n % 26) + 26) % 26;
const num = (letter: string) => letter.charCodeAt(0) - A;
const chr = (n: number) => String.fromCharCode(A + mod(n));

export const rotors = [
  { name: "I", wiring: "EKMFLGDQVZNTOWYHXUSPAIBRCJ", notch: "Q" },
  { name: "II", wiring: "AJDKSIRUXBLHWTMCQGZNPYFVOE", notch: "E" },
  { name: "III", wiring: "BDFHJLCPRTXVZNYEIWGAKMUSQO", notch: "V" },
] as const;
export const reflectorB = "YRUHQSLDPXNGOKMIEBFZCWVJAT";

const inverse = rotors.map((rotor) => {
  const back = Array<number>(26);
  [...rotor.wiring].forEach((out, i) => (back[num(out)] = i));
  return back;
});

/** Rotor positions, left to right; 0 = A. */
export type Positions = [number, number, number];

export function parsePositions(text: string): Positions {
  const letters = text.toUpperCase().replace(/[^A-Z]/g, "").padEnd(3, "A");
  return [num(letters[0]), num(letters[1]), num(letters[2])];
}

export const showPositions = (p: Positions) => p.map(chr).join("");

/** Turns the rotors as a key press does, before the letter is enciphered. */
export function stepRotors([left, middle, right]: Positions): Positions {
  if (chr(middle) === rotors[1].notch) return [mod(left + 1), mod(middle + 1), mod(right + 1)];
  if (chr(right) === rotors[2].notch) return [left, mod(middle + 1), mod(right + 1)];
  return [left, middle, mod(right + 1)];
}

export interface KeyPress {
  input: string;
  output: string;
  /** The letter after each stage: III, II, I, reflector, I, II, III. */
  path: string[];
  positions: Positions;
}

/** Presses one key: the lamp that lights, the path the current took, the new positions. */
export function pressKey(letter: string, positions: Positions): KeyPress {
  const next = stepRotors(positions);
  let c = num(letter.toUpperCase());
  const path: string[] = [];
  const through = (i: number, back: boolean) => {
    const p = next[i];
    c = back ? mod(inverse[i][mod(c + p)] - p) : mod(num(rotors[i].wiring[mod(c + p)]) - p);
    path.push(chr(c));
  };
  for (const i of [2, 1, 0]) through(i, false);
  c = num(reflectorB[c]);
  path.push(chr(c));
  for (const i of [0, 1, 2]) through(i, true);
  return { input: letter.toUpperCase(), output: chr(c), path, positions: next };
}

/** Enciphers A–Z from a start position; other characters pass through. */
export function enigma(text: string, start: string) {
  let positions = parsePositions(start);
  let out = "";
  for (const ch of text.toUpperCase()) {
    if (ch < "A" || ch > "Z") {
      out += ch;
      continue;
    }
    const press = pressKey(ch, positions);
    positions = press.positions;
    out += press.output;
  }
  return out;
}
