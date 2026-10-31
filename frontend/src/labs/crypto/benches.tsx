
import { useEffect, useId, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Lock, LockOpen, Play, RotateCcw, Sparkles, Square, Zap } from "lucide-react";
import type { Locale, Localized } from "@/labs/i18n";
import {
  atbash,
  caesar,
  caesarAll,
  crackCaesar,
  letterCounts,
  letterFrequencies,
  lettersOnly,
  mix,
  morse,
  morseDecode,
  morseEncode,
  pigpen,
  polybiusCell,
  polybiusDecrypt,
  polybiusEncrypt,
  polybiusSquare,
  rgbCss,
  scytaleDecrypt,
  scytaleEncrypt,
  scytaleRows,
  vigenere,
  type Rgb,
} from "@/labs/sim/crypto";
import { pressKey, showPositions, type KeyPress, type Positions } from "@/labs/sim/enigma";
import {
  aesDecryptBlock,
  aesEncryptBlock,
  aesSbox,
  bitDifference,
  bits,
  bytesToText,
  desBlock,
  diffieHellman,
  fromBlock,
  hex,
  hexToBytes,
  isPrime,
  keyFromText,
  rc4,
  rc4Keystream,
  rsaDecrypt,
  rsaEncrypt,
  rsaKeys,
  sha256,
  textToBytes,
  toBlock,
  xorBytes,
} from "@/labs/sim/modern";
import type { CipherId } from "./ciphers";

// One interactive "bench" per cipher in the cryptography lab. Everything
// runs in the browser; nothing typed leaves the page.

type BenchProps = { locale: Locale };

const ui = {
  message: { uz: "Xabar", kaa: "Xabar", ru: "Сообщение", en: "Message" },
  result: { uz: "Natija", kaa: "Nátiyje", ru: "Результат", en: "Result" },
  encrypt: { uz: "Shifrlash", kaa: "Shifrlaw", ru: "Зашифровать", en: "Encrypt" },
  decrypt: { uz: "Ochish", kaa: "Ashıw", ru: "Расшифровать", en: "Decrypt" },
  shift: { uz: "Siljish", kaa: "Jılısıw", ru: "Сдвиг", en: "Shift" },
  key: { uz: "Kalit so‘z", kaa: "Gilt sóz", ru: "Ключевое слово", en: "Key word" },
  turns: { uz: "Tayoqcha atrofidagi qatorlar", kaa: "Tayaqsha átirapındaǵı qatarlar", ru: "Строк вокруг жезла", en: "Rows around the rod" },
  rod: { uz: "Tayoqchaga o‘ralgan tasma", kaa: "Tayaqshaǵa oralǵan taspa", ru: "Лента на жезле", en: "The strip on the rod" },
  strip: { uz: "Yechilgan tasma", kaa: "Sheshilgen taspa", ru: "Размотанная лента", en: "The unwound strip" },
  clickCell: {
    uz: "Katakni bossangiz, harf xabarga qo‘shiladi.",
    kaa: "Katakshanı bassańız, hárip xabarǵa qosıladı.",
    ru: "Нажмите на клетку — буква добавится к сообщению.",
    en: "Click a cell to add its letter to the message.",
  },
  brute: { uz: "Barcha 25 kalitni sinash", kaa: "Barlıq 25 giltti sınaw", ru: "Перебрать все 25 ключей", en: "Try all 25 keys" },
  cipherText: { uz: "Shifrlangan matn", kaa: "Shifrlanǵan tekst", ru: "Шифротекст", en: "Ciphertext" },
  language: { uz: "Til", kaa: "Til", ru: "Язык", en: "Language" },
  uzbek: { uz: "O‘zbekcha", kaa: "Ózbekshe", ru: "Узбекский", en: "Uzbek" },
  english: { uz: "Inglizcha", kaa: "Inglisshe", ru: "Английский", en: "English" },
  guess: { uz: "Taxminiy kalit", kaa: "Shamalı gilt", ru: "Предполагаемый ключ", en: "Key guess" },
  auto: { uz: "Al-Kindiy usuli bilan topish", kaa: "Al-Kindiy usılı menen tabıw", ru: "Найти методом аль-Кинди", en: "Find it al-Kindi’s way" },
  freqLegend: {
    uz: "Ustunlar — matndagi harflar (taxminiy kalit bilan ochilgan), chiziqlar — tildagi odatiy ulush. Ular ustma-ust tushsa, kalit topildi.",
    kaa: "Baǵanalar — tekstegi háripler (shamalı gilt penen ashılǵan), sızıqlar — tildegi ádettegi úles. Olar ústpe-úst tússe, gilt tabıldı.",
    ru: "Столбцы — буквы текста (расшифрованного предполагаемым ключом), черточки — обычная доля в языке. Совпали — ключ найден.",
    en: "Bars are the text’s letters (decrypted with the guessed key), ticks are the language’s usual share. When they line up, you have the key.",
  },
  preview: { uz: "Ochilgan matn", kaa: "Ashılǵan tekst", ru: "Расшифровка", en: "Decrypted text" },
  table: { uz: "Kalit ostida", kaa: "Gilt astında", ru: "Под ключом", en: "Under the key" },
  pigpenKey: { uz: "Belgilar kaliti", kaa: "Belgiler gilti", ru: "Ключ к знакам", en: "Symbol key" },
  textToMorse: { uz: "Matn → Morze", kaa: "Tekst → Morze", ru: "Текст → Морзе", en: "Text → Morse" },
  morseToText: { uz: "Morze → Matn", kaa: "Morze → Tekst", ru: "Морзе → Текст", en: "Morse → Text" },
  play: { uz: "Eshitish", kaa: "Tıńlaw", ru: "Послушать", en: "Listen" },
  stop: { uz: "To‘xtatish", kaa: "Toqtatıw", ru: "Стоп", en: "Stop" },
  rotors: { uz: "Rotorlar (boshlanish)", kaa: "Rotorlar (baslanıw)", ru: "Роторы (начало)", en: "Rotors (start)" },
  keyboard: { uz: "Klaviatura", kaa: "Klaviatura", ru: "Клавиатура", en: "Keyboard" },
  lamps: { uz: "Chiroqlar", kaa: "Shıraqlar", ru: "Лампы", en: "Lamps" },
  typed: { uz: "Terilgan", kaa: "Terilgen", ru: "Набрано", en: "Typed" },
  lit: { uz: "Yongan chiroqlar", kaa: "Janǵan shıraqlar", ru: "Загоревшиеся лампы", en: "Lamps lit" },
  path: { uz: "Tok yo‘li", kaa: "Tok jolı", ru: "Путь тока", en: "Current path" },
  reset: { uz: "Boshidan", kaa: "Basınan", ru: "Сначала", en: "Reset" },
  enigmaTip: {
    uz: "Tugmalarni bosing yoki klaviaturada yozing (avval shu blokni bosing). Bir harfni ketma-ket bossangiz ham, har safar boshqa chiroq yonadi.",
    kaa: "Túymelerdi basıń yamasa klaviaturada jazıń (aldın usı bloktı basıń). Bir háripti izbe-iz bassańız da, hár ret basqa shıraq janadı.",
    ru: "Нажимайте клавиши или печатайте (сначала щёлкните по блоку). Даже одна и та же буква подряд зажигает разные лампы.",
    en: "Press the keys or type (click this panel first). Press the same letter again and again — a different lamp lights each time.",
  },
  common: { uz: "Umumiy rang (hammaga ochiq)", kaa: "Ulıwma reń (hámmege ashıq)", ru: "Общий цвет (виден всем)", en: "Common colour (public)" },
  secretOf: { uz: "ning maxfiy rangi", kaa: "nıń jasırın reńi", ru: ": тайный цвет", en: "’s secret colour" },
  sends: { uz: "ochiq yuboradi", kaa: "ashıq jiberedi", ru: "отправляет открыто", en: "sends openly" },
  shared: { uz: "Umumiy sir", kaa: "Ulıwma sır", ru: "Общий секрет", en: "Shared secret" },
  eve: { uz: "Eva ko‘radi", kaa: "Eva kóredi", ru: "Ева видит", en: "Eve sees" },
  same: {
    uz: "Ikkalasida bir xil rang! Eva esa faqat umumiy rang va ikkita aralashmani ko‘rdi.",
    kaa: "Ekewinde de birdey reń! Eva bolsa tek ulıwma reń hám eki aralaspanı kórdi.",
    ru: "У обоих одинаковый цвет! А Ева видела лишь общий цвет и две смеси.",
    en: "Both get the same colour! Eve only saw the common colour and two mixes.",
  },
} satisfies Record<string, Localized>;

// ── Small building blocks ───────────────────────────────────────────────

function Field({ label, value, onChange, rows = 2, mono = true }: { label: string; value: string; onChange: (v: string) => void; rows?: number; mono?: boolean }) {
  const id = useId();
  return (
    <label htmlFor={id} className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <textarea
        id={id}
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value.slice(0, 600))}
        spellCheck={false}
        autoComplete="off"
        className={`w-full resize-y rounded-xl border border-border bg-surface p-3 text-sm focus:border-accent focus:outline-none ${mono ? "font-mono" : ""}`}
      />
    </label>
  );
}

function Out({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      <output aria-live="polite" className="block min-h-12 rounded-xl bg-code p-3 font-mono text-sm break-words">
        {children}
      </output>
    </div>
  );
}

function Toggle<T extends string>({ value, options, onChange, label }: { value: T; options: [T, ReactNode][]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map(([key, text]) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function Mode({ decrypting, onChange, locale }: { decrypting: boolean; onChange: (d: boolean) => void; locale: Locale }) {
  return (
    <Toggle
      label={`${ui.encrypt[locale]} / ${ui.decrypt[locale]}`}
      value={decrypting ? "d" : "e"}
      onChange={(v) => onChange(v === "d")}
      options={[
        ["e", <><Lock aria-hidden className="size-4" /> {ui.encrypt[locale]}</>],
        ["d", <><LockOpen aria-hidden className="size-4" /> {ui.decrypt[locale]}</>],
      ]}
    />
  );
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
      <span className="text-muted">
        {label}: <span className="font-mono font-semibold text-text">{value}</span>
      </span>
      <input id={id} type="range" min={min} max={max} value={value} onChange={(e) => onChange(+e.target.value)} className="accent-(--accent)" />
    </label>
  );
}

const alphabet = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/** Two rows: each top letter becomes the one beneath it. */
function Substitution({ map }: { map: (ch: string) => string }) {
  return (
    <div className="overflow-x-auto" aria-hidden>
      <div className="grid min-w-[39rem] grid-cols-[repeat(26,minmax(0,1fr))] gap-y-1 font-mono text-xs">
        {alphabet.map((ch) => (
          <span key={ch} className="grid h-7 place-items-center rounded-t bg-surface-2">
            {ch}
          </span>
        ))}
        {alphabet.map((ch) => (
          <span key={ch} className="grid h-7 place-items-center rounded-b bg-accent-soft font-semibold text-accent-text">
            {map(ch)}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── 1. Atbash ───────────────────────────────────────────────────────────

function AtbashBench({ locale }: BenchProps) {
  const [text, setText] = useState("Salom, Rooty!");
  return (
    <div className="space-y-4">
      <Substitution map={atbash} />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{atbash(text)}</Out>
      </div>
    </div>
  );
}

// ── 2. Scytale ──────────────────────────────────────────────────────────

function ScytaleBench({ locale }: BenchProps) {
  const [text, setText] = useState("SPARTA KUTMOQDA");
  const [turns, setTurns] = useState(3);
  const [decrypting, setDecrypting] = useState(false);
  const plain = decrypting ? scytaleDecrypt(text, turns) : text;
  const grid = scytaleRows(plain, turns);
  const result = decrypting ? scytaleDecrypt(text, turns) : scytaleEncrypt(text, turns);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Mode decrypting={decrypting} onChange={setDecrypting} locale={locale} />
        <Range label={ui.turns[locale]} value={turns} min={2} max={6} onChange={setTurns} />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted">{ui.rod[locale]}</p>
        {/* Each row is one band of leather around the rod. */}
        <div className="overflow-x-auto rounded-xl bg-[linear-gradient(90deg,#7c4a1e,#b0793f_40%,#7c4a1e)] p-2">
          {grid.map((row, r) => (
            <div key={r} className="flex w-max gap-1 py-0.5">
              {row.map((ch, c) => (
                <span key={c} className="grid size-7 place-items-center rounded bg-[#f3e2c3] font-mono text-sm font-semibold text-[#3b2410]">
                  {ch}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={decrypting ? ui.result[locale] : ui.strip[locale]}>{result}</Out>
      </div>
    </div>
  );
}

// ── 3. Polybius ─────────────────────────────────────────────────────────

function PolybiusBench({ locale }: BenchProps) {
  const [text, setText] = useState("ROOTY");
  const [decrypting, setDecrypting] = useState(false);
  const letters = decrypting ? polybiusDecrypt(text) : lettersOnly(text);
  const last = letters.at(-1);
  const active = last ? polybiusCell(last) : null;
  return (
    <div className="space-y-4">
      <Mode decrypting={decrypting} onChange={(d) => { setDecrypting(d); setText(d ? polybiusEncrypt(text) : polybiusDecrypt(text)); }} locale={locale} />
      <div className="flex flex-wrap items-start gap-6">
        <table className="border-separate border-spacing-1 font-mono text-sm">
          <thead>
            <tr>
              <th />
              {[1, 2, 3, 4, 5].map((c) => (
                <th key={c} className={`size-9 text-xs ${active?.[1] === c ? "text-accent" : "text-faint"}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {polybiusSquare.map((line, r) => (
              <tr key={line}>
                <th className={`w-6 text-xs ${active?.[0] === r + 1 ? "text-accent" : "text-faint"}`}>{r + 1}</th>
                {[...line].map((ch, c) => {
                  const on = active?.[0] === r + 1 && active?.[1] === c + 1;
                  return (
                    <td key={ch}>
                      <button
                        type="button"
                        onClick={() => setText((t) => (decrypting ? `${t} ${r + 1}${c + 1}`.trim() : t + ch))}
                        className={`grid size-9 place-items-center rounded-lg border text-sm font-semibold transition-colors ${on ? "border-accent bg-accent text-on-accent" : "border-border bg-surface-2 hover:border-accent"}`}
                      >
                        {ch === "I" ? "I/J" : ch}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="max-w-56 text-sm text-muted">{ui.clickCell[locale]}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{decrypting ? polybiusDecrypt(text) : polybiusEncrypt(text)}</Out>
      </div>
    </div>
  );
}

// ── 4. Caesar ───────────────────────────────────────────────────────────

function CaesarBench({ locale }: BenchProps) {
  const [text, setText] = useState("Salom, Rooty!");
  const [shift, setShift] = useState(3);
  const [decrypting, setDecrypting] = useState(false);
  const [brute, setBrute] = useState(false);
  return (
    <div className="space-y-4">
      <Substitution map={(ch) => caesar(ch, shift)} />
      <div className="flex flex-wrap items-end gap-4">
        <Mode decrypting={decrypting} onChange={setDecrypting} locale={locale} />
        <Range label={ui.shift[locale]} value={shift} min={1} max={25} onChange={setShift} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{caesar(text, decrypting ? -shift : shift)}</Out>
      </div>
      <button
        type="button"
        aria-expanded={brute}
        onClick={() => setBrute((b) => !b)}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm hover:border-accent hover:text-accent"
      >
        <Zap aria-hidden className="size-4" /> {ui.brute[locale]}
      </button>
      {brute && (
        <ol className="max-h-64 overflow-y-auto rounded-xl bg-code p-3 font-mono text-xs leading-6 sm:text-sm">
          {caesarAll(text).map((row) => (
            <li key={row.shift} className="flex gap-3">
              <span className="w-6 shrink-0 text-right text-faint">{row.shift}</span>
              <span className="break-all">{row.text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ── 5. Frequency analysis ───────────────────────────────────────────────

function FrequencyBench({ locale }: BenchProps) {
  const [text, setText] = useState(() =>
    caesar("Bugun kechqurun soat yettida eski bog‘ yonida uchrashamiz. Hech kimga aytma va xatni o‘qib bo‘lgach yoqib yubor.", 6),
  );
  const [language, setLanguage] = useState<"uz" | "en">(locale === "en" ? "en" : "uz");
  const [guess, setGuess] = useState(0);
  const plain = caesar(text, -guess);
  const counts = letterCounts(plain);
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const expected = letterFrequencies[language];
  const top = Math.max(...counts.map((n) => (n / total) * 1000), ...expected, 1);
  return (
    <div className="space-y-4">
      <Field label={ui.cipherText[locale]} value={text} onChange={setText} rows={3} />
      <div className="flex flex-wrap items-end gap-4">
        <Toggle
          label={ui.language[locale]}
          value={language}
          onChange={setLanguage}
          options={[["uz", ui.uzbek[locale]], ["en", ui.english[locale]]]}
        />
        <Range label={ui.guess[locale]} value={guess} min={0} max={25} onChange={setGuess} />
        <button
          type="button"
          onClick={() => setGuess(crackCaesar(text, language))}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-hover"
        >
          <Sparkles aria-hidden className="size-4" /> {ui.auto[locale]}
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="flex h-40 min-w-[39rem] items-end gap-1" aria-hidden>
          {alphabet.map((ch, i) => (
            <div key={ch} className="relative flex h-full flex-1 flex-col items-center justify-end gap-1">
              <div className="relative w-full flex-1">
                <span className="absolute bottom-0 w-full rounded-t bg-accent/70" style={{ height: `${((counts[i] / total) * 1000 / top) * 100}%` }} />
                <span className="absolute h-0.5 w-full bg-warning" style={{ bottom: `${(expected[i] / top) * 100}%` }} />
              </div>
              <span className="font-mono text-[0.625rem] text-muted">{ch}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted">{ui.freqLegend[locale]}</p>
      <Out label={`${ui.preview[locale]} (${ui.shift[locale]} ${guess})`}>{plain}</Out>
    </div>
  );
}

// ── 6. Vigenère ─────────────────────────────────────────────────────────

function VigenereBench({ locale }: BenchProps) {
  const id = useId();
  const [text, setText] = useState("HUJUM TONGDA");
  const [key, setKey] = useState("ROOTY");
  const [decrypting, setDecrypting] = useState(false);
  const result = vigenere(text, key, decrypting);
  const k = lettersOnly(key);
  const rows = (() => {
    const shown = [...text.toUpperCase()].filter((ch) => /[A-Z]/.test(ch)).slice(0, 24);
    const out = lettersOnly(result).slice(0, 24);
    return shown.map((ch, i) => ({ ch, key: k ? k[i % k.length] : "·", out: out[i] }));
  })();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <Mode decrypting={decrypting} onChange={setDecrypting} locale={locale} />
        <label htmlFor={id} className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{ui.key[locale]}</span>
          <input
            id={id}
            value={key}
            onChange={(e) => setKey(e.target.value.replace(/[^A-Za-z]/g, "").slice(0, 16).toUpperCase())}
            autoComplete="off"
            spellCheck={false}
            className="h-9 w-40 rounded-lg border border-border bg-surface px-3 font-mono uppercase focus:border-accent focus:outline-none"
          />
        </label>
      </div>
      {rows.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-1 text-sm text-muted">{ui.table[locale]}</p>
          <table className="border-separate border-spacing-1 font-mono text-sm">
            <tbody>
              {(["ch", "key", "out"] as const).map((row) => (
                <tr key={row}>
                  {rows.map((cell, i) => (
                    <td
                      key={i}
                      className={`size-8 rounded text-center ${row === "key" ? "bg-warning-soft text-warning" : row === "out" ? "bg-accent-soft font-semibold text-accent-text" : "bg-surface-2"}`}
                    >
                      {cell[row]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{result}</Out>
      </div>
    </div>
  );
}

// ── 7. Pigpen ───────────────────────────────────────────────────────────

export function PigpenSymbol({ letter, size = 32 }: { letter: string; size?: number }) {
  const g = pigpen(letter);
  if (!g) return <span style={{ width: size / 2 }} className="inline-block" />;
  const lines: string[] = [];
  let dot: [number, number] = [16, 16];
  if (g.shape === "grid") {
    const [top, right, bottom, left] = g.walls;
    if (top) lines.push("M4 4H28");
    if (right) lines.push("M28 4V28");
    if (bottom) lines.push("M4 28H28");
    if (left) lines.push("M4 4V28");
  } else {
    const v = { up: "M4 6L16 26L28 6", down: "M4 26L16 6L28 26", left: "M6 4L26 16L6 28", right: "M26 4L6 16L26 28" }[g.opens];
    lines.push(v);
    dot = { up: [16, 14], down: [16, 18], left: [14, 16], right: [18, 16] }[g.opens] as [number, number];
  }
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-label={letter.toUpperCase()} role="img" className="shrink-0">
      <path d={lines.join("")} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {g.dot && <circle cx={dot[0]} cy={dot[1]} r="2.6" fill="currentColor" />}
    </svg>
  );
}

export function PigpenText({ text, size = 32 }: { text: string; size?: number }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {[...text].map((ch, i) => (
        <PigpenSymbol key={i} letter={ch} size={size} />
      ))}
    </span>
  );
}

function PigpenBench({ locale }: BenchProps) {
  const [text, setText] = useState("ROOTY TEAM");
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-muted">{ui.pigpenKey[locale]}</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1">
          {alphabet.map((ch) => (
            <div key={ch} className="flex flex-col items-center gap-1 rounded-lg bg-surface-2 py-1.5">
              <PigpenSymbol letter={ch} size={24} />
              <span className="font-mono text-xs text-muted">{ch}</span>
            </div>
          ))}
        </div>
      </div>
      <Field label={ui.message[locale]} value={text} onChange={setText} />
      <div className="text-sm">
        <span className="mb-1 block text-muted">{ui.result[locale]}</span>
        <div className="min-h-12 rounded-xl bg-code p-3 text-text">
          <PigpenText text={text.toUpperCase()} />
        </div>
      </div>
    </div>
  );
}

// ── 8. Morse ────────────────────────────────────────────────────────────

function MorseBench({ locale }: BenchProps) {
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [text, setText] = useState("SOS ROOTY");
  const [lamp, setLamp] = useState(false);
  const [playing, setPlaying] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const code = mode === "encode" ? morseEncode(text) : text;
  const result = mode === "encode" ? code : morseDecode(text);

  useEffect(() => () => stopRef.current(), []);

  function play() {
    if (playing) return stopRef.current();
    const unit = 90;
    const timers: number[] = [];
    let audio: AudioContext | null = null;
    let osc: OscillatorNode | null = null;
    let gain: GainNode | null = null;
    try {
      audio = new AudioContext();
      osc = audio.createOscillator();
      gain = audio.createGain();
      osc.frequency.value = 640;
      gain.gain.value = 0;
      osc.connect(gain).connect(audio.destination);
      osc.start();
    } catch {
      audio = null; // No sound available: the lamp still blinks.
    }
    let t = 0;
    const signal = (on: boolean, at: number) =>
      timers.push(
        window.setTimeout(() => {
          setLamp(on);
          if (gain && audio) gain.gain.setTargetAtTime(on ? 0.15 : 0, audio.currentTime, 0.005);
        }, at),
      );
    for (const word of code.split(" / ")) {
      for (const letter of word.split(" ")) {
        for (const mark of letter) {
          const len = mark === "-" ? 3 * unit : unit;
          signal(true, t);
          signal(false, t + len);
          t += len + unit;
        }
        t += 2 * unit;
      }
      t += 4 * unit;
    }
    const stop = () => {
      timers.forEach(clearTimeout);
      setLamp(false);
      setPlaying(false);
      osc?.stop();
      audio?.close();
      stopRef.current = () => {};
    };
    timers.push(window.setTimeout(stop, t));
    stopRef.current = stop;
    setPlaying(true);
  }

  return (
    <div className="space-y-4">
      <Toggle
        label={`${ui.textToMorse[locale]} / ${ui.morseToText[locale]}`}
        value={mode}
        onChange={(m) => {
          setMode(m);
          setText(m === "decode" ? morseEncode(text) : morseDecode(text));
        }}
        options={[["encode", ui.textToMorse[locale]], ["decode", ui.morseToText[locale]]]}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{result}</Out>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={play}
          disabled={!code.trim()}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-accent px-3 text-sm font-semibold text-on-accent hover:bg-accent-hover disabled:opacity-50"
        >
          {playing ? <Square aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          {playing ? ui.stop[locale] : ui.play[locale]}
        </button>
        <span
          aria-hidden
          className={`size-6 rounded-full border border-border transition-colors duration-75 ${lamp ? "bg-warning shadow-[0_0_18px_var(--warning)]" : "bg-surface-2"}`}
        />
      </div>
      <details className="rounded-xl border border-border p-3 text-sm">
        <summary className="cursor-pointer text-muted">A–Z, 0–9</summary>
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1 font-mono text-xs">
          {Object.entries(morse).map(([ch, c]) => (
            <span key={ch} className="rounded bg-surface-2 px-2 py-1">
              <b>{ch}</b> {c}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}

// ── 9. Enigma ───────────────────────────────────────────────────────────

const enigmaRows = ["QWERTZUIO", "ASDFGHJK", "PYXCVBNML"];

function EnigmaBench({ locale }: BenchProps) {
  const [start, setStart] = useState<Positions>([0, 0, 0]);
  const [positions, setPositions] = useState<Positions>([0, 0, 0]);
  const [typed, setTyped] = useState("");
  const [lit, setLit] = useState("");
  const [last, setLast] = useState<KeyPress | null>(null);

  function press(letter: string) {
    const result = pressKey(letter, positions);
    setPositions(result.positions);
    setTyped((t) => (t + result.input).slice(-60));
    setLit((t) => (t + result.output).slice(-60));
    setLast(result);
  }

  function reset(next: Positions = start) {
    setStart(next);
    setPositions(next);
    setTyped("");
    setLit("");
    setLast(null);
  }

  function turn(i: number, by: number) {
    const next = [...start] as Positions;
    next[i] = (next[i] + by + 26) % 26;
    reset(next);
  }

  const window_ = showPositions(positions);
  return (
    <div
      tabIndex={0}
      onKeyDown={(event) => {
        const k = event.key.toUpperCase();
        if (/^[A-Z]$/.test(k) && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          press(k);
        }
      }}
      className="space-y-4 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <p className="text-sm text-muted">{ui.enigmaTip[locale]}</p>
      <div className="flex flex-wrap items-center gap-6">
        <div>
          <p className="mb-1 text-sm text-muted">{ui.rotors[locale]}</p>
          <div className="flex gap-2">
            {["I", "II", "III"].map((name, i) => (
              <div key={name} className="flex flex-col items-center gap-1">
                <button type="button" aria-label={`${name} +`} onClick={() => turn(i, 1)} className="h-6 w-10 rounded border border-border text-xs hover:border-accent">▲</button>
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-code font-mono text-lg font-bold">{window_[i]}</span>
                <button type="button" aria-label={`${name} −`} onClick={() => turn(i, -1)} className="h-6 w-10 rounded border border-border text-xs hover:border-accent">▼</button>
                <span className="font-mono text-[0.625rem] text-faint">{name}</span>
              </div>
            ))}
          </div>
        </div>
        <button type="button" onClick={() => reset()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm">
          <RotateCcw aria-hidden className="size-4" /> {ui.reset[locale]} ({showPositions(start)})
        </button>
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted">{ui.lamps[locale]}</p>
        {enigmaRows.map((row) => (
          <div key={row} className="flex justify-center gap-1.5">
            {[...row].map((ch) => (
              <span
                key={ch}
                className={`grid size-8 place-items-center rounded-full font-mono text-sm transition-colors sm:size-9 ${last?.output === ch ? "bg-warning font-bold text-bg shadow-[0_0_16px_var(--warning)]" : "bg-surface-2 text-faint"}`}
              >
                {ch}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <p className="text-sm text-muted">{ui.keyboard[locale]}</p>
        {enigmaRows.map((row) => (
          <div key={row} className="flex justify-center gap-1.5">
            {[...row].map((ch) => (
              <button
                key={ch}
                type="button"
                tabIndex={-1}
                onClick={() => press(ch)}
                className="grid size-8 place-items-center rounded-full border border-border-strong bg-surface font-mono text-sm font-semibold active:bg-accent active:text-on-accent sm:size-9"
              >
                {ch}
              </button>
            ))}
          </div>
        ))}
      </div>

      {last && (
        <p className="overflow-x-auto font-mono text-xs whitespace-nowrap text-muted sm:text-sm">
          {ui.path[locale]}: <b className="text-text">{last.input}</b> → III {last.path[0]} → II {last.path[1]} → I {last.path[2]} → R {last.path[3]} → I {last.path[4]} → II {last.path[5]} → III {last.path[6]} → 💡 <b className="text-warning">{last.output}</b>
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Out label={ui.typed[locale]}>{typed}</Out>
        <Out label={ui.lit[locale]}>{lit}</Out>
      </div>
    </div>
  );
}

// ── 10. Public key (paint mixing) ───────────────────────────────────────

const commonColour: Rgb = [250, 204, 21];
const secrets: Rgb[] = [
  [220, 38, 38],
  [37, 99, 235],
  [22, 163, 74],
  [147, 51, 234],
  [236, 72, 153],
];

function Swatch({ rgb, label }: { rgb: Rgb; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <span className="size-12 rounded-full border border-border shadow-inner" style={{ background: rgbCss(rgb) }} />
      <span className="max-w-24 text-xs text-muted">{label}</span>
    </div>
  );
}

function PaintBench({ locale }: BenchProps) {
  const [a, setA] = useState(0);
  const [b, setB] = useState(1);
  const people = [
    { name: "Aziza", pick: a, setPick: setA },
    { name: "Bobur", pick: b, setPick: setB },
  ];
  const publicA = mix(commonColour, secrets[a]);
  const publicB = mix(commonColour, secrets[b]);
  // Three equal parts in any order: common + Aziza’s + Bobur’s secret.
  const shared = mix(commonColour, secrets[a], secrets[b]);
  const owner = (name: string) => `${name}${ui.secretOf[locale]}`;
  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <Swatch rgb={commonColour} label={ui.common[locale]} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {people.map((p, i) => (
          <div key={p.name} className="space-y-3 rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">{owner(p.name)}</p>
            <div role="radiogroup" aria-label={owner(p.name)} className="flex gap-2">
              {secrets.map((rgb, j) => (
                <button
                  key={j}
                  type="button"
                  role="radio"
                  aria-checked={p.pick === j}
                  aria-label={`${j + 1}`}
                  onClick={() => p.setPick(j)}
                  className="size-8 rounded-full border-2 border-transparent aria-checked:border-text"
                  style={{ background: rgbCss(rgb) }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Swatch rgb={i === 0 ? publicA : publicB} label={`${p.name} ${ui.sends[locale]}`} />
              <span aria-hidden className="text-muted">→</span>
              <Swatch rgb={shared} label={ui.shared[locale]} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-dashed border-danger bg-danger-soft p-4">
        <span className="text-sm font-semibold text-danger">{ui.eve[locale]}:</span>
        <Swatch rgb={commonColour} label="" />
        <Swatch rgb={publicA} label="" />
        <Swatch rgb={publicB} label="" />
      </div>
      <p className="rounded-lg bg-success-soft px-3 py-2 text-sm text-success">{ui.same[locale]}</p>
    </div>
  );
}

// ── Modern ciphers ──────────────────────────────────────────────────────

const mui = {
  key: { uz: "Kalit", kaa: "Gilt", ru: "Ключ", en: "Key" },
  hexIn: { uz: "Shifr (hex)", kaa: "Shifr (hex)", ru: "Шифр (hex)", en: "Ciphertext (hex)" },
  badHex: {
    uz: "Bu hex emas yoki kalit noto‘g‘ri.",
    kaa: "Bul hex emes yamasa gilt nadurıs.",
    ru: "Это не hex или ключ неверный.",
    en: "Not valid hex, or the wrong key.",
  },
  random: { uz: "Tasodifiy kalit", kaa: "Tosınnan gilt", ru: "Случайный ключ", en: "Random key" },
  bitsOf: { uz: "Birinchi baytlar bitlarda", kaa: "Birinshi baytlar bitlerde", ru: "Первые байты в битах", en: "First bytes in bits" },
  keyLen: {
    uz: "Kalit 8 belgi (64 bit, shundan 56 tasi ishlatiladi).",
    kaa: "Gilt 8 belgi (64 bit, onnan 56 sı qollanıladı).",
    ru: "Ключ — 8 символов (64 бита, из них используются 56).",
    en: "The key is 8 characters (64 bits, 56 of them used).",
  },
  block8: { uz: "Blok — 8 belgi", kaa: "Blok — 8 belgi", ru: "Блок — 8 символов", en: "Block — 8 characters" },
  block16: { uz: "Blok — 16 belgigacha", kaa: "Blok — 16 belgige shekem", ru: "Блок — до 16 символов", en: "Block — up to 16 characters" },
  rounds: { uz: "Raundlar", kaa: "Raundlar", ru: "Раунды", en: "Rounds" },
  state: { uz: "Shifrlangan holat (4×4)", kaa: "Shifrlanǵan jaǵday (4×4)", ru: "Зашифрованное состояние (4×4)", en: "Encrypted state (4×4)" },
  sbox: { uz: "S-box qidiruvi", kaa: "S-box izlew", ru: "Поиск по S-блоку", en: "S-box lookup" },
  stream: { uz: "Kalit oqimining birinchi baytlari", kaa: "Gilt aǵımınıń birinshi baytları", ru: "Первые байты ключевого потока", en: "First keystream bytes" },
  pickPrimes: { uz: "Tub sonlarni tanlang", kaa: "Jay sanlardı tańlań", ru: "Выберите простые числа", en: "Choose primes" },
  rsaSmall: {
    uz: "n 255 dan katta bo‘lishi kerak, aks holda harf kodlari sig‘maydi. Kattaroq tub sonlarni tanlang.",
    kaa: "n 255 ten úlken bolıwı kerek, bolmasa hárip kodları sıymaydı. Úlkenirek jay sanlardı tańlań.",
    ru: "n должно быть больше 255, иначе коды букв не поместятся. Выберите простые побольше.",
    en: "n must exceed 255 or letter codes won’t fit. Pick larger primes.",
  },
  publicKey: { uz: "Ochiq kalit", kaa: "Ashıq gilt", ru: "Открытый ключ", en: "Public key" },
  privateKey: { uz: "Yopiq kalit", kaa: "Jabıq gilt", ru: "Закрытый ключ", en: "Private key" },
  letter: { uz: "Harf", kaa: "Hárip", ru: "Буква", en: "Letter" },
  paintMode: { uz: "Bo‘yoq", kaa: "Boyaw", ru: "Краски", en: "Paint" },
  mathMode: { uz: "Raqamlar", kaa: "Sanlar", ru: "Числа", en: "Numbers" },
  prime: { uz: "Tub son p", kaa: "Jay san p", ru: "Простое p", en: "Prime p" },
  secretA: { uz: "Azizaning siri a", kaa: "Azizanıń sırı a", ru: "Секрет Азизы a", en: "Aziza’s secret a" },
  secretB: { uz: "Boburning siri b", kaa: "Boburdıń sırı b", ru: "Секрет Бобура b", en: "Bobur’s secret b" },
  textA: { uz: "Matn 1", kaa: "Tekst 1", ru: "Текст 1", en: "Text 1" },
  textB: { uz: "Matn 2", kaa: "Tekst 2", ru: "Текст 2", en: "Text 2" },
  bitsDiffer: { uz: "bit farq qiladi", kaa: "bit parıqlanadı", ru: "бит отличаются", en: "bits differ" },
} satisfies Record<string, Localized>;

function KeyInput({ label, value, onChange, max = 32 }: { label: string; value: string; onChange: (v: string) => void; max?: number }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-w-40 flex-1 flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, max))}
        autoComplete="off"
        spellCheck={false}
        className="h-9 rounded-lg border border-border bg-surface px-3 font-mono focus:border-accent focus:outline-none"
      />
    </label>
  );
}

function ModeHex({ decrypting, setDecrypting, text, setText, toHex, fromHex, locale }: {
  decrypting: boolean;
  setDecrypting: (d: boolean) => void;
  text: string;
  setText: (t: string) => void;
  toHex: (t: string) => string;
  fromHex: (h: string) => string | null;
  locale: Locale;
}) {
  // Switching modes carries the result over, so a round trip is one click.
  return (
    <Mode
      decrypting={decrypting}
      onChange={(d) => {
        if (d === decrypting) return;
        setText(d ? toHex(text) : (fromHex(text) ?? ""));
        setDecrypting(d);
      }}
      locale={locale}
    />
  );
}

function OtpBench({ locale }: BenchProps) {
  const [text, setText] = useState("SALOM");
  const [key, setKey] = useState("KEYXZ");
  const [decrypting, setDecrypting] = useState(false);
  const k = textToBytes(key);
  const toHex = (t: string) => hex(xorBytes(textToBytes(t), k));
  const fromHex = (h: string) => {
    const b = hexToBytes(h);
    return b ? bytesToText(xorBytes(b, k)) : null;
  };
  const result = decrypting ? fromHex(text) : toHex(text);
  const data = decrypting ? (hexToBytes(text) ?? []) : textToBytes(text);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <ModeHex decrypting={decrypting} setDecrypting={setDecrypting} text={text} setText={setText} toHex={toHex} fromHex={fromHex} locale={locale} />
        <KeyInput label={mui.key[locale]} value={key} onChange={setKey} />
        <button
          type="button"
          onClick={() => {
            const n = Math.max(1, decrypting ? (hexToBytes(text)?.length ?? 1) : textToBytes(text).length);
            setKey(Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => String.fromCharCode(65 + (b % 26))).join(""));
          }}
          className="h-9 rounded-lg border border-border px-3 text-sm hover:border-accent"
        >
          {mui.random[locale]}
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={decrypting ? mui.hexIn[locale] : ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{result ?? <span className="text-danger">{mui.badHex[locale]}</span>}</Out>
      </div>
      {data.length > 0 && k.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-1 text-sm text-muted">{mui.bitsOf[locale]}</p>
          <table className="font-mono text-xs">
            <tbody>
              {data.slice(0, 3).map((b, i) => (
                <tr key={i} className="align-top">
                  <td className="pr-3 pb-2 text-muted">{i + 1}</td>
                  <td className="pr-2 pb-2">{bits(b)}</td>
                  <td className="pr-2 pb-2 text-warning">⊕ {bits(k[i % k.length])}</td>
                  <td className="pb-2 text-accent-text">= {bits(b ^ k[i % k.length])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DesBench({ locale }: BenchProps) {
  const [text, setText] = useState("ROOTY!!!");
  const [key, setKey] = useState("SIRKALIT");
  const [decrypting, setDecrypting] = useState(false);
  const k = textToBytes(key.padEnd(8, "\0")).slice(0, 8);
  const block = (t: string) => textToBytes(t.padEnd(8, " ")).slice(0, 8);
  const toHex = (t: string) => hex(desBlock(block(t), k).output, "");
  const fromHex = (h: string) => {
    const b = hexToBytes(h);
    return b && b.length === 8 ? bytesToText(desBlock(b, k, true).output) : null;
  };
  const input = decrypting ? hexToBytes(text) : block(text);
  const run = input && input.length === 8 ? desBlock(input, k, decrypting) : null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <ModeHex decrypting={decrypting} setDecrypting={setDecrypting} text={text} setText={setText} toHex={toHex} fromHex={fromHex} locale={locale} />
        <KeyInput label={mui.key[locale]} value={key} onChange={setKey} max={8} />
      </div>
      <p className="text-xs text-muted">{mui.keyLen[locale]} {mui.block8[locale]}.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={decrypting ? mui.hexIn[locale] : ui.message[locale]} value={text} onChange={(v) => setText(decrypting ? v : v.slice(0, 8))} />
        <Out label={ui.result[locale]}>
          {run ? (decrypting ? bytesToText(run.output) : hex(run.output, "")) : <span className="text-danger">{mui.badHex[locale]}</span>}
        </Out>
      </div>
      {run && (
        <details className="rounded-xl border border-border p-3 text-sm" open>
          <summary className="cursor-pointer text-muted">{mui.rounds[locale]} (16)</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead className="text-muted">
                <tr>
                  <th className="px-2 text-left">#</th>
                  <th className="px-2 text-left">Kᵢ</th>
                  <th className="px-2 text-left">F(R, Kᵢ)</th>
                  <th className="px-2 text-left">L</th>
                  <th className="px-2 text-left">R</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-faint">
                  <td className="px-2">IP</td>
                  <td className="px-2">—</td>
                  <td className="px-2">—</td>
                  <td className="px-2">{run.initial.left}</td>
                  <td className="px-2">{run.initial.right}</td>
                </tr>
                {run.rounds.map((r) => (
                  <tr key={r.round} className="odd:bg-surface-2/50">
                    <td className="px-2 text-muted">{r.round}</td>
                    <td className="px-2 text-warning">{r.key}</td>
                    <td className="px-2">{r.f}</td>
                    <td className="px-2">{r.left}</td>
                    <td className="px-2 text-accent-text">{r.right}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}

function AesBench({ locale }: BenchProps) {
  const [text, setText] = useState("Salom, AES!");
  const [key, setKey] = useState("rooty-team-2026");
  const [decrypting, setDecrypting] = useState(false);
  const [lookup, setLookup] = useState("53");
  const k = keyFromText(key);
  const toHex = (t: string) => hex(aesEncryptBlock(toBlock(t), k).output, "");
  const fromHex = (h: string) => {
    const b = hexToBytes(h);
    return b && b.length === 16 ? fromBlock(aesDecryptBlock(b, k)) : null;
  };
  const out = decrypting ? null : aesEncryptBlock(toBlock(text), k).output;
  const byte = hexToBytes(lookup.padStart(2, "0"));
  const sboxId = useId();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <ModeHex decrypting={decrypting} setDecrypting={setDecrypting} text={text} setText={setText} toHex={toHex} fromHex={fromHex} locale={locale} />
        <KeyInput label={`${mui.key[locale]} (16)`} value={key} onChange={setKey} max={16} />
      </div>
      <p className="text-xs text-muted">{mui.block16[locale]}.</p>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={decrypting ? mui.hexIn[locale] : ui.message[locale]} value={text} onChange={(v) => setText(decrypting ? v : v.slice(0, 16))} />
        <Out label={ui.result[locale]}>{decrypting ? (fromHex(text) ?? <span className="text-danger">{mui.badHex[locale]}</span>) : toHex(text)}</Out>
      </div>
      <div className="flex flex-wrap items-start gap-6">
        {out && (
          <div>
            <p className="mb-1 text-sm text-muted">{mui.state[locale]}</p>
            <div className="grid grid-cols-4 gap-1">
              {Array.from({ length: 16 }, (_, n) => (
                <span key={n} className="grid size-10 place-items-center rounded bg-accent-soft font-mono text-xs font-semibold text-accent-text">
                  {out[(n % 4) * 4 + Math.floor(n / 4)].toString(16).padStart(2, "0")}
                </span>
              ))}
            </div>
          </div>
        )}
        <label htmlFor={sboxId} className="flex flex-col gap-1 text-sm">
          <span className="text-muted">{mui.sbox[locale]}</span>
          <span className="flex items-center gap-2 font-mono">
            <input
              id={sboxId}
              value={lookup}
              onChange={(e) => setLookup(e.target.value.replace(/[^0-9a-f]/gi, "").slice(0, 2))}
              className="h-9 w-16 rounded-lg border border-border bg-surface px-3 uppercase focus:border-accent focus:outline-none"
            />
            → <b className="text-accent-text">{byte ? aesSbox[byte[0]].toString(16).padStart(2, "0") : "??"}</b>
          </span>
        </label>
      </div>
    </div>
  );
}

function Rc4Bench({ locale }: BenchProps) {
  const [text, setText] = useState("Plaintext");
  const [key, setKey] = useState("Key");
  const [decrypting, setDecrypting] = useState(false);
  const k = textToBytes(key);
  const toHex = (t: string) => hex(rc4(textToBytes(t), k));
  const fromHex = (h: string) => {
    const b = hexToBytes(h);
    return b ? bytesToText(rc4(b, k)) : null;
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <ModeHex decrypting={decrypting} setDecrypting={setDecrypting} text={text} setText={setText} toHex={toHex} fromHex={fromHex} locale={locale} />
        <KeyInput label={mui.key[locale]} value={key} onChange={setKey} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={decrypting ? mui.hexIn[locale] : ui.message[locale]} value={text} onChange={setText} />
        <Out label={ui.result[locale]}>{(decrypting ? fromHex(text) : toHex(text)) ?? <span className="text-danger">{mui.badHex[locale]}</span>}</Out>
      </div>
      {k.length > 0 && (
        <div>
          <p className="mb-1 text-sm text-muted">{mui.stream[locale]}</p>
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            {rc4Keystream(k, 16).map((s, n) => (
              <span key={n} className="rounded px-1.5 py-1 text-bg" style={{ background: `hsl(${(s.k * 300) / 255} 75% 60%)` }}>
                {s.k.toString(16).padStart(2, "0")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const smallPrimes = Array.from({ length: 100 }, (_, n) => n).filter(isPrime).filter((n) => n > 10);

function RsaBench({ locale }: BenchProps) {
  const [p, setP] = useState(61);
  const [q, setQ] = useState(53);
  const [text, setText] = useState("Salom");
  const keys = rsaKeys(p, q, 17) ?? rsaKeys(p, q);
  const select = (label: string, value: number, set: (n: number) => void) => (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-muted">{label}</span>
      <select value={value} onChange={(e) => set(+e.target.value)} className="h-9 rounded-lg border border-border bg-surface px-2 font-mono">
        {smallPrimes.map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
    </label>
  );
  const codes = textToBytes(text).slice(0, 12);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <span className="text-sm text-muted">{mui.pickPrimes[locale]}:</span>
        {select("p", p, setP)}
        {select("q", q, setQ)}
      </div>
      {keys ? (
        <>
          <div className="grid gap-2 font-mono text-sm sm:grid-cols-3">
            <span className="rounded-lg bg-surface-2 px-3 py-2">n = {String(keys.n)} · φ = {String(keys.phi)}</span>
            <span className="rounded-lg bg-success-soft px-3 py-2 text-success">{mui.publicKey[locale]}: (n={String(keys.n)}, e={String(keys.e)})</span>
            <span className="rounded-lg bg-danger-soft px-3 py-2 text-danger">{mui.privateKey[locale]}: d={String(keys.d)}</span>
          </div>
          <Field label={ui.message[locale]} value={text} onChange={setText} />
          {keys.n <= 255n ? (
            <p className="text-sm text-warning">{mui.rsaSmall[locale]}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="font-mono text-xs sm:text-sm">
                <thead className="text-muted">
                  <tr>
                    <th className="px-2 text-left">{mui.letter[locale]}</th>
                    <th className="px-2 text-left">m</th>
                    <th className="px-2 text-left">c = mᵉ mod n</th>
                    <th className="px-2 text-left">cᵈ mod n</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((m, n) => {
                    const c = rsaEncrypt(BigInt(m), keys);
                    return (
                      <tr key={n}>
                        <td className="px-2">{String.fromCharCode(m)}</td>
                        <td className="px-2">{m}</td>
                        <td className="px-2 text-accent-text">{String(c)}</td>
                        <td className="px-2 text-success">{String(rsaDecrypt(c, keys))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-danger">p ≠ q</p>
      )}
    </div>
  );
}

const dhPrimes = [23, 47, 97, 101, 997];

function DhBench({ locale }: BenchProps) {
  const [mode, setMode] = useState<"paint" | "math">("paint");
  const [p, setP] = useState(23);
  const [a, setA] = useState(6);
  const [b, setB] = useState(15);
  const g = 5;
  const dh = diffieHellman(p, g, Math.min(a, p - 2), Math.min(b, p - 2));
  return (
    <div className="space-y-5">
      <Toggle label={`${mui.paintMode[locale]} / ${mui.mathMode[locale]}`} value={mode} onChange={setMode} options={[["paint", mui.paintMode[locale]], ["math", mui.mathMode[locale]]]} />
      {mode === "paint" ? (
        <PaintBench locale={locale} />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted">{mui.prime[locale]}</span>
              <select value={p} onChange={(e) => setP(+e.target.value)} className="h-9 rounded-lg border border-border bg-surface px-2 font-mono">
                {dhPrimes.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <span className="font-mono text-sm text-muted">g = {g}</span>
            <Range label={mui.secretA[locale]} value={Math.min(a, p - 2)} min={2} max={p - 2} onChange={setA} />
            <Range label={mui.secretB[locale]} value={Math.min(b, p - 2)} min={2} max={p - 2} onChange={setB} />
          </div>
          <div className="grid gap-2 font-mono text-sm sm:grid-cols-2">
            <span className="rounded-lg bg-surface-2 px-3 py-2">A = {g}^{Math.min(a, p - 2)} mod {p} = <b>{String(dh.A)}</b></span>
            <span className="rounded-lg bg-surface-2 px-3 py-2">B = {g}^{Math.min(b, p - 2)} mod {p} = <b>{String(dh.B)}</b></span>
            <span className="rounded-lg bg-success-soft px-3 py-2 text-success">Aziza: B^a mod p = {String(dh.sharedA)}</span>
            <span className="rounded-lg bg-success-soft px-3 py-2 text-success">Bobur: A^b mod p = {String(dh.sharedB)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function ShaBench({ locale }: BenchProps) {
  const [one, setOne] = useState("salom");
  const [two, setTwo] = useState("Salom");
  const h1 = sha256(textToBytes(one));
  const h2 = sha256(textToBytes(two));
  const diff = bitDifference(h1, h2);
  const toBits = (h: string) => [...h].flatMap((c) => [...parseInt(c, 16).toString(2).padStart(4, "0")]);
  const b1 = toBits(h1);
  const b2 = toBits(h2);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Field label={mui.textA[locale]} value={one} onChange={setOne} rows={1} />
          <p className="font-mono text-xs break-all text-accent-text">{h1}</p>
        </div>
        <div className="space-y-2">
          <Field label={mui.textB[locale]} value={two} onChange={setTwo} rows={1} />
          <p className="font-mono text-xs break-all text-warning">{h2}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="grid grid-cols-32 gap-px" aria-hidden>
          {b1.map((bit, n) => (
            <span key={n} className={`size-2.5 rounded-[2px] ${bit !== b2[n] ? "bg-danger" : "bg-surface-2"}`} />
          ))}
        </div>
        <p className="font-mono text-sm">
          <b className={diff ? "text-danger" : "text-success"}>{diff}</b> / 256 {mui.bitsDiffer[locale]}
        </p>
      </div>
    </div>
  );
}

export const benches: Record<CipherId, ComponentType<BenchProps>> = {
  atbash: AtbashBench,
  scytale: ScytaleBench,
  polybius: PolybiusBench,
  caesar: CaesarBench,
  frequency: FrequencyBench,
  vigenere: VigenereBench,
  pigpen: PigpenBench,
  morse: MorseBench,
  otp: OtpBench,
  enigma: EnigmaBench,
  dh: DhBench,
  des: DesBench,
  rsa: RsaBench,
  rc4: Rc4Bench,
  aes: AesBench,
  sha256: ShaBench,
};
