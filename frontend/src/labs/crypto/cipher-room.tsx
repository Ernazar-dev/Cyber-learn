
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Check, FlaskConical, Lightbulb, ListOrdered, NotebookPen, ShieldAlert, Star } from "lucide-react";
import type { Locale, Localized } from "@/labs/i18n";
import { Rich } from "@/labs/rich";
import { animations } from "./animations";
import { benches, PigpenText } from "./benches";
import { cipherIds, ciphers, isRightAnswer, type CipherId, type Era, type Exercise } from "./ciphers";

const eras: Era[] = ["manual", "machine"];

// The cryptography lab page body: a timeline of ten ciphers, the chosen
// cipher's story and bench, and its exercises. Progress stays in this
// browser only; the URL hash (#caesar) keeps the chosen cipher shareable.

const storageKey = "cyberai-crypto-lab";
type Progress = Partial<Record<CipherId, number[]>>;

const text = {
  timeline: { uz: "Shifrlar tarixi", kaa: "Shifrler tariyxı", ru: "История шифров", en: "Cipher timeline" },
  manual: { uz: "Qo‘lda shifrlash davri", kaa: "Qolda shifrlaw dáwiri", ru: "Эпоха ручных шифров", en: "The pen-and-paper era" },
  machine: { uz: "Mashina va kompyuter davri", kaa: "Mashina hám kompyuter dáwiri", ru: "Эпоха машин и компьютеров", en: "The machine and computer era" },
  animation: { uz: "Qanday ishlaydi — animatsiya", kaa: "Qalay isleydi — animaciya", ru: "Как это работает — анимация", en: "How it works — animation" },
  steps: { uz: "Algoritm qadamma-qadam", kaa: "Algoritm qádemme-qádem", ru: "Алгоритм по шагам", en: "The algorithm, step by step" },
  weakness: { uz: "Zaif tomoni", kaa: "Álsiz tárepi", ru: "Слабое место", en: "Weak spot" },
  story: { uz: "Tarix", kaa: "Tariyx", ru: "История", en: "Story" },
  how: { uz: "Qanday ishlaydi", kaa: "Qalay isleydi", ru: "Как работает", en: "How it works" },
  fact: { uz: "Qiziq fakt", kaa: "Qızıq fakt", ru: "Интересный факт", en: "Fun fact" },
  bench: { uz: "Sinab ko‘ring", kaa: "Sınap kóriń", ru: "Попробуйте", en: "Try it" },
  exercises: { uz: "Mashqlar", kaa: "Shınıǵıwlar", ru: "Упражнения", en: "Exercises" },
  key: { uz: "Kalit", kaa: "Gilt", ru: "Ключ", en: "Key" },
  answer: { uz: "Javobingiz", kaa: "Juwabıńız", ru: "Ваш ответ", en: "Your answer" },
  check: { uz: "Tekshirish", kaa: "Tekseriw", ru: "Проверить", en: "Check" },
  right: { uz: "To‘g‘ri!", kaa: "Durıs!", ru: "Верно!", en: "Correct!" },
  wrong: { uz: "Hali emas — yana urinib ko‘ring.", kaa: "Ele emes — jáne urınıp kóriń.", ru: "Пока нет — попробуйте ещё.", en: "Not yet — try again." },
  hint: { uz: "Ishora", kaa: "Belgi", ru: "Подсказка", en: "Hint" },
  solved: { uz: "yechildi", kaa: "sheshildi", ru: "решено", en: "solved" },
  done: { uz: "mashq bajarildi", kaa: "shınıǵıw orınlandı", ru: "упражнений выполнено", en: "exercises done" },
  prev: { uz: "Oldingi shifr", kaa: "Aldıńǵı shifr", ru: "Предыдущий шифр", en: "Previous cipher" },
  next: { uz: "Keyingi shifr", kaa: "Keyingi shifr", ru: "Следующий шифр", en: "Next cipher" },
  level: { uz: "Qiyinlik", kaa: "Qıyınlıq", ru: "Сложность", en: "Difficulty" },
  local: {
    uz: "Natijalar faqat shu brauzerda saqlanadi.",
    kaa: "Nátiyjeler tek usı brauzerde saqlanadı.",
    ru: "Прогресс хранится только в этом браузере.",
    en: "Progress is saved in this browser only.",
  },
} satisfies Record<string, Localized>;

// Progress lives in localStorage, read through useSyncExternalStore so the
// server render and the first client render agree. `memory` keeps progress
// for this visit when storage is blocked (private mode).
let memory = "{}";
const progressListeners = new Set<() => void>();

function readStored() {
  try {
    return localStorage.getItem(storageKey) ?? memory;
  } catch {
    return memory;
  }
}

function subscribeProgress(listener: () => void) {
  progressListeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    progressListeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function saveProgress(next: Progress) {
  memory = JSON.stringify(next);
  try {
    localStorage.setItem(storageKey, memory);
  } catch {
    // Storage blocked: `memory` still holds it for this visit.
  }
  progressListeners.forEach((listener) => listener());
}

function parseProgress(raw: string): Progress {
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
}

function subscribeHash(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

function isCipher(value: string): value is CipherId {
  return (cipherIds as readonly string[]).includes(value);
}

function ExerciseCard({
  exercise,
  index,
  solved,
  onSolve,
  locale,
}: {
  exercise: Exercise;
  index: number;
  solved: boolean;
  onSolve: () => void;
  locale: Locale;
}) {
  const id = useId();
  const [value, setValue] = useState("");
  const [verdict, setVerdict] = useState<"right" | "wrong" | null>(null);
  const [hint, setHint] = useState(false);

  function check(given = value) {
    const ok = isRightAnswer(exercise, given);
    setVerdict(ok ? "right" : "wrong");
    if (ok) onSolve();
  }

  return (
    <li className={`space-y-3 rounded-xl border p-4 ${solved ? "border-success/40 bg-success-soft/40" : "border-border bg-surface"}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">
          <span className="mr-2 font-mono text-faint">{String(index + 1).padStart(2, "0")}</span>
          {exercise.task[locale]}
          {exercise.key && (
            <span className="ml-2 rounded-md bg-warning-soft px-1.5 py-0.5 font-mono text-xs text-warning">
              {text.key[locale]}: {exercise.key}
            </span>
          )}
        </p>
        {solved && <Check aria-label={text.solved[locale]} className="size-5 shrink-0 text-success" />}
      </div>

      {exercise.given &&
        (exercise.glyphs ? (
          <div className="rounded-lg bg-code p-3 text-text">
            <PigpenText text={exercise.given} size={28} />
          </div>
        ) : (
          <p className="rounded-lg bg-code p-3 font-mono text-sm break-words select-all">{exercise.given}</p>
        ))}

      {exercise.format === "choice" && exercise.options ? (
        <div role="radiogroup" aria-label={exercise.task[locale]} className="grid gap-2">
          {exercise.options.map((option, i) => {
            const picked = value === String(i);
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={picked}
                onClick={() => {
                  setValue(String(i));
                  check(String(i));
                }}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  picked && verdict === "right"
                    ? "border-success bg-success-soft text-success"
                    : picked && verdict === "wrong"
                      ? "border-danger bg-danger-soft text-danger"
                      : "border-border hover:border-accent"
                }`}
              >
                {option[locale]}
              </button>
            );
          })}
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            check();
          }}
          className="flex flex-wrap gap-2"
        >
          <label htmlFor={id} className="sr-only">
            {text.answer[locale]}
          </label>
          <input
            id={id}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setVerdict(null);
            }}
            placeholder={text.answer[locale]}
            inputMode={exercise.format === "digits" ? "numeric" : undefined}
            autoComplete="off"
            spellCheck={false}
            className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 font-mono uppercase focus:border-accent focus:outline-none"
          />
          <button type="submit" className="h-10 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">
            {text.check[locale]}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
        {verdict === "right" && <span className="font-medium text-success">{text.right[locale]}</span>}
        {verdict === "wrong" && <span className="text-danger">{text.wrong[locale]}</span>}
        {exercise.hint && !hint && (
          <button type="button" onClick={() => setHint(true)} className="inline-flex items-center gap-1 text-muted hover:text-warning">
            <Lightbulb aria-hidden className="size-4" /> {text.hint[locale]}
          </button>
        )}
      </div>
      {exercise.hint && hint && <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm">{exercise.hint[locale]}</p>}
    </li>
  );
}

export function CipherRoom({ locale }: { locale: Locale }) {
  // The URL hash (#caesar) picks the cipher, so links and the back button work.
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const current: CipherId = isCipher(hash) ? hash : "atbash";
  const raw = useSyncExternalStore(subscribeProgress, readStored, () => "{}");
  const progress = useMemo(() => parseProgress(raw), [raw]);

  function open(id: CipherId, scroll = true) {
    // pushState does not fire hashchange itself, so announce it for the store.
    history.pushState(null, "", `#${id}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    if (scroll) document.getElementById("cipher")?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function solve(id: CipherId, index: number) {
    if (progress[id]?.includes(index)) return;
    saveProgress({ ...progress, [id]: [...(progress[id] ?? []), index] });
  }

  const cipher = ciphers.find((c) => c.id === current)!;
  const position = ciphers.indexOf(cipher);
  const Bench = benches[cipher.id];
  const Animation = animations[cipher.id];
  const solved = progress[cipher.id] ?? [];
  const total = ciphers.reduce((sum, c) => sum + c.exercises.length, 0);
  const done = ciphers.reduce((sum, c) => sum + (progress[c.id]?.length ?? 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="font-mono font-semibold text-text">
            {done} / {total}
          </span>{" "}
          {text.done[locale]} · {text.local[locale]}
        </p>
        <div className="h-1.5 w-48 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      {/* Two eras, each a wrapping grid: no sideways scrolling at any width. */}
      <nav aria-label={text.timeline[locale]} className="space-y-5">
        {eras.map((era) => (
          <section key={era} aria-label={text[era][locale]}>
            <h2 className="stamp mb-2 text-[0.6875rem] text-muted">{text[era][locale]}</h2>
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
              {ciphers.map((c, i) => {
                if (c.era !== era) return null;
                const count = progress[c.id]?.length ?? 0;
                const full = count === c.exercises.length;
                const on = c.id === current;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-current={on ? "step" : undefined}
                      onClick={() => open(c.id)}
                      className={`flex h-full w-full flex-col gap-1 rounded-xl border p-3 text-left transition-colors ${
                        on ? "border-accent bg-accent-soft" : "border-border bg-surface/60 hover:border-border-strong"
                      }`}
                    >
                      <span className="flex items-center justify-between font-mono text-[0.6875rem] text-faint">
                        {String(i + 1).padStart(2, "0")}
                        {full ? <Check aria-label={text.solved[locale]} className="size-3.5 text-success" /> : <span>{count}/{c.exercises.length}</span>}
                      </span>
                      <span className={`text-sm leading-tight font-semibold ${on ? "text-accent-text" : ""}`}>{c.title[locale].split(" — ")[0]}</span>
                      <span className="mt-auto text-xs text-muted">{c.when[locale]}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </nav>

      <article id="cipher" className="scroll-mt-24 overflow-hidden rounded-card border border-border bg-surface/60">
        <header className="space-y-3 border-b border-border p-5 sm:p-8">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <span className="stamp rounded-full border border-border px-2.5 py-1">{cipher.when[locale]}</span>
            <span className="flex items-center gap-0.5" aria-label={`${text.level[locale]}: ${cipher.level} / 3`}>
              {[1, 2, 3].map((n) => (
                <Star key={n} aria-hidden className={`size-3.5 ${n <= cipher.level ? "fill-warning text-warning" : "text-faint"}`} />
              ))}
            </span>
          </div>
          <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">{cipher.title[locale]}</h2>
          <p className="text-lg font-light text-muted">{cipher.tagline[locale]}</p>
        </header>

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-3">
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <BookOpen aria-hidden className="size-4 text-accent" /> {text.story[locale]}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              <Rich value={cipher.story[locale]} />
            </p>
          </section>
          <section className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <FlaskConical aria-hidden className="size-4 text-accent" /> {text.how[locale]}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              <Rich value={cipher.how[locale]} />
            </p>
          </section>
          <section className="space-y-2 rounded-xl bg-accent-soft p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-accent-text">
              <Lightbulb aria-hidden className="size-4" /> {text.fact[locale]}
            </h3>
            <p className="text-sm leading-relaxed">
              <Rich value={cipher.fact[locale]} />
            </p>
          </section>
        </div>

        <section className="border-t border-border p-5 sm:p-8">
          <h3 className="stamp mb-5 text-xs text-muted">{text.animation[locale]}</h3>
          <Animation key={cipher.id} locale={locale} />
        </section>

        <div className="grid gap-6 border-t border-border p-5 sm:p-8 lg:grid-cols-[3fr_2fr]">
          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <ListOrdered aria-hidden className="size-4 text-accent" /> {text.steps[locale]}
            </h3>
            <ol className="space-y-2">
              {cipher.steps.map((s, n) => (
                <li key={n} className="flex gap-3 text-sm leading-relaxed">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-accent-soft font-mono text-xs font-semibold text-accent-text">{n + 1}</span>
                  <span className="pt-0.5">
                    <Rich value={s[locale]} />
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="space-y-2 self-start rounded-xl border border-danger/30 bg-danger-soft p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-danger">
              <ShieldAlert aria-hidden className="size-4" /> {text.weakness[locale]}
            </h3>
            <p className="text-sm leading-relaxed">
              <Rich value={cipher.weakness[locale]} />
            </p>
          </section>
        </div>

        <section aria-label={text.bench[locale]} className="border-t border-border p-5 sm:p-8">
          <h3 className="stamp mb-5 text-xs text-muted">{text.bench[locale]}</h3>
          {/* Keyed so each cipher opens with a fresh bench. */}
          <Bench key={cipher.id} locale={locale} />
        </section>

        <section className="border-t border-border bg-surface-2/50 p-5 sm:p-8">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <NotebookPen aria-hidden className="size-5 text-accent" /> {text.exercises[locale]}
            <span className="font-mono text-sm font-normal text-muted">
              {solved.length}/{cipher.exercises.length}
            </span>
          </h3>
          <ol className="grid gap-3 md:grid-cols-2">
            {cipher.exercises.map((exercise, i) => (
              <ExerciseCard
                key={`${cipher.id}-${i}`}
                exercise={exercise}
                index={i}
                solved={solved.includes(i)}
                onSolve={() => solve(cipher.id, i)}
                locale={locale}
              />
            ))}
          </ol>
        </section>

        <footer className="flex flex-wrap justify-between gap-3 border-t border-border p-5 sm:px-8">
          {position > 0 ? (
            <button type="button" onClick={() => open(ciphers[position - 1].id)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm hover:border-border-strong">
              <ArrowLeft aria-hidden className="size-4" /> {text.prev[locale]}
            </button>
          ) : (
            <span />
          )}
          {position < ciphers.length - 1 && (
            <button type="button" onClick={() => open(ciphers[position + 1].id)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-hover">
              {text.next[locale]}: {ciphers[position + 1].title[locale].split(" — ")[0]} <ArrowRight aria-hidden className="size-4" />
            </button>
          )}
        </footer>
      </article>
    </div>
  );
}
