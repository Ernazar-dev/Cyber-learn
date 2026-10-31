import { useCallback, useMemo, useState } from "react";
import { App, Alert, Button, Empty, Flex, Result, Segmented, Tag, Typography } from "antd";
import { CalendarOutlined, CheckCircleFilled, CheckOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import type { Assignment, FuzzyPerformance } from "@/store/useAppStore";
import { MODULE_PASSING_SCORE } from "@/data/curriculum";
import { QuizRunner } from "@/components/QuizRunner";
import { percent } from "@/components/common";
import { FuzzyPerformanceCard } from "@/components/FuzzyEvaluation";

const { Text, Title, Paragraph } = Typography;

/** Bitta savolga ~1 daqiqa — taymersiz rejimda faqat "tezlik" me'yori uchun (backend bilan bir xil) */
const SECONDS_PER_QUESTION = 60;

function AssignmentBody({ assignment }: { assignment: Assignment }) {
  const { completeAssignment, submitAssessment, startAssignment } = useAppStore();
  const { message } = App.useApp();
  const [saving, setSaving] = useState(false);
  const [moduleCompleted, setModuleCompleted] = useState(false);
  const [performance, setPerformance] = useState<FuzzyPerformance | null>(null);
  // To'g'ri javoblar o'quvchiga kelmaydi (-1) — baholash `grade` orqali serverda
  const questions = useMemo(
    () => assignment.questions.map((q) => ({ q: q.question, options: q.options, correct: q.correctAnswer })),
    [assignment.questions],
  );

  const complete = async () => {
    setSaving(true);
    const res = await completeAssignment(assignment.id);
    setSaving(false);
    if (res.success) message.success("Topshiriq bajarildi");
    else message.error(res.message ?? "Xatolik");
  };

  const grade = useCallback(async (answers: number[]) => {
    const res = await completeAssignment(assignment.id, answers);
    if (!res.success || !res.result) {
      message.error(res.message ?? "Javoblarni yuborib bo'lmadi, qayta urinib ko'ring");
      throw new Error("grade failed");
    }
    setModuleCompleted(res.result.moduleCompleted);
    setPerformance(res.result.performance ?? null);
    // Tayyorgarlik darajasini server o'zi (baholangan javoblardan) yangilaydi — shuni ko'rsatamiz
    const a = res.result.assessment;
    if (a) submitAssessment({ knowledge: a.knowledge, errors: a.errors, speed: a.speed }, a);
    return res.result.correct;
  }, [assignment.id, completeAssignment, message, submitAssessment]);

  const onFinish = useCallback(() => {}, []);
  const onStart = useCallback(() => startAssignment(assignment.id), [assignment.id, startAssignment]);

  return (
    <Flex vertical gap={16}>
      <Flex vertical gap={6}>
        <Flex align="center" gap={8} wrap>
          <Title level={5} style={{ margin: 0, fontWeight: 600 }}>{assignment.title}</Title>
          {assignment.completed
            ? <Tag color="success" bordered={false} icon={<CheckCircleFilled />}>Bajarildi</Tag>
            : <Tag color="warning" bordered={false} icon={<ClockCircleOutlined />}>Bajarilmagan</Tag>}
        </Flex>
        <Text type="secondary" style={{ fontSize: 13 }}>
          <CalendarOutlined /> {assignment.dateAssigned}
          {questions.length > 0 && ` · ${questions.length} ta savol`}
        </Text>
        {assignment.description && <Paragraph style={{ margin: "6px 0 0", whiteSpace: "pre-line" }}>{assignment.description}</Paragraph>}
      </Flex>

      {questions.length > 0 ? (
        <QuizRunner
          key={assignment.id}
          title="O'qituvchi savollari"
          description={assignment.completed
            ? "Topshiriq bajarilgan. Xohlasangiz savollarni yana bir bor yechib ko'rishingiz mumkin."
            : `Kamida ${percent(MODULE_PASSING_SCORE)} to'g'ri javob bersangiz, topshiriq bajarilgan deb belgilanadi.`}
          questions={questions}
          timeLimit={questions.length * SECONDS_PER_QUESTION}
          timed={false}
          passScore={MODULE_PASSING_SCORE}
          startLabel={assignment.completed ? "Qayta yechish" : "Boshlash"}
          grade={grade}
          onStart={onStart}
          onFinish={onFinish}
          renderResult={(o, retry) => {
            const passed = o.knowledge >= MODULE_PASSING_SCORE;
            return (
              <Result
                status={passed ? "success" : "warning"}
                title={moduleCompleted
                  ? "Modul tugatildi — sertifikatingiz tayyor!"
                  : passed ? "Topshiriq bajarildi" : "Natija yetarli emas"}
                subTitle={`${o.total} ta savoldan ${o.correct} ta to'g'ri (${percent(o.knowledge)}).${passed ? "" : ` Kamida ${percent(MODULE_PASSING_SCORE)} kerak — nazariyani qayta ko'rib chiqing.`}`}
                extra={
                  <Flex vertical gap={16} align="center">
                    {performance && <div style={{ width: "100%", maxWidth: 640 }}><FuzzyPerformanceCard perf={performance} /></div>}
                    <Button onClick={retry}>Qayta urinish</Button>
                  </Flex>
                }
              />
            );
          }}
        />
      ) : assignment.completed ? (
        <Alert type="success" showIcon message="Siz bu topshiriqni bajarilgan deb belgilagansiz." />
      ) : (
        <Flex vertical gap={12} style={{ background: "#f8fafc", border: "1px solid #eef1f6", borderRadius: 12, padding: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Bu topshiriqda test savollari yo'q. Yuqoridagi ko'rsatmani bajarib bo'lgach, belgilab qo'ying.
          </Text>
          <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={complete} style={{ alignSelf: "flex-start" }}>
            Bajardim
          </Button>
        </Flex>
      )}
    </Flex>
  );
}

/** Modul sahifasidagi "Topshiriq" tabi: shu modulga berilgan o'qituvchi topshiriqlari. */
export function AssignmentPanel({ items, initialId }: { items: Assignment[]; initialId?: number }) {
  const sorted = useMemo(
    () => [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || b.dateAssigned.localeCompare(a.dateAssigned)),
    [items],
  );
  const [selected, setSelected] = useState<number | undefined>(
    sorted.some((a) => a.id === initialId) ? initialId : sorted[0]?.id,
  );
  const current = sorted.find((a) => a.id === selected) ?? sorted[0];

  if (!current) return <Empty description="Bu modul bo'yicha topshiriqlar yo'q" />;

  return (
    <Flex vertical gap={16}>
      {sorted.length > 1 && (
        <Segmented<number>
          block
          value={current.id}
          onChange={setSelected}
          options={sorted.map((a) => ({
            value: a.id,
            label: (
              <Flex align="center" gap={6} justify="center" style={{ overflow: "hidden" }}>
                {a.completed ? <CheckCircleFilled style={{ color: "#16a34a" }} /> : <ClockCircleOutlined style={{ color: "#d97706" }} />}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{a.title}</span>
              </Flex>
            ),
          }))}
        />
      )}
      <AssignmentBody key={current.id} assignment={current} />
    </Flex>
  );
}
