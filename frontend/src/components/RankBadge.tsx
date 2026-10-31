import { useId, type CSSProperties } from "react";

// ─── XP darajalari (reyting uchun) ────────────────────────────────────────────
// Bilim darajasi (Beginner/Intermediate/Advanced — fuzzy) dan alohida:
// bu faqat yig'ilgan XP bo'yicha beriladigan unvon va nishon.

export type XpRank = {
  tier: number;
  name: string;
  uz: string;
  min: number;
  /** Keyingi darajaning boshlanishi; oxirgi daraja uchun null */
  next: number | null;
  color: string;
};

export const XP_RANKS: XpRank[] = [
  { tier: 1, name: "Beginner", uz: "Yangi boshlovchi", min: 0, next: 101, color: "#b8682f" },
  { tier: 2, name: "Explorer", uz: "Izlanuvchi", min: 101, next: 301, color: "#64748b" },
  { tier: 3, name: "Analyst", uz: "Tahlilchi", min: 301, next: 601, color: "#4f46e5" },
  { tier: 4, name: "Specialist", uz: "Mutaxassis", min: 601, next: 1001, color: "#8a4520" },
  { tier: 5, name: "Expert", uz: "Ekspert", min: 1001, next: 1501, color: "#b45309" },
  { tier: 6, name: "Cyber Master", uz: "Kiber usta", min: 1501, next: null, color: "#a16207" },
];

export function getXpRank(xp: number): XpRank {
  for (let i = XP_RANKS.length - 1; i >= 0; i--) {
    if (xp >= XP_RANKS[i].min) return XP_RANKS[i];
  }
  return XP_RANKS[0];
}

/** "601–1000" yoki "1501+" */
export function rankRange(r: XpRank) {
  return r.next === null ? `${r.min}+` : `${r.min}–${r.next - 1}`;
}

// ─── SVG yordamchilari ────────────────────────────────────────────────────────

function star5(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (Math.PI / 5) * i;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function star4(cx: number, cy: number, r: number) {
  const k = r * 0.28;
  return `M${cx} ${cy - r} L${cx + k} ${cy - k} L${cx + r} ${cy} L${cx + k} ${cy + k} L${cx} ${cy + r} L${cx - k} ${cy + k} L${cx - r} ${cy} L${cx - k} ${cy - k} Z`;
}

const SHIELD = "M32 5 L53 12.5 V30 C53 43.5 44 52.5 32 59 C20 52.5 11 43.5 11 30 V12.5 Z";
const SHIELD_IN = "M32 11.5 L47.5 17 V30 C47.5 40 41 47 32 52 C23 47 16.5 40 16.5 30 V17 Z";

function Grad({ id, from, to, x2 = 0, y2 = 1 }: { id: string; from: string; to: string; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={x2} y2={y2}>
      <stop offset="0%" stopColor={from} />
      <stop offset="100%" stopColor={to} />
    </linearGradient>
  );
}

/** Yuqori qismdagi yaltiroq — metall/emal ta'siri */
function Shine({ d }: { d: string }) {
  return <path d={d} fill="#fff" opacity={0.28} />;
}

function BadgeArt({ tier, uid }: { tier: number; uid: string }) {
  const g = (n: string) => `${uid}-${n}`;
  const u = (n: string) => `url(#${g(n)})`;

  switch (tier) {
    // 1 — Beginner: mis tanga
    case 1:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#f6c18e" to="#a65423" />
            <Grad id={g("b")} from="#9c5223" to="#d8894b" />
            <Grad id={g("s")} from="#fff1df" to="#e9a165" />
          </defs>
          <circle cx="32" cy="33" r="26" fill={u("a")} stroke="#6e3412" strokeWidth="1.6" />
          <circle cx="32" cy="33" r="19" fill={u("b")} stroke="#f3c497" strokeWidth="1.4" />
          <path d={star4(32, 33, 13)} fill={u("s")} stroke="#8a4520" strokeWidth="0.8" />
          <Shine d="M12 27 C15 15 26 9 36 9.5 C27 12 18 18 14 30 Z" />
        </>
      );
    // 2 — Explorer: kumush qalqon + kompas
    case 2:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#f8fafc" to="#8392a8" />
            <Grad id={g("b")} from="#a3b1c4" to="#4b5a70" />
          </defs>
          <path d={SHIELD} fill={u("a")} stroke="#475569" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={SHIELD_IN} fill={u("b")} />
          <circle cx="32" cy="31" r="10.5" fill="none" stroke="#e2e8f0" strokeWidth="1.6" />
          <path d="M32 20.5 L35.2 31 L32 41.5 L28.8 31 Z" fill="#f8fafc" />
          <path d="M32 20.5 L35.2 31 L28.8 31 Z" fill="#ef4444" />
          <circle cx="32" cy="31" r="1.6" fill="#334155" />
          <Shine d="M13 14 L32 7.5 L50 14 V18 C40 14 24 14 13 20 Z" />
        </>
      );
    // 3 — Analyst: lentali ko'k medal + diagramma
    case 3:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#b4bcfd" to="#4338ca" />
            <Grad id={g("b")} from="#6d72f6" to="#4f46e5" />
          </defs>
          <path d="M17 3 H27 L35 22 H25 Z" fill="#4f46e5" />
          <path d="M47 3 H37 L29 22 H39 Z" fill="#6366f1" />
          <rect x="27" y="20" width="10" height="6" rx="2" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
          <rect x="12" y="25" width="40" height="35" rx="10" fill={u("a")} stroke="#312e81" strokeWidth="1.6" />
          <rect x="17.5" y="30.5" width="29" height="24" rx="6.5" fill={u("b")} stroke="#c7d2fe" strokeWidth="1.2" />
          <rect x="23" y="43" width="4.5" height="7" rx="1" fill="#fff" />
          <rect x="29.75" y="38.5" width="4.5" height="11.5" rx="1" fill="#fff" />
          <rect x="36.5" y="34" width="4.5" height="16" rx="1" fill="#fff" />
          <Shine d="M14 33 C14 28 17 26.5 22 26.5 H44 C34 28 22 30 14 38 Z" />
        </>
      );
    // 4 — Specialist: bronza "quloqli" qalqon + yulduz
    case 4:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#d98f55" to="#5c2810" />
            <radialGradient id={g("b")} cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#8a4520" />
              <stop offset="100%" stopColor="#3d1708" />
            </radialGradient>
            <Grad id={g("s")} from="#ffe3c4" to="#d98b4f" />
          </defs>
          <path d="M9 6 L22 13 Q32 9.5 42 13 L55 6 V31 C55 45 45 54 32 59.5 C19 54 9 45 9 31 Z" fill={u("a")} stroke="#3d1708" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="32" cy="33" r="14.5" fill={u("b")} stroke="#e7a46c" strokeWidth="1.8" />
          <path d={star4(32, 33, 11)} fill={u("s")} />
          <Shine d="M11 10 L21 15.5 Q32 12 43 15.5 L53 10 V15 L43 19 Q32 15.5 21 19 L11 15 Z" />
        </>
      );
    // 5 — Expert: oltin qalqon + uch yulduz
    case 5:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#fde68a" to="#b45309" />
            <Grad id={g("b")} from="#f59e0b" to="#92400e" />
          </defs>
          <path d={SHIELD} fill={u("a")} stroke="#78350f" strokeWidth="1.6" strokeLinejoin="round" />
          <path d={SHIELD_IN} fill={u("b")} />
          <polygon points={star5(23.5, 28, 6.5)} fill="#7c3aed" stroke="#fde68a" strokeWidth="0.9" />
          <polygon points={star5(40.5, 28, 6.5)} fill="#44403c" stroke="#fde68a" strokeWidth="0.9" />
          <polygon points={star5(32, 39, 7)} fill="#fde68a" stroke="#fffbeb" strokeWidth="0.9" />
          <Shine d="M13 14 L32 7.5 L50 14 V18 C40 14 24 14 13 20 Z" />
        </>
      );
    // 6 — Cyber Master: oltin kubok
    default:
      return (
        <>
          <defs>
            <Grad id={g("a")} from="#fef08a" to="#ca8a04" x2={1} y2={1} />
            <Grad id={g("b")} from="#eab308" to="#a16207" />
          </defs>
          <path d="M19 13 H11 C11 25 16 30 22 30" fill="none" stroke={u("b")} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M45 13 H53 C53 25 48 30 42 30" fill="none" stroke={u("b")} strokeWidth="3.4" strokeLinecap="round" />
          <path d="M17 7 H47 V21 C47 31 40.5 37.5 32 37.5 C23.5 37.5 17 31 17 21 Z" fill={u("a")} stroke="#854d0e" strokeWidth="1.5" />
          <rect x="28.5" y="37" width="7" height="7.5" fill="#a16207" />
          <rect x="20" y="44" width="24" height="5" rx="1.5" fill="#ca8a04" stroke="#854d0e" strokeWidth="1" />
          <rect x="16" y="49" width="32" height="10" rx="2.5" fill="#292524" />
          <rect x="24" y="52.5" width="16" height="3" rx="1" fill="#a8a29e" />
          <circle cx="32" cy="20" r="8.5" fill="#fef9c3" stroke="#b45309" strokeWidth="1.2" />
          <polygon points={star5(32, 20.5, 6)} fill="#eab308" />
          <Shine d="M19 9 H30 C26 14 23 22 23 31 C20 28 19 25 19 21 Z" />
        </>
      );
  }
}

/** XP daraja nishoni. `locked` — hali erishilmagan (kulrang). */
export function RankBadge({
  tier,
  size = 28,
  locked = false,
  title,
  style,
}: {
  tier: number;
  size?: number;
  locked?: boolean;
  title?: string;
  style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, "");
  const r = XP_RANKS[tier - 1] ?? XP_RANKS[0];
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={title ?? `${r.name} nishoni`}
      style={{
        flexShrink: 0,
        display: "block",
        filter: locked ? "grayscale(1)" : `drop-shadow(0 ${size > 40 ? 3 : 1}px ${size > 40 ? 4 : 2}px rgba(15,23,42,.22))`,
        opacity: locked ? 0.38 : 1,
        transition: "transform .2s ease, filter .2s ease, opacity .2s ease",
        ...style,
      }}
    >
      <title>{title ?? `${r.name} — ${rankRange(r)} XP`}</title>
      <BadgeArt tier={r.tier} uid={uid} />
    </svg>
  );
}
