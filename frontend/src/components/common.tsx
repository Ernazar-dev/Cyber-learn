import type { CSSProperties, ReactNode } from "react";
import { Breadcrumb, Card, Flex, Tag, Typography } from "antd";
import { Link } from "wouter";
import { translateLevel } from "@/lib/utils";
import { CountUp } from "@/components/motion";
import logoUrl from "@/images/logo.svg";

const { Title, Text } = Typography;

// ── Brand logo ──────────────────────────────────────────────
export function BrandLogo({ size = 36, style }: { size?: number; style?: CSSProperties }) {
  return <img src={logoUrl} width={size} height={size} alt="CyberAI" draggable={false} style={{ display: "block", flexShrink: 0, ...style }} />;
}

type Level = "Beginner" | "Intermediate" | "Advanced";
type Tone = "primary" | "muted" | "success" | "warning" | "glass";

// ── Page header ─────────────────────────────────────────────
export interface Crumb {
  title: string;
  href?: string;
}

export function PageHeader({
  title,
  subtitle,
  crumbs,
  extra,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  crumbs?: Crumb[];
  extra?: ReactNode;
}) {
  return (
    <Flex vertical gap={10}>
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb
          items={crumbs.map((c) => ({
            title: c.href ? <Link href={c.href}>{c.title}</Link> : c.title,
          }))}
        />
      )}
      <Flex justify="space-between" align="center" gap={16} wrap>
        <Flex vertical gap={4} style={{ minWidth: 0, flex: "1 1 320px" }}>
          <Title level={2} style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.25 }}>
            {title}
          </Title>
          {subtitle && <Text type="secondary" style={{ fontSize: 14, maxWidth: 760 }}>{subtitle}</Text>}
        </Flex>
        {extra && (
          <Flex gap={8} wrap>
            {extra}
          </Flex>
        )}
      </Flex>
    </Flex>
  );
}

// ── Icon tile ───────────────────────────────────────────────
export function IconTile({
  icon,
  size = 40,
  tone = "primary",
  style,
}: {
  icon: ReactNode;
  size?: number;
  tone?: Tone;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`icon-tile${tone === "primary" ? "" : ` is-${tone}`}`}
      style={{ width: size, height: size, fontSize: size * 0.45, ...style }}
    >
      {icon}
    </span>
  );
}

// ── Stat card ───────────────────────────────────────────────
export function StatCard({
  label,
  value,
  count,
  icon,
  hint,
  tone = "primary",
  footer,
}: {
  label: string;
  value?: ReactNode;
  /** Agar berilsa, raqam 0 dan sanab chiqadi */
  count?: { value: number; decimals?: number; suffix?: string };
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  footer?: ReactNode;
}) {
  return (
    <Card className="stat-card" style={{ height: "100%" }} styles={{ body: { padding: 20 } }}>
      <Flex vertical gap={10}>
        <Flex justify="space-between" align="center" gap={8}>
          <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
            {label}
          </Text>
          {icon && <IconTile icon={icon} size={36} tone={tone} />}
        </Flex>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1, color: "#0f172a" }}>
          {count ? (
            <CountUp value={count.value} decimals={count.decimals} suffix={count.suffix} />
          ) : typeof value === "number" ? (
            <CountUp value={value} separator />
          ) : (
            value
          )}
        </div>
        {hint && (
          <Text type="secondary" style={{ fontSize: 12.5 }}>
            {hint}
          </Text>
        )}
        {footer}
      </Flex>
    </Card>
  );
}

// ── Level tag ───────────────────────────────────────────────
const levelColor: Record<Level, string> = {
  Beginner: "orange",
  Intermediate: "blue",
  Advanced: "green",
};

export function LevelTag({ level }: { level: Level }) {
  return (
    <Tag color={levelColor[level]} bordered={false} style={{ marginInlineEnd: 0 }}>
      {translateLevel(level)}
    </Tag>
  );
}

// ── Section title ───────────────────────────────────────────
export function SectionTitle({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <Flex justify="space-between" align="center" gap={12} wrap>
      <Title level={4} style={{ fontWeight: 800, fontSize: 18 }}>
        {children}
      </Title>
      {extra}
    </Flex>
  );
}

// antd Form `requiredMark` — marks optional fields in Uzbek.
export const optionalMark = (label: ReactNode, { required }: { required: boolean }) => (
  <>
    {label}
    {!required && <Text type="secondary" style={{ marginInlineStart: 4, fontWeight: 400 }}>(ixtiyoriy)</Text>}
  </>
);

export function percent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}
