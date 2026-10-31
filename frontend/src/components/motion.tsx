import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Element ko'rinish maydoniga kirganini kuzatadi (bir marta) */
export function useInView<T extends Element>(threshold = 0.15) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined" || prefersReducedMotion()) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return { ref, inView };
}

/** Scroll qilinganda yumshoq paydo bo'luvchi blok */
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: CSSProperties }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal${inView ? " is-visible" : ""}`} style={{ "--reveal-delay": `${delay}ms`, ...style } as CSSProperties}>
      {children}
    </div>
  );
}

/** Sarlavhani so'zma-so'z ko'taradi */
export function SplitWords({ text, delay = 0, step = 70, wordClassName }: { text: string; delay?: number; step?: number; wordClassName?: string }) {
  return (
    <span aria-label={text}>
      {text.split(" ").map((w, i, all) => (
        <span key={`${w}-${i}`} className="word-reveal" aria-hidden style={i < all.length - 1 ? { marginRight: "0.26em" } : undefined}>
          <span className={wordClassName} style={{ animationDelay: `${delay + i * step}ms` }}>{w}</span>
        </span>
      ))}
    </span>
  );
}

/** Raqamni 0 dan qiymatgacha sanab chiqadi (ko'ringanda) */
export function CountUp({ value, duration = 1300, decimals = 0, suffix = "", separator = false }: { value: number; duration?: number; decimals?: number; suffix?: string; separator?: boolean }) {
  const { ref, inView } = useInView<HTMLSpanElement>(0.3);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (prefersReducedMotion()) {
      setN(value);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setN(value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);
  const text = separator ? n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : n.toFixed(decimals);
  return <span ref={ref}>{text}{suffix}</span>;
}

/** Kursor joylashuvini CSS o'zgaruvchilariga yozadi (.spotlight effekti uchun) */
export const spotlightHandler = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
};

/** Aurora fon — .hero-banner ichida ishlatiladi */
export function Aurora() {
  return (
    <>
      <div className="aurora" aria-hidden><span /><span /><span /></div>
      <div className="pattern-circuit" aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.9, maskImage: "linear-gradient(to bottom, black, transparent 85%)", WebkitMaskImage: "linear-gradient(to bottom, black, transparent 85%)", zIndex: 1 }} />
    </>
  );
}
