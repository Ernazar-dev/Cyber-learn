import { Card, Col, Empty, Flex, Progress, Row, Skeleton, Tag, Tooltip, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

const { Text } = Typography;

// Integral kiberxavfsizlik ko'rsatkichi K (mijoz hujjati, 2.3-bo'lim):
// X₁ (nazariy), X₂ (amaliy), X₃ (vaziyat tahlili) → Mamdani fuzzy → K (0–100).
// Hisob serverda (backend/internal/fuzzy/integral.go); bu yerda faqat ko'rsatiladi.

interface Membership { low: number; medium: number; high: number }
interface RuleFiring { id: string; text: string; output: "low" | "mid" | "high"; alpha: number }
interface IntegralResult {
  k: number;
  level: "low" | "mid" | "high";
  x1: number; x2: number; x3: number;
  x1Mu: Membership; x2Mu: Membership; x3Mu: Membership;
  output: Membership;
  rules: RuleFiring[];
  recommendations: string[];
}
interface IntegralSource { value: number; hasData: boolean; count: number; origin: "assignments" | "diagnostic" | "ctf" }
interface IntegralResponse {
  evaluated: boolean;
  result?: IntegralResult;
  x1: IntegralSource; x2: IntegralSource; x3: IntegralSource;
}

const levelMeta = {
  low: { label: "Past", color: "#dc2626" },
  mid: { label: "O'rta", color: "#d97706" },
  high: { label: "Yuqori", color: "#16a34a" },
} as const;

const inputs = [
  { key: "x1", sym: "X₁", title: "Nazariy bilim", hint: "Nazariy topshiriqlar (yoki diagnostika) o'rtachasi" },
  { key: "x2", sym: "X₂", title: "Amaliy ko'nikma", hint: "Amaliy topshiriqlar o'rtachasi" },
  { key: "x3", sym: "X₃", title: "Vaziyat tahlili", hint: "CTF: ochiq modullardagi challenge'lar bo'yicha yechilgan ball ulushi" },
] as const;

const originText: Record<IntegralSource["origin"], string> = {
  assignments: "topshiriq",
  diagnostic: "diagnostika",
  ctf: "challenge",
};

type Trap = [number, number, number, number];

// K ning chiqish termlari (backend integral.go bilan bir xil): trapetsiya [a, b, c, d]
const outputTerms: { key: keyof Membership; color: string; p: Trap }[] = [
  { key: "low", color: "#dc2626", p: [0, 0, 25, 45] },
  { key: "medium", color: "#d97706", p: [35, 55, 55, 75] },
  { key: "high", color: "#16a34a", p: [55, 85, 100, 100] },
];

function trap(x: number, [a, b, c, d]: Trap) {
  if (x >= b && x <= c) return 1;
  if (x > a && x < b) return (x - a) / (b - a);
  if (x > c && x < d) return (d - x) / (d - c);
  return 0;
}

/** K ning chiqish termlari, agregatsiya va natija nuqtasi — kichik SVG grafik */
function OutputChart({ output, k }: { output: Membership; k: number }) {
  const W = 300, H = 90, pad = 4;
  const sx = (x: number) => pad + (x / 100) * (W - pad * 2);
  const sy = (m: number) => H - 16 - m * (H - 28);
  const pts = (fn: (x: number) => number) =>
    Array.from({ length: 101 }, (_, i) => `${sx(i).toFixed(1)},${sy(fn(i)).toFixed(1)}`).join(" ");
  // Agregatsiya: har bir term o'z faolligida kesilgan, ularning maksimumi
  const agg = (x: number) =>
    Math.max(...outputTerms.map((t) => Math.min(output[t.key], trap(x, t.p))));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`Chiqish termlari va K = ${k.toFixed(1)}`}>
      {outputTerms.map((t) => (
        <polyline key={t.key} points={pts((x) => trap(x, t.p))} fill="none" stroke={t.color} strokeOpacity={0.35} strokeWidth={1.2} />
      ))}
      <polygon
        points={`${sx(0)},${sy(0)} ${pts(agg)} ${sx(100)},${sy(0)}`}
        fill="#2563eb" fillOpacity={0.14} stroke="#2563eb" strokeWidth={1.5}
      />
      <line x1={sx(k)} x2={sx(k)} y1={sy(1)} y2={sy(0)} stroke="#0f172a" strokeWidth={1.5} strokeDasharray="3 3" />
      <text x={sx(k)} y={10} textAnchor="middle" fontSize="10" fontWeight={700} fill="#0f172a">K = {k.toFixed(1)}</text>
      {[0, 40, 70, 100].map((v) => (
        <text key={v} x={sx(v)} y={H - 3} textAnchor="middle" fontSize="9" fill="#64748b">{v}</text>
      ))}
    </svg>
  );
}

function InputRow({ sym, title, hint, src, mu }: {
  sym: string; title: string; hint: string; src: IntegralSource; mu?: Membership;
}) {
  return (
    <Flex vertical gap={4}>
      <Flex justify="space-between" gap={8}>
        <Tooltip title={hint}><Text style={{ fontSize: 13 }}>{sym} — {title}</Text></Tooltip>
        <Text strong style={{ fontSize: 13 }}>{src.hasData ? src.value.toFixed(0) : "—"}</Text>
      </Flex>
      <Progress percent={src.hasData ? Math.round(src.value) : 0} showInfo={false} size="small" />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {src.hasData
          ? `${src.count} ta ${originText[src.origin]}`
          : "Hali natija yo'q (0 deb olindi)"}
        {mu && src.hasData && ` · μ: past ${mu.low.toFixed(2)}, o'rta ${mu.medium.toFixed(2)}, yuqori ${mu.high.toFixed(2)}`}
      </Text>
    </Flex>
  );
}

/** studentId berilmasa — joriy o'quvchining o'z K si */
export function IntegralCard({ studentId }: { studentId?: number }) {
  const { token } = useAppStore();
  const path = studentId ? `/api/students/${studentId}/integral` : "/api/students/me/integral";
  const { data, isLoading, isError } = useQuery({
    queryKey: ["integral", studentId ?? "me"],
    queryFn: () => api.get<IntegralResponse>(path, token),
  });

  const title = <Flex align="center" gap={8}><ExperimentOutlined /> Integral kiberxavfsizlik ko'rsatkichi (K)</Flex>;

  if (isLoading) return <Card title={title}><Skeleton active paragraph={{ rows: 4 }} /></Card>;
  if (isError || !data) {
    return <Card title={title}><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="K ni yuklab bo'lmadi" /></Card>;
  }
  const r = data.result;
  if (!data.evaluated || !r) {
    return (
      <Card title={title}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="K hisoblash uchun hali natija yo'q — topshiriq yeching yoki CTF challenge'ini bajaring."
        />
      </Card>
    );
  }
  const lv = levelMeta[r.level];
  const mus = { x1: r.x1Mu, x2: r.x2Mu, x3: r.x3Mu };

  return (
    <Card
      title={title}
      extra={<Tag color={lv.color} bordered={false} style={{ marginInlineEnd: 0 }}>{lv.label} daraja</Tag>}
      style={{ textAlign: "left" }}
    >
      <Row gutter={[20, 16]}>
        <Col xs={24} md={9}>
          <Flex vertical align="center" gap={8}>
            <Progress
              type="dashboard"
              size={150}
              percent={Math.round(r.k)}
              strokeColor={lv.color}
              format={() => (
                <Flex vertical align="center">
                  <span style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{r.k.toFixed(1)}%</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>K</Text>
                </Flex>
              )}
            />
            <OutputChart output={r.output} k={r.k} />
            <Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
              μ(past) {r.output.low.toFixed(2)} · μ(o'rta) {r.output.medium.toFixed(2)} · μ(yuqori) {r.output.high.toFixed(2)} → sentroid
            </Text>
          </Flex>
        </Col>

        <Col xs={24} md={15}>
          <Flex vertical gap={14}>
            {inputs.map((i) => (
              <InputRow key={i.key} sym={i.sym} title={i.title} hint={i.hint} src={data[i.key]} mu={mus[i.key]} />
            ))}

            <Flex vertical gap={4}>
              <Text strong style={{ fontSize: 13 }}>Tavsiya</Text>
              {r.recommendations.map((t) => (
                <Text key={t} type="secondary" style={{ fontSize: 13 }}>• {t}</Text>
              ))}
            </Flex>

            <Flex vertical gap={2}>
              <Text strong style={{ fontSize: 13 }}>Ishlagan qoidalar</Text>
              {r.rules.slice(0, 4).map((rule, i) => (
                <Text key={i} type="secondary" style={{ fontSize: 12 }}>
                  {rule.id}: {rule.text} · α = {rule.alpha.toFixed(2)}
                </Text>
              ))}
            </Flex>
          </Flex>
        </Col>
      </Row>
    </Card>
  );
}
