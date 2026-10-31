import { Card, Col, Flex, Progress, Row, Tag, Tooltip, Typography } from "antd";
import { ExperimentOutlined } from "@ant-design/icons";
import type { FuzzyDecision, FuzzyPerformance, Membership, Readiness } from "@/store/useAppStore";

const { Text } = Typography;

// Mijoz hujjatidagi fuzzy baholash: "Fuzzy-оценка успеваемости", "нечеткое решение перехода"
// va "Fuzzy итоговая оценка". % baho o'zgarmaydi — bular uning yonida ko'rsatiladi.

const readinessMeta: Record<Readiness, { label: string; color: string }> = {
  ready: { label: "Tayyor", color: "success" },
  partial: { label: "Qisman tayyor", color: "warning" },
  not_ready: { label: "Tayyor emas", color: "error" },
};

const decisionMeta: Record<FuzzyDecision, { title: string; text: string; color: string }> = {
  advance: {
    title: "Keyingi bosqichga o'tish",
    text: "O'zlashtirish yuqori — keyingi mavzuga o'tishingiz mumkin.",
    color: "#16a34a",
  },
  repeat: {
    title: "Takrorlash + maslahatlar",
    text: "O'zlashtirish o'rtacha — xato qilgan savollaringiz mavzusini qayta ko'rib, yana urinib ko'ring.",
    color: "#d97706",
  },
  remediate: {
    title: "Remediatsiya (soddalashtirish)",
    text: "O'zlashtirish past — modul nazariyasini boshidan, sodda misollar bilan qayta o'qib chiqing.",
    color: "#dc2626",
  },
};

export function ReadinessTag({ readiness }: { readiness?: Readiness }) {
  if (!readiness) return <Text type="secondary">—</Text>;
  const m = readinessMeta[readiness];
  return <Tag color={m.color} bordered={false} style={{ marginInlineEnd: 0 }}>{m.label}</Tag>;
}

/** Fuzzy baho 0..1 — kasr ko'rinishida (hujjatdagi kabi: 0.62) */
export function fuzzyValue(score: number) {
  return score.toFixed(2);
}

function MuRow({ label, hint, value, mu }: { label: string; hint: string; value: number; mu: Membership }) {
  return (
    <Flex vertical gap={4}>
      <Flex justify="space-between" gap={8}>
        <Tooltip title={hint}><Text style={{ fontSize: 13 }}>{label}</Text></Tooltip>
        <Text strong style={{ fontSize: 13 }}>{fuzzyValue(value)}</Text>
      </Flex>
      <Text type="secondary" style={{ fontSize: 12 }}>
        μ(past) {fuzzyValue(mu.low)} · μ(o'rta) {fuzzyValue(mu.medium)} · μ(yuqori) {fuzzyValue(mu.high)}
      </Text>
    </Flex>
  );
}

/** Bitta urinishning fuzzy bahosi: kirishlar, μ qiymatlar, qaror va tayyorlik */
export function FuzzyPerformanceCard({ perf }: { perf: FuzzyPerformance }) {
  const d = decisionMeta[perf.decision];
  return (
    <Card
      size="small"
      title={<Flex align="center" gap={8}><ExperimentOutlined /> Fuzzy-baho (o'zlashtirish)</Flex>}
      extra={<ReadinessTag readiness={perf.readiness} />}
      style={{ textAlign: "left" }}
    >
      <Flex vertical gap={14}>
        <Flex align="center" gap={16} wrap>
          <Progress
            type="circle"
            size={72}
            percent={Math.round(perf.score * 100)}
            format={() => fuzzyValue(perf.score)}
            strokeColor={d.color}
          />
          <Flex vertical gap={2} style={{ flex: 1, minWidth: 200 }}>
            <Text strong style={{ color: d.color }}>{d.title}</Text>
            <Text type="secondary" style={{ fontSize: 13 }}>{d.text}</Text>
          </Flex>
        </Flex>

        <Row gutter={[16, 12]}>
          <Col xs={24} sm={8}>
            <MuRow label="x₁ — bilim" hint="To'g'ri javoblar ulushi" value={perf.knowledge} mu={perf.knowledgeMu} />
          </Col>
          <Col xs={24} sm={8}>
            <MuRow label="x₂ — xatolar" hint="Noto'g'ri javoblar ulushi (javobsiz savollar kirmaydi)" value={perf.errors} mu={perf.errorsMu} />
          </Col>
          <Col xs={24} sm={8}>
            <MuRow label="x₃ — tezlik" hint="Server o'lchagan vaqt: 1 — juda tez, 0 — me'yordan sekin" value={perf.speed} mu={perf.speedMu} />
          </Col>
        </Row>

        <Text type="secondary" style={{ fontSize: 12 }}>
          IF–THEN qoidalari natijasi: μ(low) {fuzzyValue(perf.output.low)} · μ(mid) {fuzzyValue(perf.output.medium)} · μ(high) {fuzzyValue(perf.output.high)}
          {" "}→ defazzifikatsiya: {fuzzyValue(perf.score)}
        </Text>
      </Flex>
    </Card>
  );
}

/** % ko'rsatkich yonidagi fuzzy baho (0..1): "62% (0.62)" */
export function FuzzyNum({ score, size = 13 }: { score?: number; size?: number }) {
  if (score === undefined || Number.isNaN(score)) return null;
  return (
    <Tooltip title="Fuzzy baho (0–1 oraliqda)">
      <Text type="secondary" style={{ fontSize: size, fontWeight: 600, marginInlineStart: 6, whiteSpace: "nowrap" }}>
        ({fuzzyValue(score)})
      </Text>
    </Tooltip>
  );
}

/** Ixcham ko'rinish: "0.74 · Tayyor" — jadval va ro'yxatlar uchun */
export function FuzzyBadge({ score, readiness }: { score?: number; readiness?: Readiness }) {
  if (score === undefined || !readiness) return <Text type="secondary">—</Text>;
  return (
    <Flex align="center" gap={6}>
      <Text strong>{fuzzyValue(score)}</Text>
      <ReadinessTag readiness={readiness} />
    </Flex>
  );
}
