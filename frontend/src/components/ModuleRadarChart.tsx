import { useEffect, useRef, useState, type ReactNode } from "react";
import { Grid } from "antd";
import { DesktopOutlined, GlobalOutlined, KeyOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import type { ModuleProgress } from "@/store/useAppStore";
import { modules } from "@/data/curriculum";

// ─── Natija darajalari (legend bilan bir xil) ────────────────────────────────
const BANDS = [
  { min: 90, label: "90 – 100%", color: "#16a34a" },
  { min: 70, label: "70 – 89%", color: "#65a30d" },
  { min: 50, label: "50 – 69%", color: "#d97706" },
  { min: 30, label: "30 – 49%", color: "#ea580c" },
  { min: 0, label: "0 – 29%", color: "#dc2626" },
];
const bandColor = (pct: number) => (BANDS.find((b) => pct >= b.min) ?? BANDS[BANDS.length - 1]).color;
const MUTED = "#94a3b8";

const MODULE_ICONS: Record<number, ReactNode> = {
  1: <SafetyOutlined />,
  2: <GlobalOutlined />,
  3: <KeyOutlined />,
  4: <DesktopOutlined />,
};

// ─── SVG geometriyasi ────────────────────────────────────────────────────────
// Keng viewBox: chap/o'ng yorliqlar uchun joy qoldiriladi.
const W = 640;
const H = 440;
const CX = W / 2;
const CY = H / 2;
const R = 150;           // 100% radiusi
const LABEL_R = R + 34;  // yorliqlar halqasi
const RINGS = [20, 40, 60, 80, 100];

const fmt = (n: number) => n.toFixed(2);
const axisAngles = (n: number) => Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);
const polar = (r: number, a: number) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });
const polygon = (r: number, angles: number[]) => angles.map((a) => { const p = polar(r, a); return `${fmt(p.x)},${fmt(p.y)}`; }).join(" ");

/** Olti burchakli belgi (namunadagi kabi) — chegara va ikonka natija rangida */
function HexBadge({ color, icon, size }: { color: string; icon: ReactNode; size: number }) {
  const s = size;
  const pts = Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    return `${fmt(s / 2 + (s / 2 - 2) * Math.cos(a))},${fmt(s / 2 + (s / 2 - 2) * Math.sin(a))}`;
  }).join(" ");
  return (
    <span style={{ position: "relative", width: s, height: s, flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={s} height={s} style={{ position: "absolute", inset: 0 }} aria-hidden>
        <polygon points={pts} fill={`${color}14`} stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
      <span style={{ position: "relative", color, fontSize: s * 0.4, lineHeight: 1 }}>{icon}</span>
    </span>
  );
}

// ─── Komponent ───────────────────────────────────────────────────────────────
export function ModuleRadarChart({ moduleProgress }: { moduleProgress: ModuleProgress[] }) {
  const screens = Grid.useBreakpoint();
  const compact = !screens.sm;
  const N = moduleProgress.length;
  const angles = axisAngles(N);

  // Maqsad ballari 0–100 (faqat tugatilgan modullar)
  const targets = moduleProgress.map((m) => (m.completed ? Math.round((m.score ?? 0) * 100) : 0));
  const targetsKey = targets.join(",");

  // 0 dan maqsadgacha silliq animatsiya
  const [anim, setAnim] = useState<number[]>(() => targets.map(() => 0));
  const animRef = useRef(anim);
  const [hovered, setHovered] = useState<number | null>(null);

  useEffect(() => {
    if (N === 0) return;
    const starts = animRef.current.length === N ? [...animRef.current] : targets.map(() => 0);
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / 1200, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const next = targets.map((tgt, i) => starts[i] + (tgt - starts[i]) * e);
      animRef.current = next;
      setAnim(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, N]);

  if (N === 0) return null;

  const scores = anim.length === N ? anim : targets;
  const pts = scores.map((s, i) => polar((R * Math.max(s, 0)) / 100, angles[i]));
  const shape = pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
  const hasScore = targets.some((s) => s > 0);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 720, margin: "0 auto" }}>
      {/* Legend — chap yuqori burchak */}
      <div style={{ position: compact ? "static" : "absolute", top: 0, left: 0, zIndex: 1, display: "flex", flexDirection: compact ? "row" : "column", flexWrap: "wrap", gap: compact ? "6px 12px" : 6, marginBottom: compact ? 8 : 0 }}>
        {BANDS.map((b) => (
          <span key={b.label} style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#475569" }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: b.color }} />
            {b.label}
          </span>
        ))}
      </div>

      <div style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, marginTop: compact ? 30 : 0, marginBottom: compact ? 24 : 0 }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ display: "block", overflow: "visible" }} aria-label="Modullar bo'yicha ball radari">
          <defs>
            {/* Markaz qizil → chekka yashil: bitta yaxlit "issiqlik" disk */}
            <radialGradient id="mrc-heat" cx={CX} cy={CY} r={R} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="30%" stopColor="#ea580c" />
              <stop offset="55%" stopColor="#f59e0b" />
              <stop offset="78%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#16a34a" />
            </radialGradient>
          </defs>

          {/* To'r: konsentrik ko'pburchaklar va o'qlar */}
          {RINGS.map((pct) => (
            <polygon key={pct} points={polygon((R * pct) / 100, angles)} fill={pct === 100 ? "#f8fafc" : "none"} stroke="#e2e8f0" strokeWidth={pct === 100 ? 1.4 : 1} />
          ))}
          {angles.map((a, i) => {
            const e = polar(R, a);
            return <line key={i} x1={CX} y1={CY} x2={fmt(e.x)} y2={fmt(e.y)} stroke="#e2e8f0" strokeWidth={1} />;
          })}
          {/* Natija shakli */}
          {hasScore && (
            <>
              <polygon points={shape} fill="url(#mrc-heat)" fillOpacity={0.82} />
              <polygon points={shape} fill="none" stroke="url(#mrc-heat)" strokeWidth={2.2} strokeLinejoin="round" />
            </>
          )}

          {/* Halqa qiymatlari — shakl ustida, oq hoshiya bilan o'qiladi */}
          {RINGS.slice(0, -1).map((pct) => (
            <text
              key={pct}
              x={CX + 6}
              y={fmt(CY - (R * pct) / 100 - 4)}
              fontSize={10}
              fontWeight={600}
              fill="#64748b"
              stroke="#fff"
              strokeWidth={3}
              paintOrder="stroke"
            >
              {pct}
            </text>
          ))}

          {/* Nuqtalar */}
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={fmt(p.x)}
              cy={fmt(p.y)}
              r={hovered === i ? 7 : 5.5}
              fill="#fff"
              stroke={targets[i] > 0 ? bandColor(targets[i]) : "#cbd5e1"}
              strokeWidth={2.5}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ transition: "r .15s" }}
            >
              <title>{moduleProgress[i].title}: {targets[i]}%{moduleProgress[i].hasFuzzy && moduleProgress[i].fuzzyScore !== undefined ? ` · fuzzy ${moduleProgress[i].fuzzyScore!.toFixed(2)}` : ""}</title>
            </circle>
          ))}
        </svg>

        {/* O'q yorliqlari: olti burchakli belgi + nom + foiz */}
        {moduleProgress.map((m, i) => {
          const a = angles[i];
          const p = polar(LABEL_R, a);
          const cos = Math.cos(a);
          const side = cos > 0.3 ? "right" : cos < -0.3 ? "left" : "center";
          const score = targets[i];
          const color = m.completed ? bandColor(score) : MUTED;
          const icon = m.unlocked || m.completed ? (MODULE_ICONS[m.id] ?? <SafetyOutlined />) : <LockOutlined />;
          const value = m.completed ? `${score}%` : m.unlocked ? "—" : "Yopiq";
          const fuzzy = m.completed && m.hasFuzzy && m.fuzzyScore !== undefined ? m.fuzzyScore.toFixed(2) : null;
          const title = modules[m.id]?.title ?? m.title;
          const transform =
            side === "right" ? "translate(0, -50%)" :
            side === "left" ? "translate(-100%, -50%)" :
            Math.sin(a) < 0 ? "translate(-50%, -100%)" : "translate(-50%, 0)";

          return (
            <div
              key={m.id}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: "absolute",
                left: `${(p.x / W) * 100}%`,
                top: `${(p.y / H) * 100}%`,
                transform,
                display: "flex",
                flexDirection: side === "left" ? "row-reverse" : "row",
                alignItems: "center",
                gap: compact ? 6 : 10,
                textAlign: side === "left" ? "right" : side === "center" && compact ? "center" : "left",
                // Tor ekranda yon yorliqlar chekkadan chiqmasin — o'q va chekka orasidagi joyga o'raladi
                whiteSpace: compact ? "normal" : "nowrap",
                maxWidth: compact ? (side === "center" ? "60%" : `${((CX - LABEL_R) / W) * 100 - 1}%`) : undefined,
                opacity: hovered === null || hovered === i ? 1 : 0.55,
                transition: "opacity .15s",
              }}
            >
              {!compact && <HexBadge color={color} icon={icon} size={46} />}
              <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25, alignItems: side === "left" ? "flex-end" : side === "center" && compact ? "center" : "flex-start" }}>
                <span style={{ fontSize: compact ? 11.5 : 14, fontWeight: 600, color: "#0f172a" }}>{title}</span>
                <span style={{ fontSize: compact ? 13 : 17, fontWeight: 700, color }}>
                  {value}
                  {fuzzy && <span title="Fuzzy baho (0–1)" style={{ fontSize: compact ? 11 : 13, fontWeight: 600, color: "#64748b", marginInlineStart: compact ? 4 : 6, whiteSpace: "nowrap" }}>({fuzzy})</span>}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {!hasScore && (
        <div style={{ textAlign: "center", marginTop: 4 }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: "#64748b" }}>Hali hech qanday modul tugatilmagan.</p>
          <p style={{ margin: "2px 0 0", fontSize: 12, color: "#94a3b8" }}>
            Modul testini topshirganingizdan so'ng natija shu grafikda ko'rinadi.
          </p>
        </div>
      )}
    </div>
  );
}
