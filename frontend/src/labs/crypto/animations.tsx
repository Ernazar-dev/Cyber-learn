
import { useEffect, useState, useSyncExternalStore, type ComponentType, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Lock, Pause, Play, Unlock } from "lucide-react";
import type { Locale, Localized } from "@/labs/i18n";
import {
  atbash,
  caesar,
  letterCounts,
  letterFrequencies,
  mix,
  morse,
  pigpen,
  polybiusCell,
  polybiusSquare,
  rgbCss,
  scytaleRows,
  vigenere,
  type Rgb,
} from "@/labs/sim/crypto";
import { pressKey, showPositions } from "@/labs/sim/enigma";
import {
  aesEncryptBlock,
  bitDifference,
  bits,
  desBlock,
  diffieHellman,
  hex,
  hexToBytes,
  rsaKeys,
  rsaEncrypt,
  sha256,
  textToBytes,
  type AesStage,
} from "@/labs/sim/modern";
import { PigpenSymbol } from "./benches";
import type { CipherId } from "./ciphers";

// "How it works" animations: each cipher plays a small, real example step by
// step. Every value shown is computed by the same functions the benches use.
// Playback pauses off-screen and never autoplays for reduced-motion users.

type Props = { locale: Locale };
const L = (uz: string, kaa: string, ru: string, en: string): Localized => ({ uz, kaa, ru, en });

const ui = {
  title: L("Qanday ishlaydi — animatsiya", "Qalay isleydi — animaciya", "Как это работает — анимация", "How it works — animation"),
  play: L("Ijro", "Oynatıw", "Пуск", "Play"),
  pause: L("Pauza", "Pauza", "Пауза", "Pause"),
  prev: L("Oldingi qadam", "Aldıńǵı qádem", "Предыдущий шаг", "Previous step"),
  next: L("Keyingi qadam", "Keyingi qádem", "Следующий шаг", "Next step"),
  step: L("Qadam", "Qádem", "Шаг", "Step"),
};

// ── Player ──────────────────────────────────────────────────────────────

function subscribeMotion(listener: () => void) {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

function usePlayer(length: number, wait: number | ((step: number) => number) = 1400) {
  const reduced = useSyncExternalStore(subscribeMotion, () => matchMedia("(prefers-reduced-motion: reduce)").matches, () => true);
  const [raw, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [visible, setVisible] = useState(false);
  const step = raw % length;

  const playing = !paused && !reduced && visible;
  const delay = typeof wait === "number" ? wait : wait(step);
  // The last frame stays up a little longer before the loop restarts.
  const hold = step === length - 1 ? delay + 1600 : delay;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % length), hold);
    return () => window.clearTimeout(timer);
  }, [playing, step, hold, length]);

  return {
    setVisible,
    step,
    length,
    playing,
    reduced,
    paused,
    toggle: () => setPaused((p) => !p),
    go: (to: number) => {
      setPaused(true);
      setStep(((to % length) + length) % length);
    },
  };
}
type Player = ReturnType<typeof usePlayer>;

function Frame({ player, caption, locale, children }: { player: Player; caption: ReactNode; locale: Locale; children: ReactNode }) {
  const { step, length, setVisible } = player;
  // Playback pauses while the frame is off-screen. The node is kept in state
  // (a callback ref) so the observer attaches once it mounts.
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.3 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, setVisible]);
  return (
    <div ref={setNode} className="overflow-hidden rounded-2xl border border-border bg-bg/60">
      <div className="flex min-h-56 flex-col items-center justify-center gap-5 overflow-x-auto p-4 sm:p-6">{children}</div>
      <div className="flex flex-col gap-3 border-t border-border bg-surface-2/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p key={step} aria-live="polite" className="text-sm leading-relaxed transition-opacity duration-500 starting:opacity-0">
          {caption}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs text-muted">
            {ui.step[locale]} {step + 1}/{length}
          </span>
          <button type="button" aria-label={ui.prev[locale]} onClick={() => player.go(step - 1)} className="grid size-8 place-items-center rounded-lg border border-border hover:border-accent">
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <button
            type="button"
            aria-label={player.playing ? ui.pause[locale] : ui.play[locale]}
            onClick={player.toggle}
            className="grid size-8 place-items-center rounded-lg bg-accent text-on-accent hover:bg-accent-hover"
          >
            {player.playing ? <Pause aria-hidden className="size-4" /> : <Play aria-hidden className="size-4" />}
          </button>
          <button type="button" aria-label={ui.next[locale]} onClick={() => player.go(step + 1)} className="grid size-8 place-items-center rounded-lg border border-border hover:border-accent">
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
      <div className="h-1 bg-border">
        <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${((step + 1) / length) * 100}%` }} />
      </div>
    </div>
  );
}

type TileState = "idle" | "active" | "done" | "ghost";
function Tile({ children, state = "idle", wide = false }: { children: ReactNode; state?: TileState; wide?: boolean }) {
  const look = {
    idle: "border-border bg-surface text-text",
    active: "-translate-y-1.5 scale-110 border-accent bg-accent text-on-accent shadow-[0_0_24px_var(--glow)]",
    done: "border-accent/40 bg-accent-soft text-accent-text",
    ghost: "border-dashed border-border bg-transparent text-faint",
  }[state];
  return (
    <span
      className={`grid h-10 place-items-center rounded-lg border font-mono text-base font-semibold transition-all duration-500 ${wide ? "min-w-14 px-2" : "w-10"} ${look}`}
    >
      {children}
    </span>
  );
}

/** One letter at a time: input row, the operation, the growing output row. */
function LetterMachine({
  player,
  inputs,
  outputs,
  op,
  aside,
  wideOut = false,
}: {
  player: Player;
  inputs: string[];
  outputs: ReactNode[];
  op: (i: number) => ReactNode;
  aside?: (i: number) => ReactNode;
  wideOut?: boolean;
}) {
  const i = player.step;
  const n = inputs.length;
  return (
    <>
      <div className="flex flex-wrap justify-center gap-2">
        {inputs.map((ch, k) => (
          <Tile key={k} state={k === i ? "active" : k < i ? "done" : "idle"}>
            {ch}
          </Tile>
        ))}
      </div>
      <div key={`op${i}`} className="rounded-full border border-border bg-surface px-4 py-1.5 font-mono text-sm transition-all duration-500 starting:translate-y-2 starting:opacity-0">
        {i < n ? op(i) : "✓"}
      </div>
      {aside && i < n && aside(i)}
      <div className="flex flex-wrap justify-center gap-2">
        {outputs.map((out, k) => (
          <Tile key={k} state={k < i || i >= n ? "done" : k === i ? "active" : "ghost"} wide={wideOut}>
            {k <= i || i >= n ? out : "?"}
          </Tile>
        ))}
      </div>
    </>
  );
}

const letters = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];

/** A–Z with one or two letters lit, for showing where a letter moves. */
function Strip({ from, to, top = letters, bottom }: { from: number; to?: number; top?: string[]; bottom?: string[] }) {
  return (
    <div className="grid w-full max-w-2xl min-w-[34rem] grid-cols-[repeat(26,minmax(0,1fr))] gap-0.5 font-mono text-[0.6875rem]">
      {top.map((ch, k) => (
        <span key={`t${k}`} className={`grid h-6 place-items-center rounded transition-colors duration-500 ${k === from ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"}`}>
          {ch}
        </span>
      ))}
      {bottom?.map((ch, k) => (
        <span key={`b${k}`} className={`grid h-6 place-items-center rounded transition-colors duration-500 ${k === to ? "bg-warning text-bg" : "bg-surface-2 text-faint"}`}>
          {ch}
        </span>
      ))}
    </div>
  );
}

// ── Classical ciphers ───────────────────────────────────────────────────

function AtbashAnim({ locale }: Props) {
  const word = [..."SALOM"];
  const player = usePlayer(word.length + 1);
  const i = player.step;
  const ch = word[i];
  const idx = ch ? ch.charCodeAt(0) - 65 : -1;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        ch
          ? L(
              `${ch} — alifboning boshidan ${idx + 1}-harf. Ko‘zgudagi jufti — oxiridan ${idx + 1}-harf: ${atbash(ch)}.`,
              `${ch} — álipbeniń basınan ${idx + 1}-hárip. Aynadaǵı jubı — aqırınan ${idx + 1}-hárip: ${atbash(ch)}.`,
              `${ch} — ${idx + 1}-я буква с начала алфавита. Её зеркальная пара — ${idx + 1}-я с конца: ${atbash(ch)}.`,
              `${ch} is letter ${idx + 1} from the start. Its mirror partner is letter ${idx + 1} from the end: ${atbash(ch)}.`,
            )[locale]
          : L("Tayyor: SALOM → HZOLN. Yana bir marta qo‘llasangiz — SALOM qaytadi.", "Tayın: SALOM → HZOLN. Jáne bir ret qollasańız — SALOM qaytadı.", "Готово: SALOM → HZOLN. Примените ещё раз — вернётся SALOM.", "Done: SALOM → HZOLN. Apply it again and SALOM comes back.")[locale]
      }
    >
      <LetterMachine
        player={player}
        inputs={word}
        outputs={word.map(atbash)}
        op={(k) => `${word[k]} ↔ ${atbash(word[k])}`}
        aside={() => <div className="w-full overflow-x-auto"><Strip from={idx} to={idx} bottom={[...letters].reverse()} /></div>}
      />
    </Frame>
  );
}

function ScytaleAnim({ locale }: Props) {
  const text = "SPARTAKELDI";
  const grid = scytaleRows(text, 3);
  const cols = grid[0].length;
  const total = grid.length * cols;
  const player = usePlayer(total + cols + 1, 700);
  const s = player.step;
  const writing = s < total;
  const readCol = writing ? -1 : s - total;
  const strip = writing ? [] : grid[0].slice(0, Math.min(readCol + 1, cols)).flatMap((_, c) => grid.map((row) => row[c]));
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        writing
          ? L("1) Xabar tayoqcha atrofidagi tasmaga qatorma-qator yoziladi.", "1) Xabar tayaqsha átirapındaǵı taspaǵa qatarma-qatar jazıladı.", "1) Сообщение пишут на ленту вдоль жезла — строка за строкой.", "1) The message is written along the rod, row by row.")[locale]
          : readCol < cols
            ? L(`2) Tasma yechiladi: ${readCol + 1}-ustun o‘qiladi.`, `2) Taspa sheshiledi: ${readCol + 1}-baǵana oqıladı.`, `2) Ленту разматывают: читается столбец ${readCol + 1}.`, `2) Unwinding the strip: column ${readCol + 1} is read.`)[locale]
            : L("Tayyor! Tasmadagi harflar aralashib ketdi. Faqat 3 qatorli tayoqcha ularni qayta tiklaydi.", "Tayın! Taspadaǵı háripler aralasıp ketti. Tek 3 qatarlı tayaqsha olardı qayta tiklaydi.", "Готово! Буквы на ленте перемешаны. Вернуть порядок может только жезл на 3 строки.", "Done! The letters are scrambled. Only a 3-row rod puts them back.")[locale]
      }
    >
      <div className="rounded-xl bg-[linear-gradient(90deg,#6b3d15,#b0793f_45%,#6b3d15)] p-2 shadow-inner">
        {grid.map((row, r) => (
          <div key={r} className="flex gap-1 py-0.5">
            {row.map((ch, c) => {
              const index = r * cols + c;
              const shown = !writing || index < s + 1;
              const lit = writing ? index === s : c === readCol;
              return (
                <span
                  key={c}
                  className={`grid size-9 place-items-center rounded font-mono font-bold transition-all duration-500 ${shown ? "bg-[#f3e2c3] text-[#3b2410]" : "bg-[#f3e2c3]/20 text-transparent"} ${lit ? "ring-2 ring-warning ring-offset-1 ring-offset-[#6b3d15]" : ""}`}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex min-h-10 flex-wrap justify-center gap-1">
        {strip.map((ch, k) => (
          <span key={k} className="grid h-9 w-7 place-items-center rounded bg-[#f3e2c3] font-mono font-bold text-[#3b2410] transition-all duration-300 starting:scale-50 starting:opacity-0">
            {ch}
          </span>
        ))}
      </div>
    </Frame>
  );
}

function PolybiusAnim({ locale }: Props) {
  const word = [..."ROOTY"];
  const player = usePlayer(word.length + 1, 1600);
  const i = player.step;
  const cell = word[i] ? polybiusCell(word[i]) : null;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        cell
          ? L(`${word[i]}: ${cell[0]}-qator, ${cell[1]}-ustun → ${cell.join("")}`, `${word[i]}: ${cell[0]}-qatar, ${cell[1]}-baǵana → ${cell.join("")}`, `${word[i]}: строка ${cell[0]}, столбец ${cell[1]} → ${cell.join("")}`, `${word[i]}: row ${cell[0]}, column ${cell[1]} → ${cell.join("")}`)[locale]
          : L("Har bir harf ikki raqamga aylandi — mash’alalar bilan ham uzatish mumkin!", "Hár bir hárip eki sanǵa aylandı — mash’alalar menen de jetkeriw múmkin!", "Каждая буква стала двумя цифрами — их можно передать даже факелами!", "Each letter became two digits — you could even send them with torches!")[locale]
      }
    >
      <LetterMachine
        player={player}
        inputs={word}
        outputs={word.map((ch) => polybiusCell(ch)!.join(""))}
        wideOut
        op={(k) => `${word[k]} → (${polybiusCell(word[k])!.join(", ")})`}
        aside={() => (
          <div className="grid grid-cols-6 gap-1 font-mono text-xs">
            <span />
            {[1, 2, 3, 4, 5].map((c) => (
              <span key={c} className={`grid size-7 place-items-center ${cell?.[1] === c ? "font-bold text-warning" : "text-faint"}`}>{c}</span>
            ))}
            {polybiusSquare.map((line, r) => (
              <div key={line} className="contents">
                <span className={`grid size-7 place-items-center ${cell?.[0] === r + 1 ? "font-bold text-warning" : "text-faint"}`}>{r + 1}</span>
                {[...line].map((ch, c) => {
                  const inRow = cell?.[0] === r + 1;
                  const inCol = cell?.[1] === c + 1;
                  return (
                    <span
                      key={ch}
                      className={`grid size-7 place-items-center rounded transition-colors duration-500 ${inRow && inCol ? "bg-accent font-bold text-on-accent" : inRow || inCol ? "bg-warning-soft text-warning" : "bg-surface-2 text-muted"}`}
                    >
                      {ch}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      />
    </Frame>
  );
}

function CaesarAnim({ locale }: Props) {
  const word = [..."SALOM"];
  const shift = 3;
  // Step 0: wheel aligned, step 1: inner wheel turns, then one letter per step.
  const player = usePlayer(word.length + 3, 1500);
  const s = player.step;
  const turned = s >= 1 ? shift : 0;
  const k = s - 2;
  const ch = word[k];
  const idx = ch ? ch.charCodeAt(0) - 65 : -1;
  const step = 360 / 26;
  const at = (n: number, r: number) => {
    const a = ((n * step - 90) * Math.PI) / 180;
    return { x: 120 + r * Math.cos(a), y: 120 + r * Math.sin(a) };
  };
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        s === 0
          ? L("Sezar g‘ildiragi: tashqi halqa — ochiq matn, ichki — shifr.", "Sezar dóńgelegi: sırtqı halqa — ashıq tekst, ishki — shifr.", "Колесо Цезаря: внешнее кольцо — открытый текст, внутреннее — шифр.", "The Caesar wheel: outer ring is plaintext, inner ring is ciphertext.")[locale]
          : s === 1
            ? L("Ichki halqani 3 qadam buramiz — bu kalit.", "Ishki halqanı 3 qádem buraymız — bul gilt.", "Поворачиваем внутреннее кольцо на 3 — это ключ.", "Turn the inner ring by 3 — that is the key.")[locale]
            : ch
              ? `${ch} + 3 → ${caesar(ch, shift)}`
              : L("Tayyor: SALOM → VDORP. Ochish uchun g‘ildirakni teskari buring.", "Tayın: SALOM → VDORP. Ashıw ushın dóńgelekti keri burań.", "Готово: SALOM → VDORP. Чтобы расшифровать, крутите обратно.", "Done: SALOM → VDORP. To decrypt, turn the wheel back.")[locale]
      }
    >
      <div className="flex flex-wrap items-center justify-center gap-6">
        <svg viewBox="0 0 240 240" className="size-60 shrink-0" role="img" aria-label="Caesar wheel">
          <circle cx="120" cy="120" r="112" className="fill-surface stroke-border" />
          <circle cx="120" cy="120" r="84" className="fill-surface-2 stroke-border" />
          {/* A soft band behind the outer letter and the inner letter it becomes. */}
          {idx >= 0 && (
            <line {...(() => { const a = at(idx, 104); const b = at(idx, 64); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; })()} className="stroke-accent" strokeOpacity="0.3" strokeWidth="20" strokeLinecap="round" />
          )}
          {letters.map((l, n) => {
            const p = at(n, 98);
            return (
              <text key={l} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className={`font-mono text-[11px] ${n === idx ? "fill-accent font-bold" : "fill-muted"}`}>
                {l}
              </text>
            );
          })}
          <g style={{ transform: `rotate(${-turned * step}deg)`, transformOrigin: "120px 120px", transition: "transform 1s ease-in-out" }}>
            {letters.map((l, n) => {
              const p = at(n, 70);
              const lit = idx >= 0 && n === (idx + shift) % 26;
              return (
                <text
                  key={l}
                  x={p.x}
                  y={p.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  // Counter-rotate each letter so it stays upright while the ring turns.
                  style={{ transform: `rotate(${turned * step}deg)`, transformBox: "fill-box", transformOrigin: "center", transition: "transform 1s ease-in-out" }}
                  className={`font-mono text-[11px] ${lit ? "fill-warning font-bold" : "fill-text"}`}
                >
                  {l}
                </text>
              );
            })}
          </g>
          <text x="120" y="120" textAnchor="middle" dominantBaseline="central" className="fill-accent font-mono text-2xl font-bold">
            +{turned}
          </text>
        </svg>
        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {word.map((c, n) => (
              <Tile key={n} state={n === k ? "active" : n < k ? "done" : "idle"}>{c}</Tile>
            ))}
          </div>
          <div className="flex gap-1.5">
            {word.map((c, n) => (
              <Tile key={n} state={k > n || k >= word.length ? "done" : n === k ? "active" : "ghost"}>
                {n <= k ? caesar(c, shift) : "?"}
              </Tile>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

const freqSample = "Kiberxavfsizlik mutaxassisi har kuni yangi narsalarni organadi va tarmoqlarni tekshiradi";

function FrequencyAnim({ locale }: Props) {
  const key = 9;
  const cipher = caesar(freqSample, key);
  const player = usePlayer(key + 2, 1100);
  const guess = Math.min(player.step, key);
  const counts = letterCounts(caesar(cipher, -guess));
  const total = counts.reduce((a, b) => a + b, 0);
  const expected = letterFrequencies.uz;
  const top = Math.max(...counts.map((n) => (n / total) * 1000), ...expected);
  const diff = Math.round(
    counts.reduce((sum, n, i) => {
      const want = Math.max((expected[i] / 1000) * total, 0.5);
      return sum + (n - want) ** 2 / want;
    }, 0),
  );
  const found = guess === key;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        found
          ? L(`Kalit ${key}: ustunlar chiziqlarga mos tushdi — farq eng kichik (${diff}). Shifr ochildi!`, `Gilt ${key}: baǵanalar sızıqlarǵa sáykes tústi — ayırma eń kishi (${diff}). Shifr ashıldı!`, `Ключ ${key}: столбцы совпали с черточками — разница минимальна (${diff}). Шифр взломан!`, `Key ${key}: the bars match the ticks — the difference is smallest (${diff}). Cracked!`)[locale]
          : L(`Kalit ${guess} ni sinaymiz: farq ${diff}. Ustunlar (matn) chiziqlarga (o‘zbek tili) mos emas.`, `Gilt ${guess} ti sınaymız: ayırma ${diff}. Baǵanalar (tekst) sızıqlarǵa (ózbek tili) sáykes emes.`, `Пробуем ключ ${guess}: разница ${diff}. Столбцы (текст) не совпадают с черточками (узбекский язык).`, `Trying key ${guess}: difference ${diff}. The bars (text) don’t match the ticks (Uzbek).`)[locale]
      }
    >
      <div className="flex h-40 w-full max-w-2xl min-w-[34rem] items-end gap-0.5">
        {letters.map((ch, n) => (
          <div key={ch} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <div className="relative w-full flex-1">
              <span
                className={`absolute bottom-0 w-full rounded-t transition-all duration-700 ${found ? "bg-success" : "bg-accent/70"}`}
                style={{ height: `${(((counts[n] / total) * 1000) / top) * 100}%` }}
              />
              <span className="absolute h-0.5 w-full bg-warning" style={{ bottom: `${(expected[n] / top) * 100}%` }} />
            </div>
            <span className="font-mono text-[0.625rem] text-muted">{ch}</span>
          </div>
        ))}
      </div>
      <p className={`max-w-2xl text-center font-mono text-xs break-words transition-colors ${found ? "text-success" : "text-muted"}`}>{caesar(cipher, -guess)}</p>
    </Frame>
  );
}

function VigenereAnim({ locale }: Props) {
  const word = [..."HUJUM"];
  const key = "KEY";
  const player = usePlayer(word.length + 1, 1700);
  const i = player.step;
  const k = key[i % key.length];
  const by = k.charCodeAt(0) - 65;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        word[i]
          ? L(`${word[i]} ostida kalit harfi ${k} turibdi (${k} = ${by}), shuning uchun ${word[i]} ${by} qadam suriladi → ${vigenere(word[i], k)}.`, `${word[i]} astında gilt háribi ${k} tur (${k} = ${by}), sonlıqtan ${word[i]} ${by} qádem jılısadı → ${vigenere(word[i], k)}.`, `Под ${word[i]} стоит буква ключа ${k} (${k} = ${by}), поэтому сдвиг на ${by} → ${vigenere(word[i], k)}.`, `Under ${word[i]} sits key letter ${k} (${k} = ${by}), so it shifts by ${by} → ${vigenere(word[i], k)}.`)[locale]
          : L("Ikkala U har xil harfga aylandi (Y va S) — chastota tahlili endi aldanadi.", "Eki U da hár qıylı háripke aylandı (Y hám S) — jiyilik analizi endi aldanadı.", "Две буквы U стали разными (Y и S) — частотный анализ сбит с толку.", "The two U’s became different letters (Y and S) — frequency analysis is fooled.")[locale]
      }
    >
      <LetterMachine
        player={player}
        inputs={word}
        outputs={[...vigenere(word.join(""), key)]}
        op={(n) => `${word[n]} + ${key[n % key.length]}(${key.charCodeAt(n % key.length) - 65}) = ${vigenere(word[n], key[n % key.length])}`}
        aside={(n) => (
          <div className="flex gap-2">
            {word.map((_, m) => (
              <span key={m} className={`grid size-10 place-items-center rounded-lg font-mono font-bold transition-all duration-500 ${m === n ? "bg-warning text-bg" : "bg-warning-soft text-warning"}`}>
                {key[m % key.length]}
              </span>
            ))}
          </div>
        )}
      />
    </Frame>
  );
}

function PigpenKeys({ active }: { active: string }) {
  const box = (from: number, dot: boolean) => (
    <div className="grid grid-cols-3">
      {Array.from({ length: 9 }, (_, n) => {
        const ch = String.fromCharCode(65 + from + n);
        return (
          <span
            key={ch}
            className={`relative grid size-8 place-items-center font-mono text-xs transition-colors duration-500 ${n % 3 < 2 ? "border-r-2" : ""} ${n < 6 ? "border-b-2" : ""} border-muted ${ch === active ? "bg-accent text-on-accent" : "text-muted"}`}
          >
            {ch}
            {dot && <span className="absolute right-1 bottom-1 size-1 rounded-full bg-current" />}
          </span>
        );
      })}
    </div>
  );
  const cross = (from: number, dot: boolean) => {
    const place = ["top-0 left-1/2 -translate-x-1/2", "top-1/2 left-0 -translate-y-1/2", "top-1/2 right-0 -translate-y-1/2", "bottom-0 left-1/2 -translate-x-1/2"];
    return (
      <div className="relative size-24">
        <svg viewBox="0 0 96 96" className="absolute inset-0 text-muted" aria-hidden>
          <path d="M8 8L88 88M88 8L8 88" stroke="currentColor" strokeWidth="2" />
        </svg>
        {place.map((pos, n) => {
          const ch = String.fromCharCode(65 + from + n);
          return (
            <span key={ch} className={`absolute grid size-7 place-items-center rounded font-mono text-xs transition-colors duration-500 ${pos} ${ch === active ? "bg-accent text-on-accent" : "bg-bg text-muted"}`}>
              {ch}
              {dot && "•"}
            </span>
          );
        })}
      </div>
    );
  };
  return (
    <div className="flex flex-wrap items-center justify-center gap-5">
      {box(0, false)}
      {box(9, true)}
      {cross(18, false)}
      {cross(22, true)}
    </div>
  );
}

function PigpenAnim({ locale }: Props) {
  const word = [..."ROOTY"];
  const player = usePlayer(word.length + 1, 1600);
  const ch = word[player.step];
  const g = ch ? pigpen(ch) : null;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        ch && g
          ? L(`${ch} ${g.shape === "grid" ? "panjarada" : "X shaklida"} turibdi${g.dot ? " (nuqtali qismda)" : ""}. Uning katagini o‘rab turgan chiziqlar — shifr belgisi.`, `${ch} ${g.shape === "grid" ? "panjarada" : "X formasında"} tur${g.dot ? " (noqatlı bólimde)" : ""}. Onıń katagın orap turǵan sızıqlar — shifr belgisi.`, `${ch} стоит ${g.shape === "grid" ? "в решётке" : "в кресте X"}${g.dot ? " (с точкой)" : ""}. Линии вокруг её клетки — это и есть знак.`, `${ch} sits ${g.shape === "grid" ? "in the grid" : "in the X"}${g.dot ? " (the dotted one)" : ""}. The lines around its cell are the symbol.`)[locale]
          : L("ROOTY — endi faqat belgilar bilan yozilgan.", "ROOTY — endi tek belgiler menen jazılǵan.", "ROOTY теперь записано одними знаками.", "ROOTY is now written in symbols only.")[locale]
      }
    >
      <PigpenKeys active={ch ?? ""} />
      <div className="flex gap-3 text-text">
        {word.map((c, n) => (
          <span key={n} className={`grid size-12 place-items-center rounded-lg border transition-all duration-500 ${n === player.step ? "-translate-y-1 border-accent bg-accent-soft text-accent-text" : n < player.step || player.step >= word.length ? "border-border" : "border-dashed border-border opacity-30"}`}>
            <PigpenSymbol letter={c} size={30} />
          </span>
        ))}
      </div>
    </Frame>
  );
}

function MorseAnim({ locale }: Props) {
  const word = "SOS";
  // Signal on for a mark, then off for the gap after it.
  const events = [...word].flatMap((ch, l) =>
    [...morse[ch]].flatMap((mark, m) => [
      { l, m, on: true, mark },
      { l, m, on: false, mark: m === morse[ch].length - 1 ? "letter" : "gap" },
    ]),
  );
  const timing = (s: number) => {
    const e = events[s];
    if (!e) return 1600;
    return e.on ? (e.mark === "-" ? 900 : 300) : e.mark === "letter" ? 900 : 300;
  };
  const player = usePlayer(events.length + 1, timing);
  const e = events[player.step];
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        e
          ? `${word[e.l]} = ${morse[word[e.l]].replace(/\./g, "·").replace(/-/g, "–")} · ${e.on ? (e.mark === "-" ? L("tire — uzun signal", "tire — uzın signal", "тире — длинный сигнал", "dash — a long signal")[locale] : L("nuqta — qisqa signal", "noqat — qısqa signal", "точка — короткий сигнал", "dot — a short signal")[locale]) : L("pauza", "pauza", "пауза", "pause")[locale]}`
          : L("··· ––– ··· — dunyoga mashhur yordam signali.", "··· ––– ··· — dúnyaǵa belgili járdem signalı.", "··· ––– ··· — всемирно известный сигнал бедствия.", "··· ––– ··· — the world-famous distress signal.")[locale]
      }
    >
      <span
        aria-hidden
        className={`size-20 rounded-full border-4 border-border transition-all duration-100 ${e?.on ? "bg-warning shadow-[0_0_48px_var(--warning)]" : "bg-surface-2"}`}
      />
      <div className="flex gap-6">
        {[...word].map((ch, l) => (
          <div key={l} className="flex flex-col items-center gap-2">
            <span className={`font-mono text-2xl font-bold ${e?.l === l ? "text-accent" : "text-muted"}`}>{ch}</span>
            <span className="flex items-center gap-1.5">
              {[...morse[ch]].map((mark, m) => (
                <span
                  key={m}
                  className={`h-2.5 rounded-full transition-colors duration-150 ${mark === "-" ? "w-7" : "w-2.5"} ${e?.l === l && e.m === m && e.on ? "bg-warning" : (e && (e.l > l || (e.l === l && e.m > m))) || !e ? "bg-accent/60" : "bg-border"}`}
                />
              ))}
            </span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

function EnigmaAnim({ locale }: Props) {
  const first = pressKey("A", [0, 0, 0]);
  const second = pressKey("A", first.positions);
  const presses = [first, second];
  const stations = ["⌨", "III", "II", "I", "R", "I", "II", "III", "💡"];
  const player = usePlayer(stations.length * 2 + 1, 950);
  const s = player.step;
  const press = presses[Math.min(Math.floor(s / stations.length), 1)];
  const at = s >= stations.length * 2 ? stations.length - 1 : s % stations.length;
  const letterAt = (n: number) => (n === 0 ? press.input : press.path[n - 1]);
  const done = s >= stations.length * 2;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        done
          ? L(`Bir xil A tugmasi ikki marta bosildi — lekin ${first.output} va keyin ${second.output} yondi. Har bosishda rotor buriladi, shuning uchun shifr o‘zgaradi.`, `Birdey A túymesi eki ret basıldı — biraq ${first.output} hám keyin ${second.output} jandı. Hár basıwda rotor buraladı, sonlıqtan shifr ózgeredi.`, `Одну и ту же A нажали дважды — но загорелись ${first.output}, а потом ${second.output}. Ротор поворачивается при каждом нажатии, поэтому шифр меняется.`, `The same A key, pressed twice — yet ${first.output} then ${second.output} lit up. The rotor turns on every press, so the cipher keeps changing.`)[locale]
          : at === 0
            ? L(`A bosildi. Avval o‘ng rotor bir qadam buriladi: oynada ${showPositions(press.positions)}.`, `A basıldı. Aldın oń rotor bir qádem buraladı: aynada ${showPositions(press.positions)}.`, `Нажата A. Сначала правый ротор поворачивается на шаг: в окне ${showPositions(press.positions)}.`, `A is pressed. First the right rotor turns one step: the window shows ${showPositions(press.positions)}.`)[locale]
            : at === 4
              ? L(`Reflektor tokni orqaga qaytaradi: ${letterAt(3)} → ${letterAt(4)}.`, `Reflektor toktı artqa qaytaradı: ${letterAt(3)} → ${letterAt(4)}.`, `Рефлектор отправляет ток обратно: ${letterAt(3)} → ${letterAt(4)}.`, `The reflector sends the current back: ${letterAt(3)} → ${letterAt(4)}.`)[locale]
              : at === stations.length - 1
                ? L(`${press.output} chirog‘i yondi!`, `${press.output} shırağı jandı!`, `Загорелась лампа ${press.output}!`, `Lamp ${press.output} lights up!`)[locale]
                : L(`Tok ${stations[at]} rotordan o‘tdi: ${letterAt(at - 1)} → ${letterAt(at)}.`, `Tok ${stations[at]} rotordan ótti: ${letterAt(at - 1)} → ${letterAt(at)}.`, `Ток прошёл ротор ${stations[at]}: ${letterAt(at - 1)} → ${letterAt(at)}.`, `The current passes rotor ${stations[at]}: ${letterAt(at - 1)} → ${letterAt(at)}.`)[locale]
      }
    >
      <div className="flex items-center gap-2 font-mono text-sm">
        {showPositions(press.positions).split("").map((ch, n) => (
          <span key={n} className="flex flex-col items-center gap-1">
            <span key={`${s < stations.length}-${ch}`} className="grid size-10 place-items-center rounded-lg bg-code text-lg font-bold transition-all duration-500 starting:-translate-y-3 starting:opacity-0">{ch}</span>
            <span className="text-[0.625rem] text-faint">{["I", "II", "III"][n]}</span>
          </span>
        ))}
      </div>
      <div className="relative w-full max-w-2xl min-w-[34rem]">
        <div className="absolute top-5 right-5 left-5 h-0.5 bg-border" />
        <div className="absolute top-5 left-5 h-0.5 bg-warning transition-[width] duration-700" style={{ width: `calc((100% - 2.5rem) * ${at / (stations.length - 1)})` }} />
        <div className="relative flex justify-between">
          {stations.map((name, n) => (
            <div key={n} className="flex flex-col items-center gap-1">
              <span
                className={`grid size-10 place-items-center rounded-full border-2 font-mono text-sm font-bold transition-all duration-500 ${
                  n === at ? "scale-110 border-warning bg-warning text-bg shadow-[0_0_20px_var(--warning)]" : n < at ? "border-warning/50 bg-warning-soft text-warning" : "border-border bg-surface text-faint"
                }`}
              >
                {n <= at ? (n === stations.length - 1 ? press.output : letterAt(n)) : ""}
              </span>
              <span className={`text-[0.625rem] ${n === 4 ? "text-accent" : "text-muted"}`}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

// ── Modern ciphers ──────────────────────────────────────────────────────

function XorAnim({ locale }: Props) {
  const word = [..."HI!"];
  const key = [0x5a, 0xc3, 0x1f];
  const data = textToBytes(word.join(""));
  const player = usePlayer(word.length + 1, 2200);
  const i = player.step;
  const row = (label: string, byte: number, tone: string) => (
    <div className="flex items-center gap-2">
      <span className="w-14 text-right text-xs text-muted">{label}</span>
      {[...bits(byte)].map((b, n) => (
        <span key={n} className={`grid size-7 place-items-center rounded font-mono text-sm font-bold transition-all duration-500 starting:scale-75 ${tone} ${b === "1" ? "" : "opacity-60"}`}>{b}</span>
      ))}
      <span className="w-10 font-mono text-xs text-muted">{byte.toString(16).padStart(2, "0")}</span>
    </div>
  );
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        i < word.length
          ? L(`«${word[i]}» bitlariga kalit bitlarini XOR qilamiz: bir xil bitlar → 0, har xil → 1.`, `«${word[i]}» bitlerine gilt bitlerin XOR qılamız: birdey bitler → 0, hár qıylı → 1.`, `XOR битов «${word[i]}» с битами ключа: одинаковые → 0, разные → 1.`, `XOR the bits of “${word[i]}” with the key bits: same → 0, different → 1.`)[locale]
          : L("Natijaga yana o‘sha kalitni XOR qilsangiz, matn qaytadi. Kalit tasodifiy, matn uzunligida va bir martalik bo‘lsa — bu buzib bo‘lmaydigan One-time pad.", "Nátiyjege jáne sol giltti XOR qılsańız, tekst qaytadı. Gilt tosınnan, tekst uzınlıǵında hám bir mártelik bolsa — bul buzıp bolmaytuǵın One-time pad.", "XOR результата с тем же ключом вернёт текст. Если ключ случаен, длиной с текст и одноразов — это невзламываемый One-time pad.", "XOR the result with the same key and the text returns. With a random, full-length, single-use key this is the unbreakable one-time pad.")[locale]
      }
    >
      <LetterMachine
        player={player}
        inputs={word}
        outputs={data.map((b, n) => (b ^ key[n]).toString(16).padStart(2, "0"))}
        wideOut
        op={(n) => `${word[n]} ⊕ ${key[n].toString(16)} = ${(data[n] ^ key[n]).toString(16).padStart(2, "0")}`}
        aside={(n) => (
          <div key={n} className="space-y-1">
            {row(word[n], data[n], "bg-surface-2 text-text")}
            {row("⊕ key", key[n], "bg-warning-soft text-warning")}
            <div className="ml-16 h-px bg-border" />
            {row("=", data[n] ^ key[n], "bg-accent-soft text-accent-text")}
          </div>
        )}
      />
    </Frame>
  );
}

const desData = textToBytes("ROOTY!!!");
const desKey = textToBytes("SIRKALIT");

function DesAnim({ locale }: Props) {
  const { initial, rounds, output } = desBlock(desData, desKey);
  const player = usePlayer(rounds.length + 2, 900);
  const s = player.step;
  const r = s >= 1 && s <= 16 ? rounds[s - 1] : null;
  const left = s === 0 ? initial.left : r ? r.left : rounds[15].left;
  const right = s === 0 ? initial.right : r ? r.right : rounds[15].right;
  const box = (label: string, value: string, tone: string) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span key={value} className={`rounded-lg px-3 py-2 font-mono text-sm font-bold transition-all duration-500 starting:scale-90 starting:opacity-0 ${tone}`}>{value}</span>
    </div>
  );
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        s === 0
          ? L("8 baytlik blok (64 bit) aralashtiriladi va ikki yarmiga bo‘linadi: chap L va o‘ng R.", "8 baytlıq blok (64 bit) aralastırıladı hám eki yarımǵa bólinedi: shep L hám oń R.", "Блок 8 байт (64 бита) перемешивается и делится на две половины: левую L и правую R.", "The 8-byte (64-bit) block is shuffled and split into two halves: left L and right R.")[locale]
          : r
            ? L(`${r.round}-raund: F funksiyasi R ni raund kaliti bilan aralashtiradi, natija L ga XOR qilinadi, so‘ng yarmlar joy almashadi.`, `${r.round}-raund: F funkciyası R di raund gilti menen aralastıradı, nátiyje L ge XOR qılınadı, keyin yarımlar orın almasadı.`, `Раунд ${r.round}: функция F смешивает R с ключом раунда, результат XOR-ится с L, затем половины меняются местами.`, `Round ${r.round}: F mixes R with the round key, the result is XORed into L, then the halves swap.`)[locale]
            : L(`16 raunddan keyin: ${hex(output, "")}. Ochish — aynan shu jarayon, faqat kalitlar teskari tartibda.`, `16 raundtan keyin: ${hex(output, "")}. Ashıw — dál usı process, tek giltler keri tártipte.`, `После 16 раундов: ${hex(output, "")}. Расшифровка — тот же процесс, только ключи в обратном порядке.`, `After 16 rounds: ${hex(output, "")}. Decryption is the very same process with the keys in reverse.`)[locale]
      }
    >
      <div className="flex flex-wrap items-end justify-center gap-4">
        {box("L", left, "bg-surface-2 text-text")}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted">F(R, K{r ? r.round : ""})</span>
          <span className="rounded-lg border border-dashed border-accent px-3 py-2 font-mono text-xs text-accent-text">
            {r ? `K=${r.key.slice(0, 6)}… → ${r.f}` : "—"}
          </span>
        </div>
        {box("R", right, "bg-accent-soft text-accent-text")}
      </div>
      <div className="flex gap-1">
        {rounds.map((round) => (
          <span key={round.round} className={`h-2 w-4 rounded-full transition-colors duration-300 ${s >= round.round ? "bg-accent" : "bg-border"}`} />
        ))}
      </div>
      {s === 17 && <p className="font-mono text-sm text-success">{hex(desData, "")} → {hex(output, "")}</p>}
    </Frame>
  );
}

const stageText: Record<AesStage, Localized> = {
  start: L("Matn 4×4 baytli jadvalga (holat) joylanadi.", "Tekst 4×4 baytlı kestege (jaǵday) jaylastırıladı.", "Текст раскладывается в таблицу 4×4 байта (состояние).", "The text is laid out as a 4×4 table of bytes (the state)."),
  addRoundKey: L("AddRoundKey: har bir bayt raund kaliti bilan XOR qilinadi.", "AddRoundKey: hár bir bayt raund gilti menen XOR qılınadı.", "AddRoundKey: каждый байт XOR-ится с ключом раунда.", "AddRoundKey: every byte is XORed with the round key."),
  subBytes: L("SubBytes: har bir bayt S-box jadvali orqali boshqasiga almashadi.", "SubBytes: hár bir bayt S-box kestesi arqalı basqasına almasadı.", "SubBytes: каждый байт заменяется по таблице S-box.", "SubBytes: every byte is swapped through the S-box table."),
  shiftRows: L("ShiftRows: 2-qator 1 ga, 3-qator 2 ga, 4-qator 3 ga chapga suriladi.", "ShiftRows: 2-qatar 1 ge, 3-qatar 2 ge, 4-qatar 3 ke shepke jılısadı.", "ShiftRows: строки сдвигаются влево на 1, 2 и 3.", "ShiftRows: rows 2, 3 and 4 shift left by 1, 2 and 3."),
  mixColumns: L("MixColumns: har bir ustun matematik tarzda aralashtiriladi — bitta bayt butun ustunga ta’sir qiladi.", "MixColumns: hár bir baǵana matematikalıq túrde aralastırıladı — bir bayt pútkil baǵanaǵa tásir etedi.", "MixColumns: каждый столбец математически перемешивается — один байт влияет на весь столбец.", "MixColumns: each column is mixed mathematically — one byte affects the whole column."),
};

function AesAnim({ locale }: Props) {
  const key = hexToBytes("000102030405060708090a0b0c0d0e0f")!;
  const { trace } = aesEncryptBlock(textToBytes("Salom, AES dunyo"), key);
  const player = usePlayer(trace.length, (s) => (s < 6 ? 1600 : 650));
  const s = player.step;
  const now = trace[s];
  const before = trace[Math.max(0, s - 1)].state;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        <>
          <b className="text-accent">{L("Raund", "Raund", "Раунд", "Round")[locale]} {now.round}/10</b> · {stageText[now.stage][locale]}
          {s === trace.length - 1 && ` ${L("Shifr tayyor — 10 raunddan keyin hech bir bayt asl holiga o‘xshamaydi.", "Shifr tayın — 10 raundtan keyin hesh bir bayt dáslepki jaǵdayına uqsamaydı.", "Шифр готов — после 10 раундов ни один байт не похож на исходный.", "Done — after 10 rounds no byte resembles the original.")[locale]}`}
        </>
      }
    >
      <div className="flex items-center gap-4">
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 16 }, (_, n) => {
            const row = Math.floor(n / 4);
            const col = n % 4;
            const i = col * 4 + row;
            const changed = now.state[i] !== before[i] && s > 0;
            return (
              <span
                key={`${s}-${n}`}
                className={`grid size-12 place-items-center rounded-lg font-mono text-sm font-bold transition-all duration-500 starting:scale-75 ${
                  changed ? "bg-accent text-on-accent" : "bg-surface-2 text-text"
                }`}
              >
                {now.state[i].toString(16).padStart(2, "0")}
              </span>
            );
          })}
        </div>
        {now.stage === "shiftRows" && (
          <div className="flex flex-col gap-1.5 font-mono text-xs text-warning">
            {["", "←1", "←2", "←3"].map((t, n) => (
              <span key={n} className="grid h-12 items-center">{t}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {(["subBytes", "shiftRows", "mixColumns", "addRoundKey"] as AesStage[]).map((stage) => (
          <span key={stage} className={`rounded-full border px-2.5 py-0.5 font-mono text-xs transition-colors ${now.stage === stage ? "border-accent bg-accent text-on-accent" : "border-border text-muted"}`}>
            {stage}
          </span>
        ))}
      </div>
    </Frame>
  );
}

function Rc4Anim({ locale }: Props) {
  const key = textToBytes("Key");
  const message = textToBytes("HELLO");
  // Key scheduling, in 16 snapshots of 16 swaps each.
  const ksa: number[][] = [];
  const s = Array.from({ length: 256 }, (_, n) => n);
  let j = 0;
  for (let i = 0; i < 256; i++) {
    j = (j + s[i] + key[i % key.length]) & 255;
    [s[i], s[j]] = [s[j], s[i]];
    if (i % 16 === 15) ksa.push([...s]);
  }
  const prga: { i: number; j: number; k: number; state: number[] }[] = [];
  let a = 0;
  let b = 0;
  for (let n = 0; n < message.length; n++) {
    a = (a + 1) & 255;
    b = (b + s[a]) & 255;
    [s[a], s[b]] = [s[b], s[a]];
    prga.push({ i: a, j: b, k: s[(s[a] + s[b]) & 255], state: [...s] });
  }
  const player = usePlayer(1 + ksa.length + prga.length + 1, (st) => (st <= ksa.length ? 450 : 1800));
  const st = player.step;
  const inKsa = st >= 1 && st <= ksa.length;
  const p = st > ksa.length && st <= ksa.length + prga.length ? prga[st - ksa.length - 1] : null;
  const state = st === 0 ? Array.from({ length: 256 }, (_, n) => n) : inKsa ? ksa[st - 1] : p ? p.state : prga.at(-1)!.state;
  const outCount = p ? st - ksa.length : st > ksa.length ? prga.length : 0;
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        st === 0
          ? L("RC4 holati — 0 dan 255 gacha sonlar tartib bilan (rang = son).", "RC4 jaǵdayı — 0 den 255 ke shekem sanlar tártip penen (reń = san).", "Состояние RC4 — числа от 0 до 255 по порядку (цвет = число).", "RC4’s state: the numbers 0–255 in order (colour = value).")[locale]
          : inKsa
            ? L("1) Kalit bilan aralashtirish (KSA): kalit baytlari bo‘yicha sonlar joy almashadi.", "1) Gilt penen aralastırıw (KSA): gilt baytları boyınsha sanlar orın almasadı.", "1) Перемешивание ключом (KSA): числа меняются местами по байтам ключа.", "1) Key scheduling (KSA): numbers swap places guided by the key bytes.")[locale]
            : p
              ? L(`2) i=${p.i}, j=${p.j} joy almashadi va kalit oqimi bayti ${p.k.toString(16)} chiqadi; u matn bayti bilan XOR qilinadi.`, `2) i=${p.i}, j=${p.j} orın almasadı hám gilt aǵımı baytı ${p.k.toString(16)} shıǵadı; ol tekst baytı menen XOR qılınadı.`, `2) i=${p.i}, j=${p.j} меняются местами, выходит байт ключевого потока ${p.k.toString(16)}; он XOR-ится с байтом текста.`, `2) i=${p.i}, j=${p.j} swap and keystream byte ${p.k.toString(16)} comes out; it is XORed with the text byte.`)[locale]
              : L("RC4 juda tez, lekin kalit oqimining boshida yashirin qonuniyatlar bor — shuning uchun WEP Wi-Fi buzilgan va 2015-yildan RC4 taqiqlangan.", "RC4 júdá tez, biraq gilt aǵımınıń basında jasırın nızamlılıqlar bar — sonlıqtan WEP Wi-Fi buzılǵan hám 2015-jıldan RC4 qadaǵan etilgen.", "RC4 очень быстрый, но в начале потока есть скрытые закономерности — из-за них взломали WEP Wi-Fi, а с 2015 года RC4 запрещён.", "RC4 is fast, but the start of its keystream has hidden biases — that is how WEP Wi-Fi fell, and RC4 has been banned since 2015.")[locale]
      }
    >
      <div className="grid grid-cols-16 gap-px rounded-lg bg-border p-px" aria-hidden>
        {state.map((v, n) => (
          <span
            key={n}
            className={`size-3 transition-colors duration-300 sm:size-3.5 ${p && (n === p.i || n === p.j) ? "outline-2 outline-text" : ""}`}
            style={{ background: `hsl(${(v * 300) / 255} 75% 55%)` }}
          />
        ))}
      </div>
      <div className="flex gap-2 font-mono text-xs">
        {[...message].map((byte, n) => (
          <span key={n} className="flex flex-col items-center gap-0.5">
            <span className="text-muted">{String.fromCharCode(byte)}</span>
            <span className={`grid h-8 w-10 place-items-center rounded transition-all duration-500 ${n < outCount ? "bg-accent-soft text-accent-text" : "bg-surface-2 text-faint"}`}>
              {n < outCount ? (byte ^ prga[n].k).toString(16).padStart(2, "0") : "··"}
            </span>
          </span>
        ))}
      </div>
    </Frame>
  );
}

function RsaAnim({ locale }: Props) {
  const keys = rsaKeys(61, 53, 17)!;
  const m = 65n;
  const c = rsaEncrypt(m, keys);
  const cards: { label: Localized; math: string; tone?: string }[] = [
    { label: L("Ikki maxfiy tub son", "Eki jasırın jay san", "Два тайных простых числа", "Two secret primes"), math: `p = ${keys.p}, q = ${keys.q}` },
    { label: L("Ochiq modul", "Ashıq modul", "Открытый модуль", "Public modulus"), math: `n = p·q = ${keys.n}` },
    { label: L("Eyler funksiyasi (sir)", "Eyler funkciyası (sır)", "Функция Эйлера (секрет)", "Euler’s totient (secret)"), math: `φ = (p−1)(q−1) = ${keys.phi}` },
    { label: L("Ochiq daraja", "Ashıq dáreje", "Открытая экспонента", "Public exponent"), math: `e = ${keys.e}`, tone: "text-success" },
    { label: L("Yopiq kalit", "Jabıq gilt", "Закрытый ключ", "Private key"), math: `d = e⁻¹ mod φ = ${keys.d}`, tone: "text-danger" },
    { label: L("Shifrlash (ochiq kalit bilan)", "Shifrlaw (ashıq gilt penen)", "Шифрование (открытым ключом)", "Encrypt (public key)"), math: `c = ${m}^${keys.e} mod ${keys.n} = ${c}` },
    { label: L("Ochish (yopiq kalit bilan)", "Ashıw (jabıq gilt penen)", "Расшифровка (закрытым ключом)", "Decrypt (private key)"), math: `m = ${c}^${keys.d} mod ${keys.n} = ${m}` },
  ];
  const player = usePlayer(cards.length + 1, 1900);
  const s = player.step;
  const captions = [
    L("Bobur ikkita tub son tanlaydi va ularni hech kimga aytmaydi.", "Bobur eki jay san tańlaydı hám olardı hesh kimge aytpaydı.", "Бобур выбирает два простых числа и никому их не говорит.", "Bobur picks two primes and tells no one."),
    L("Ularni ko‘paytiradi. n hammaga ochiq, lekin uni qayta p va q ga ajratish katta sonlarda juda qiyin.", "Olardı kóbeytedi. n hámmege ashıq, biraq onı qayta p hám q ǵa ajıratıw úlken sanlarda júdá qıyın.", "Перемножает их. n открыт всем, но разложить его обратно на p и q для больших чисел очень трудно.", "He multiplies them. n is public, but splitting it back into p and q is very hard for big numbers."),
    L("φ faqat p va q ni bilgan odamga ma’lum.", "φ tek p hám q dı bilgen adamǵa málim.", "φ знает только тот, кто знает p и q.", "Only someone who knows p and q can compute φ."),
    L("e — ochiq kalitning bir qismi: (n, e) hammaga beriladi.", "e — ashıq gilttiń bir bólimi: (n, e) hámmege beriledi.", "e — часть открытого ключа: (n, e) раздаётся всем.", "e is part of the public key: (n, e) goes to everyone."),
    L("d shunday tanlanadiki, e·d mod φ = 1. Bu — Boburning yopiq kaliti.", "d sonday tańlanadı, e·d mod φ = 1. Bul — Boburdıń jabıq gilti.", "d подбирается так, чтобы e·d mod φ = 1. Это закрытый ключ Бобура.", "d is chosen so that e·d mod φ = 1. That is Bobur’s private key."),
    L("Aziza ochiq kalit bilan 65 ni («A» harfi kodi) qulflaydi.", "Aziza ashıq gilt penen 65 ti («A» háribi kodı) qulıplaydı.", "Азиза запирает число 65 (код буквы «A») открытым ключом.", "Aziza locks 65 (the code for “A”) with the public key."),
    L("Faqat Bobur yopiq kaliti bilan qulfni ochadi — 65 qaytdi!", "Tek Bobur jabıq gilti menen qulıptı ashadı — 65 qayttı!", "Только Бобур открывает замок закрытым ключом — вернулось 65!", "Only Bobur can open it with the private key — 65 is back!"),
  ];
  return (
    <Frame
      player={player}
      locale={locale}
      caption={
        s < cards.length
          ? captions[s][locale]
          : L("Haqiqiy RSA’da p va q 300+ xonali sonlar bo‘ladi — n ni ajratish uchun barcha kompyuterlarga ham asrlar kerak.", "Haqıyqıy RSA’da p hám q 300+ xanalı sanlar boladı — n di ajıratıw ushın barlıq kompyuterlerge de ásirler kerek.", "В настоящем RSA p и q — числа из 300+ цифр: на разложение n не хватит веков всех компьютеров мира.", "Real RSA uses 300+ digit primes — factoring n would take all the world’s computers centuries.")[locale]
      }
    >
      <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">
        {cards.map((card, n) => (
          <div
            key={n}
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all duration-500 ${n > s ? "translate-y-2 border-dashed border-border opacity-20" : n === s ? "border-accent bg-accent-soft" : "border-border bg-surface"}`}
          >
            {n === 5 ? <Lock aria-hidden className="size-4 shrink-0 text-accent" /> : n === 6 ? <Unlock aria-hidden className="size-4 shrink-0 text-success" /> : <span className="font-mono text-xs text-faint">{n + 1}</span>}
            <div className="min-w-0">
              <p className="text-xs text-muted">{card.label[locale]}</p>
              <p className={`font-mono text-sm font-semibold break-all ${card.tone ?? ""}`}>{card.math}</p>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const paint = { common: [250, 204, 21] as Rgb, aziza: [220, 38, 38] as Rgb, bobur: [37, 99, 235] as Rgb };

function DhAnim({ locale }: Props) {
  const p = 23;
  const g = 5;
  const a = 6;
  const b = 15;
  const dh = diffieHellman(p, g, a, b);
  const player = usePlayer(9, 1900);
  const s = player.step;
  const chip = (rgb: Rgb, text: string, show: boolean, extra = "") => (
    <span
      className={`flex items-center gap-1.5 rounded-full border border-border bg-surface px-1.5 py-1 font-mono text-[0.6875rem] whitespace-nowrap transition-all duration-700 sm:gap-2 sm:px-2 sm:text-sm ${show ? "opacity-100" : "scale-90 opacity-0"} ${extra}`}
    >
      <span className="size-3.5 shrink-0 rounded-full sm:size-5" style={{ background: rgbCss(rgb) }} />
      {text}
    </span>
  );
  const publicA = mix(paint.common, paint.aziza);
  const publicB = mix(paint.common, paint.bobur);
  const shared = mix(paint.common, paint.aziza, paint.bobur);
  const captions = [
    L(`Hammaga ochiq: tub son p = ${p} va asos g = ${g} (sariq bo‘yoq).`, `Hámmege ashıq: jay san p = ${p} hám tiykar g = ${g} (sarı boyaw).`, `Всем известно: простое p = ${p} и основание g = ${g} (жёлтая краска).`, `Public to all: prime p = ${p} and base g = ${g} (yellow paint).`),
    L(`Aziza maxfiy son tanlaydi: a = ${a}.`, `Aziza jasırın san tańlaydı: a = ${a}.`, `Азиза выбирает тайное число: a = ${a}.`, `Aziza picks a secret: a = ${a}.`),
    L(`Bobur ham: b = ${b}. Bu sonlar hech qachon yuborilmaydi.`, `Bobur da: b = ${b}. Bul sanlar hesh qashan jiberilmeydi.`, `Бобур тоже: b = ${b}. Эти числа никогда не пересылаются.`, `So does Bobur: b = ${b}. These numbers are never sent.`),
    L(`Aziza hisoblaydi: A = ${g}^${a} mod ${p} = ${dh.A}.`, `Aziza esaplaydı: A = ${g}^${a} mod ${p} = ${dh.A}.`, `Азиза вычисляет: A = ${g}^${a} mod ${p} = ${dh.A}.`, `Aziza computes A = ${g}^${a} mod ${p} = ${dh.A}.`),
    L(`A ochiq kanal orqali Boburga uchadi — Eva ham uni ko‘radi.`, `A ashıq kanal arqalı Boburǵa ushadı — Eva da onı kóredi.`, `A летит Бобуру по открытому каналу — Ева тоже его видит.`, `A flies to Bobur over the open channel — Eve sees it too.`),
    L(`Bobur: B = ${g}^${b} mod ${p} = ${dh.B} va uni Azizaga yuboradi.`, `Bobur: B = ${g}^${b} mod ${p} = ${dh.B} hám onı Azizaǵa jiberedi.`, `Бобур: B = ${g}^${b} mod ${p} = ${dh.B} и отправляет Азизе.`, `Bobur: B = ${g}^${b} mod ${p} = ${dh.B}, sent to Aziza.`),
    L(`Aziza: s = B^a mod p = ${dh.B}^${a} mod ${p} = ${dh.sharedA}.`, `Aziza: s = B^a mod p = ${dh.B}^${a} mod ${p} = ${dh.sharedA}.`, `Азиза: s = B^a mod p = ${dh.B}^${a} mod ${p} = ${dh.sharedA}.`, `Aziza: s = B^a mod p = ${dh.B}^${a} mod ${p} = ${dh.sharedA}.`),
    L(`Bobur: s = A^b mod p = ${dh.A}^${b} mod ${p} = ${dh.sharedB}. Bir xil!`, `Bobur: s = A^b mod p = ${dh.A}^${b} mod ${p} = ${dh.sharedB}. Birdey!`, `Бобур: s = A^b mod p = ${dh.A}^${b} mod ${p} = ${dh.sharedB}. Совпало!`, `Bobur: s = A^b mod p = ${dh.A}^${b} mod ${p} = ${dh.sharedB}. The same!`),
    L("Eva p, g, A, B ni biladi, lekin a yoki b ni topish uchun «diskret logarifm» masalasini yechishi kerak — katta sonlarda bu amalda imkonsiz.", "Eva p, g, A, B nı biledi, biraq a yamasa b nı tabıw ushın «diskret logarifm» máselesin sheshiwi kerek — úlken sanlarda bul ámelde múmkin emes.", "Ева знает p, g, A, B, но чтобы найти a или b, нужно решить задачу «дискретного логарифма» — для больших чисел это практически невозможно.", "Eve knows p, g, A and B, but finding a or b means solving the “discrete logarithm” — practically impossible for big numbers."),
  ];
  return (
    <Frame player={player} locale={locale} caption={captions[s][locale]}>
      <div className="grid w-full max-w-2xl grid-cols-3 items-start gap-1.5 text-center sm:gap-3">
        <div className="space-y-2">
          <p className="font-semibold">Aziza</p>
          {chip(paint.aziza, `a = ${a}`, s >= 1, "mx-auto w-fit")}
          {chip(publicA, `A = ${dh.A}`, s >= 3, "mx-auto w-fit")}
          {chip(shared, `s = ${dh.sharedA}`, s >= 6, `mx-auto w-fit ${s >= 7 ? "ring-2 ring-success" : ""}`)}
        </div>
        <div className="relative min-h-40 space-y-2 rounded-xl border border-dashed border-danger/50 bg-danger-soft/40 p-2">
          <p className="text-xs font-semibold text-danger">{L("Ochiq kanal · Eva", "Ashıq kanal · Eva", "Открытый канал · Ева", "Open channel · Eve")[locale]}</p>
          {chip(paint.common, `p=${p} g=${g}`, true, "mx-auto w-fit")}
          {chip(publicA, `A = ${dh.A}`, s >= 4, `mx-auto w-fit ${s === 4 ? "animate-pulse" : ""}`)}
          {chip(publicB, `B = ${dh.B}`, s >= 5, `mx-auto w-fit ${s === 5 ? "animate-pulse" : ""}`)}
          {s >= 8 && <p className="text-xs text-danger transition-opacity duration-500 starting:opacity-0">a = ? · b = ? · s = ?</p>}
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Bobur</p>
          {chip(paint.bobur, `b = ${b}`, s >= 2, "mx-auto w-fit")}
          {chip(publicB, `B = ${dh.B}`, s >= 5, "mx-auto w-fit")}
          {chip(shared, `s = ${dh.sharedB}`, s >= 7, `mx-auto w-fit ${s >= 7 ? "ring-2 ring-success" : ""}`)}
        </div>
      </div>
    </Frame>
  );
}

function ShaAnim({ locale }: Props) {
  const one = "salom";
  const two = "Salom";
  const h1 = sha256(textToBytes(one));
  const h2 = sha256(textToBytes(two));
  const diff = bitDifference(h1, h2);
  const toBits = (h: string) => [...h].flatMap((c) => [...parseInt(c, 16).toString(2).padStart(4, "0")]);
  const b1 = toBits(h1);
  const b2 = toBits(h2);
  const player = usePlayer(4, 2400);
  const s = player.step;
  const captions = [
    L(`«${one}» → SHA-256 → har doim 64 belgili (256 bit) «barmoq izi».`, `«${one}» → SHA-256 → hámme waqıt 64 belgili (256 bit) «barmaq izi».`, `«${one}» → SHA-256 → всегда «отпечаток» из 64 символов (256 бит).`, `“${one}” → SHA-256 → always a 64-character (256-bit) “fingerprint”.`),
    L(`Faqat bitta harfni katta qildik: «${two}». Xesh butunlay boshqacha!`, `Tek bir háripti úlken ettik: «${two}». Xesh pútkilley basqasha!`, `Сделали заглавной всего одну букву: «${two}». Хеш совсем другой!`, `We capitalised just one letter: “${two}”. A completely different hash!`),
    L(`256 bitdan ${diff} tasi o‘zgardi (taxminan yarmi) — bu «ko‘chki effekti».`, `256 bitten ${diff} ı ózgerdi (shama menen yarımı) — bul «kóshki effekti».`, `Изменились ${diff} бит из 256 (примерно половина) — это «лавинный эффект».`, `${diff} of 256 bits flipped (about half) — the “avalanche effect”.`),
    L("Xeshdan matnni qaytarib bo‘lmaydi. Shuning uchun saytlar parolni emas, uning xeshini (tuz bilan) saqlaydi.", "Xeshten tekstti qaytarıp bolmaydı. Sonlıqtan saytlar paroldı emes, onıń xeshin (duz benen) saqlaydı.", "Из хеша нельзя получить текст обратно. Поэтому сайты хранят не пароль, а его хеш (с солью).", "You can’t turn a hash back into text. That’s why sites store a (salted) hash of your password, not the password."),
  ];
  return (
    <Frame player={player} locale={locale} caption={captions[s][locale]}>
      <div className="w-full max-w-2xl space-y-2 font-mono text-xs sm:text-sm">
        <p className="break-all"><b className="text-accent">{one}</b> → {h1}</p>
        <p className={`break-all transition-opacity duration-700 ${s >= 1 ? "opacity-100" : "opacity-0"}`}><b className="text-warning">{two}</b> → {h2}</p>
      </div>
      <div className={`grid grid-cols-32 gap-px transition-opacity duration-700 ${s >= 2 ? "opacity-100" : "opacity-10"}`} aria-hidden>
        {b1.map((bit, n) => (
          <span key={n} className={`size-2.5 rounded-[2px] sm:size-3 ${bit !== b2[n] && s >= 2 ? "bg-danger" : "bg-surface-2"}`} />
        ))}
      </div>
      {s === 3 && (
        <p className="flex items-center gap-2 font-mono text-sm transition-opacity duration-500 starting:opacity-0">
          {one} <span className="text-success">→</span> {h1.slice(0, 10)}… <span className="text-danger line-through">←</span> ?
        </p>
      )}
    </Frame>
  );
}

export const animations: Record<CipherId, ComponentType<Props>> = {
  atbash: AtbashAnim,
  scytale: ScytaleAnim,
  polybius: PolybiusAnim,
  caesar: CaesarAnim,
  frequency: FrequencyAnim,
  vigenere: VigenereAnim,
  pigpen: PigpenAnim,
  morse: MorseAnim,
  otp: XorAnim,
  enigma: EnigmaAnim,
  dh: DhAnim,
  des: DesAnim,
  rsa: RsaAnim,
  rc4: Rc4Anim,
  aes: AesAnim,
  sha256: ShaAnim,
};

