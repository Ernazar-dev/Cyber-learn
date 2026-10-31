import { Fragment, useEffect, type CSSProperties } from "react";
import { App, Button, Card, Col, Flex, Row, Slider, Space, Tag, Tooltip, Typography } from "antd";
import {
  ArrowDownOutlined, BarChartOutlined, CalculatorOutlined, CodeOutlined, ExperimentOutlined, FormOutlined, ReadOutlined,
  ReloadOutlined, SaveOutlined, SyncOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { IconTile, LevelTag, PageHeader } from "@/components/common";

const { Text } = Typography;

const DEFAULTS = { rule1Weight: 0.2, rule2Weight: 0.5, rule3Weight: 0.9, beginnerThreshold: 0.4, intermediateThreshold: 0.7 };

type WeightKey = keyof typeof DEFAULTS;

const RULES: { key: WeightKey; label: string; desc: string; min: number; max: number }[] = [
  { key: "rule1Weight", label: "1-qoida · boshlang'ich", desc: "Kam bilim va ko'p xatolar", min: 0.05, max: 0.5 },
  { key: "rule2Weight", label: "2-qoida · o'rta", desc: "O'rtacha bilim va tezlik", min: 0.3, max: 0.7 },
  { key: "rule3Weight", label: "3-qoida · yuqori", desc: "Yuqori bilim va kam xatolar", min: 0.7, max: 1 },
];

const THRESHOLDS: { key: WeightKey; label: string; desc: string; min: number; max: number }[] = [
  { key: "beginnerThreshold", label: "Boshlang'ich chegarasi", desc: "Bundan past ball — boshlang'ich daraja", min: 0.2, max: 0.5 },
  { key: "intermediateThreshold", label: "O'rta chegarasi", desc: "Bundan yuqori ball — yuqori daraja", min: 0.5, max: 0.8 },
];

const LEVEL_COLORS = { beginner: "#f59e0b", intermediate: "#2563eb", advanced: "#16a34a" };

/** O'quv sikli: 5 bosqich ketma-ket, oxirida keyingi siklga qaytiladi */
const STAGES = [
  { icon: <FormOutlined />, title: "Diagnostika", desc: "Kirish testi va boshlang'ich bilim darajasi", color: "#2563eb" },
  { icon: <ReadOutlined />, title: "O'rganish", desc: "Nazariya + AI yordamchi + Virtual laboratoriya", color: "#0891b2" },
  { icon: <CodeOutlined />, title: "Amaliy faoliyat", desc: "CTF mashqlari + Amaliy topshiriqlar", color: "#7c3aed" },
  { icon: <ExperimentOutlined />, title: "Baholash", desc: "Topshiriq natijasi (%) + Fuzzy baho", color: "#d97706" },
  { icon: <BarChartOutlined />, title: "Natijalarni tahlil qilish", desc: "Tayyorlik darajasi + O'tish qarori: oldinga, takrorlash yoki remediatsiya", color: "#db2777" },
];

/** Tizimning ishlash sxemasi — vertikal oqim, bosqichlar orasida strelka */
function WorkflowScheme({ current }: { current?: number }) {
  return (
    <div className="flow-scheme">
      {STAGES.map((s, i) => (
        <Fragment key={s.title}>
          {i > 0 && <ArrowDownOutlined className="flow-scheme__arrow" aria-hidden />}
          <div
            className={`flow-step${current === i ? " flow-step--current" : ""}`}
            style={{ "--step": s.color } as CSSProperties}
          >
            <span className="flow-step__num">{i + 1}</span>
            <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
              <Text strong style={{ fontSize: 15.5 }}>{s.title}</Text>
              <Text style={{ fontSize: 13.5, color: "#475569" }}>{s.desc}</Text>
            </Flex>
            {current === i
              ? <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0 }}>Siz shu yerdasiz</Tag>
              : <span className="flow-step__icon" aria-hidden>{s.icon}</span>}
          </div>
        </Fragment>
      ))}
      <div className="flow-scheme__loop">
        <SyncOutlined />
        <span>Keyingi o'quv sikliga qaytish</span>
      </div>
    </div>
  );
}

/** Daraja shkalasi: chegaralar bo'yicha uch rangli chiziq va (ixtiyoriy) o'quvchi belgisi */
function LevelScale({ beginner, intermediate, marker }: { beginner: number; intermediate: number; marker?: number }) {
  const seg = [
    { label: "Boshlang'ich", from: 0, to: beginner, color: LEVEL_COLORS.beginner },
    { label: "O'rta", from: beginner, to: intermediate, color: LEVEL_COLORS.intermediate },
    { label: "Yuqori", from: intermediate, to: 1, color: LEVEL_COLORS.advanced },
  ];
  return (
    <div>
      <div style={{ position: "relative", height: 14, borderRadius: 999, overflow: "hidden", display: "flex" }}>
        {seg.map((s) => (
          <div key={s.label} style={{ width: `${(s.to - s.from) * 100}%`, background: s.color, opacity: 0.85, transition: "width .2s" }} />
        ))}
      </div>
      <div style={{ position: "relative", height: 18, marginTop: 4 }}>
        {[0, beginner, intermediate, 1].map((v, i) => (
          <Text key={i} type="secondary" style={{ position: "absolute", left: `${v * 100}%`, transform: i === 0 ? "none" : i === 3 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 11.5, fontFamily: "ui-monospace, Menlo, monospace", whiteSpace: "nowrap" }}>
            {v.toFixed(2)}
          </Text>
        ))}
        {marker !== undefined && (
          <Tooltip title={`Sizning ballingiz: ${(marker * 100).toFixed(0)}%`}>
            <span style={{ position: "absolute", left: `${marker * 100}%`, top: -22, transform: "translateX(-50%)", width: 14, height: 14, borderRadius: 999, background: "#fff", border: "3px solid #0f172a", boxShadow: "0 1px 4px rgba(15,23,42,.3)" }} />
          </Tooltip>
        )}
      </div>
      <Flex gap={16} wrap style={{ marginTop: 6 }}>
        {seg.map((s) => (
          <Text key={s.label} style={{ fontSize: 12.5, color: "#475569" }}>
            <span style={{ display: "inline-block", width: 9, height: 9, borderRadius: 999, background: s.color, marginRight: 6 }} />
            {s.label} · {(s.from * 100).toFixed(0)}–{(s.to * 100).toFixed(0)}%
          </Text>
        ))}
      </Flex>
    </div>
  );
}

export default function AIEngine() {
  const {
    userRole, fuzzyWeights, updateFuzzyWeights, hasCompletedInitialTest, currentLevel, readinessScore,
    fetchFuzzyWeights, saveFuzzyWeights,
  } = useAppStore();
  const { message } = App.useApp();
  const isTeacher = userRole === "Teacher";

  useEffect(() => {
    fetchFuzzyWeights();
  }, [fetchFuzzyWeights]);

  const save = async () => {
    const res = await saveFuzzyWeights();
    if (res.success) message.success("Fuzzy parametrlari saqlandi");
    else message.error(res.message ?? "Saqlashda xatolik");
  };

  const reset = () => {
    updateFuzzyWeights(DEFAULTS);
    message.info("Standart qiymatlar tiklandi — saqlashni unutmang");
  };

  const sliderRow = (s: { key: WeightKey; label: string; desc: string; min: number; max: number }) => (
    <div key={s.key}>
      <Flex justify="space-between" align="center">
        <Text strong style={{ fontSize: 13.5 }}>{s.label}</Text>
        <Tag bordered={false} color="blue" style={{ marginInlineEnd: 0, fontFamily: "ui-monospace, Menlo, monospace" }}>
          {fuzzyWeights[s.key].toFixed(2)}
        </Tag>
      </Flex>
      <Text type="secondary" style={{ fontSize: 12 }}>{s.desc}</Text>
      <Slider
        min={s.min}
        max={s.max}
        step={0.05}
        disabled={!isTeacher}
        value={fuzzyWeights[s.key]}
        onChange={(v) => updateFuzzyWeights({ [s.key]: v })}
        style={{ margin: "6px 4px 16px" }}
      />
    </div>
  );

  // Diagnostikadan o'tmagan o'quvchiga birinchi bosqich belgilanadi
  const currentStage = !isTeacher && !hasCompletedInitialTest ? 0 : undefined;

  return (
    <div className="page">
      <PageHeader
        title="AI dvigateli"
        subtitle="Fuzzy mantiq va ANFIS asosidagi moslashuvchan baholash tizimi."
        extra={isTeacher && (
          <>
            <Tooltip title="Standart qiymatlarni tiklash"><Button icon={<ReloadOutlined />} onClick={reset}>Standart</Button></Tooltip>
            <Button type="primary" icon={<SaveOutlined />} onClick={save}>Saqlash</Button>
          </>
        )}
      />

      {/* Holat va daraja shkalasi */}
      <Card className="dashboard-welcome" styles={{ body: { padding: 24 } }}>
        <Row gutter={[32, 20]} align="middle">
          <Col xs={24} md={8}>
            <Flex gap={14} align="center">
              <IconTile icon={<ExperimentOutlined />} size={52} />
              {isTeacher ? (
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Tizim holati</Text>
                  <Text strong style={{ fontSize: 18 }}>3 ta qoida · 3 ta daraja</Text>
                  <Text type="secondary" style={{ fontSize: 12.5 }}>O'zgarishlar barcha o'quvchilarga ta'sir qiladi</Text>
                </Flex>
              ) : (
                <Flex vertical gap={4}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Sizning tayyorgarligingiz</Text>
                  <Flex align="center" gap={10}>
                    <Text strong style={{ fontSize: 26, lineHeight: 1 }}>{hasCompletedInitialTest ? `${Math.round(readinessScore * 100)}%` : "—"}</Text>
                    {hasCompletedInitialTest ? <LevelTag level={currentLevel} /> : <Tag bordered={false}>Diagnostika kutilmoqda</Tag>}
                  </Flex>
                </Flex>
              )}
            </Flex>
          </Col>
          <Col xs={24} md={16}>
            <Text strong style={{ display: "block", marginBottom: 14 }}>Daraja shkalasi</Text>
            <LevelScale
              beginner={fuzzyWeights.beginnerThreshold}
              intermediate={fuzzyWeights.intermediateThreshold}
              marker={!isTeacher && hasCompletedInitialTest ? readinessScore : undefined}
            />
          </Col>
        </Row>
      </Card>

      {/* Ishlash sxemasi — 4 bosqich */}
      <Card title="Tizimning ishlash sxemasi" extra={<Text type="secondary" style={{ fontSize: 12.5 }}>Har bir o'quv sikli 5 bosqichdan iborat</Text>}>
        <WorkflowScheme current={currentStage} />
      </Card>

      {/* Parametrlar va model */}
      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card
            title="Qoidalar parametrlari"
            extra={!isTeacher && <Text type="secondary" style={{ fontSize: 12.5 }}>Faqat ko'rish — parametrlarni o'qituvchi belgilaydi</Text>}
            style={{ height: "100%" }}
          >
            <Row gutter={32}>
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 10 }}>
                  Qoida og'irliklari
                </Text>
                {RULES.map(sliderRow)}
              </Col>
              <Col xs={24} md={12}>
                <Text type="secondary" style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 10 }}>
                  Daraja chegaralari
                </Text>
                {THRESHOLDS.map(sliderRow)}
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Matematik model" extra={<CalculatorOutlined style={{ color: "#94a3b8" }} />} style={{ height: "100%" }}>
            <Flex vertical gap={16}>
              <div>
                <Text strong style={{ fontSize: 13.5 }}>1. A'zolik funksiyalari</Text>
                <Text type="secondary" style={{ display: "block", fontSize: 12.5, margin: "2px 0 8px" }}>
                  Har bir ko'rsatkich (bilim, xatolar, tezlik) uchburchak funksiya bilan baholanadi.
                </Text>
                <Text code>μ(past), μ(o'rta), μ(yuqori)</Text>
              </div>
              <div>
                <Text strong style={{ fontSize: 13.5 }}>2. Qoidalarning faollashuvi</Text>
                <Text type="secondary" style={{ display: "block", fontSize: 12.5, margin: "2px 0 8px" }}>
                  Har bir qoida kuchi R₁, R₂, R₃ a'zolik qiymatlaridan hisoblanadi.
                </Text>
              </div>
              <div>
                <Text strong style={{ fontSize: 13.5 }}>3. Defuzzifikatsiya</Text>
                <Text type="secondary" style={{ display: "block", fontSize: 12.5, margin: "2px 0 8px" }}>Yakuniy tayyorgarlik bali:</Text>
                <Text code>Ball = (R₁·w₁ + R₂·w₂ + R₃·w₃) / (R₁ + R₂ + R₃)</Text>
                <Space size={6} wrap style={{ marginTop: 10 }}>
                  <Tag bordered={false}>w₁ = {fuzzyWeights.rule1Weight.toFixed(2)}</Tag>
                  <Tag bordered={false}>w₂ = {fuzzyWeights.rule2Weight.toFixed(2)}</Tag>
                  <Tag bordered={false}>w₃ = {fuzzyWeights.rule3Weight.toFixed(2)}</Tag>
                </Space>
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
