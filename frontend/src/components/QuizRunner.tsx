import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Card, Flex, List, Popconfirm, Progress, Tag, Tooltip, Typography } from "antd";
import {
  ArrowLeftOutlined, ArrowRightOutlined, CheckCircleOutlined, ClockCircleOutlined, FieldTimeOutlined,
  ForwardOutlined, PlayCircleOutlined, QuestionCircleOutlined,
} from "@ant-design/icons";
import type { QuizQuestion } from "@/data/curriculum";
import { IconTile } from "@/components/common";

const { Title, Text, Paragraph } = Typography;

export interface QuizOutcome {
  correct: number;
  total: number;
  knowledge: number;
  errors: number;
  speed: number;
}

interface QuizRunnerProps {
  title: string;
  description?: ReactNode;
  questions: QuizQuestion[];
  /** Taymerli rejimda — umumiy vaqt; taymersiz rejimda faqat "tezlik" ko'rsatkichi uchun me'yor. */
  timeLimit: number;
  /**
   * true (standart): ekranda taymer, vaqt tugasa avtomatik yakunlanadi, savollar ketma-ket.
   * false: taymer yo'q; savolni o'tkazib yuborish, istalgan savolga qaytish va javobni o'zgartirish mumkin.
   */
  timed?: boolean;
  passScore?: number;
  extraRules?: string[];
  startLabel?: string;
  /** If set, the start button is disabled and this text explains why. */
  blockedReason?: string;
  /**
   * Berilsa, javoblar shu funksiya orqali (masalan, serverda) baholanadi va u to'g'ri javoblar sonini qaytaradi.
   * Xato tashlasa, test yakunlanmaydi — o'quvchi javoblarini yo'qotmasdan qayta yuborishi mumkin.
   */
  grade?: (answers: number[]) => Promise<number>;
  /** Test boshlanganda (masalan, server vaqtni qayd etishi uchun) */
  onStart?: () => void;
  onFinish: (outcome: QuizOutcome) => void | Promise<void>;
  renderResult: (outcome: QuizOutcome, retry: () => void) => ReactNode;
}

type Phase = "intro" | "running" | "done";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
const UNANSWERED = -1;

function formatTime(sec: number) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function QuizRunner({
  title, description, questions, timeLimit, timed = true, passScore, extraRules = [],
  startLabel = "Testni boshlash", blockedReason, grade, onStart, onFinish, renderResult,
}: QuizRunnerProps) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [visited, setVisited] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [outcome, setOutcome] = useState<QuizOutcome | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef<number[]>([]);
  const timeRef = useRef(timeLimit);
  const startedAtRef = useRef(0);

  const total = questions.length;
  const answeredCount = answers.filter((a) => a !== UNANSWERED).length;
  const unansweredCount = total - answeredCount;

  const finish = useCallback(async () => {
    const final = answersRef.current;
    const elapsed = (Date.now() - startedAtRef.current) / 1000;
    let correct: number;
    if (grade) {
      setSubmitting(true);
      try {
        correct = await grade(final);
      } catch {
        setSubmitting(false);
        return;
      }
    } else {
      correct = questions.reduce((n, q, i) => n + (final[i] === q.correct ? 1 : 0), 0);
    }
    const result: QuizOutcome = {
      correct,
      total: questions.length,
      knowledge: correct / questions.length,
      errors: (questions.length - correct) / questions.length,
      // Tezlik: qancha vaqt tejaldi (taymersiz rejimda ham ko'rinmas holda o'lchanadi)
      speed: timed ? Math.max(0, timeRef.current / timeLimit) : Math.max(0, 1 - elapsed / timeLimit),
    };
    setSubmitting(true);
    try {
      await onFinish(result);
    } finally {
      setSubmitting(false);
      setOutcome(result);
      setPhase("done");
    }
  }, [questions, timeLimit, timed, grade, onFinish]);

  useEffect(() => {
    if (phase !== "running" || !timed) return;
    const timer = setInterval(() => {
      timeRef.current = Math.max(0, timeRef.current - 1);
      setTimeLeft(timeRef.current);
      if (timeRef.current <= 0) {
        clearInterval(timer);
        void finish();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timed, finish]);

  const goTo = (i: number) => {
    setIndex(i);
    setVisited((v) => v.map((x, k) => (k === i ? true : x)));
  };

  const start = () => {
    const empty = Array(questions.length).fill(UNANSWERED);
    answersRef.current = empty;
    setAnswers(empty);
    setVisited(questions.map((_, i) => i === 0));
    timeRef.current = timeLimit;
    startedAtRef.current = Date.now();
    setTimeLeft(timeLimit);
    setIndex(0);
    setOutcome(null);
    setPhase("running");
    onStart?.();
  };

  const choose = (option: number) => {
    const nextAnswers = answers.map((a, i) => (i === index ? option : a));
    answersRef.current = nextAnswers;
    setAnswers(nextAnswers);
  };

  /** Keyingi savol; oxiridan keyin — birinchi javobsiz (o'tkazib yuborilgan) savolga qaytadi */
  const forward = () => {
    if (index < total - 1) {
      goTo(index + 1);
      return;
    }
    const firstOpen = answersRef.current.findIndex((a, i) => a === UNANSWERED && i !== index);
    if (firstOpen !== -1) goTo(firstOpen);
  };

  // Taymerli (ketma-ket) rejim: "Keyingi" bosilganda javob qotadi
  const nextTimed = () => {
    if (index < total - 1) goTo(index + 1);
    else void finish();
  };

  // ── Intro ─────────────────────────────────────────────
  if (phase === "intro") {
    const rules = [
      `${total} ta savol, har birida bitta to'g'ri javob`,
      ...(timed
        ? [`Umumiy vaqt: ${formatTime(timeLimit)} — vaqt tugasa test avtomatik yakunlanadi`]
        : ["Vaqt cheklanmagan — shoshilmasdan ishlang"]),
      ...(passScore ? [`O'tish bali: ${Math.round(passScore * 100)}%`] : []),
      timed
        ? "Keyingi savolga o'tgach, oldingi javobni o'zgartirib bo'lmaydi"
        : "Bilmagan savolni o'tkazib yuboring — keyin unga qaytishingiz va javoblarni o'zgartirishingiz mumkin",
      ...extraRules,
    ];
    return (
      <Card>
        <Flex vertical gap={18}>
          <Flex gap={14} align="flex-start">
            <IconTile icon={<QuestionCircleOutlined />} size={44} />
            <Flex vertical gap={4}>
              <Title level={4} style={{ fontWeight: 600 }}>{title}</Title>
              {description && <Text type="secondary">{description}</Text>}
            </Flex>
          </Flex>

          <Flex gap={8} wrap>
            <Tag icon={<QuestionCircleOutlined />} bordered={false} color="blue">{total} ta savol</Tag>
            {timed && <Tag icon={<FieldTimeOutlined />} bordered={false} color="blue">{formatTime(timeLimit)}</Tag>}
            {passScore && (
              <Tag icon={<CheckCircleOutlined />} bordered={false} color="green">
                O'tish: {Math.round(passScore * 100)}%
              </Tag>
            )}
          </Flex>

          <div style={{ background: "#f8fafc", border: "1px solid #eef1f6", borderRadius: 12, padding: "6px 16px" }}>
            <List
              size="small"
              split={false}
              dataSource={rules}
              renderItem={(r) => (
                <List.Item style={{ paddingInline: 0 }}>
                  <Text><CheckCircleOutlined style={{ color: "#2563eb", marginRight: 8 }} />{r}</Text>
                </List.Item>
              )}
            />
          </div>

          {blockedReason && <Alert type="info" showIcon message={blockedReason} />}

          <Flex justify="flex-end">
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={start}
              disabled={!!blockedReason}
            >
              {startLabel}
            </Button>
          </Flex>
        </Flex>
      </Card>
    );
  }

  // ── Result ────────────────────────────────────────────
  if (phase === "done" && outcome) {
    return <>{renderResult(outcome, () => setPhase("intro"))}</>;
  }

  // ── Running ───────────────────────────────────────────
  const q = questions[index];
  const selected = answers[index] ?? UNANSWERED;
  const hasAnswer = selected !== UNANSWERED;
  const critical = timeLeft <= 10;
  const isLast = index === total - 1;

  const finishButton = (
    <Popconfirm
      title="Testni yakunlaysizmi?"
      description={unansweredCount > 0 ? `${unansweredCount} ta savol javobsiz qoldi — ular noto'g'ri hisoblanadi.` : "Barcha savollarga javob berdingiz."}
      okText="Ha, yakunlash"
      cancelText="Davom etish"
      onConfirm={() => void finish()}
    >
      <Button type={unansweredCount === 0 ? "primary" : "default"} size="large" loading={submitting} icon={<CheckCircleOutlined />}>
        Testni yakunlash
      </Button>
    </Popconfirm>
  );

  return (
    <Card>
      <Flex vertical gap={18}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Text type="secondary">
            Savol <Text strong>{index + 1}</Text> / {total}
            {!timed && <> · javob berildi: <Text strong>{answeredCount}</Text></>}
          </Text>
          {timed && (
            <Tag
              icon={<ClockCircleOutlined />}
              color={critical ? "red" : "blue"}
              bordered={false}
              style={{ fontSize: 14, padding: "4px 10px", marginInlineEnd: 0 }}
            >
              {formatTime(timeLeft)}
            </Tag>
          )}
        </Flex>

        {timed ? (
          <Progress percent={Math.round((index / total) * 100)} showInfo={false} strokeColor="#2563eb" size="small" />
        ) : (
          // Savollar xaritasi: javob berilgan / o'tkazib yuborilgan / joriy
          <Flex gap={6} wrap>
            {questions.map((_, i) => {
              const answered = answers[i] !== UNANSWERED;
              const skipped = !answered && visited[i] && i !== index;
              const current = i === index;
              return (
                <Tooltip key={i} title={answered ? "Javob berilgan" : skipped ? "O'tkazib yuborilgan" : current ? "Joriy savol" : "Hali ko'rilmagan"}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-label={`${i + 1}-savol`}
                    aria-current={current ? "step" : undefined}
                    style={{
                      width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 13,
                      border: current ? "2px solid #2563eb" : "1px solid",
                      borderColor: current ? "#2563eb" : answered ? "#2563eb" : skipped ? "#f59e0b" : "#dbe3ef",
                      background: answered ? "#2563eb" : skipped ? "#fffbeb" : "#fff",
                      color: answered ? "#fff" : skipped ? "#b45309" : "#475569",
                    }}
                  >
                    {i + 1}
                  </button>
                </Tooltip>
              );
            })}
          </Flex>
        )}

        <Paragraph style={{ fontSize: 17, fontWeight: 600, marginBottom: 0 }}>{q.q}</Paragraph>

        <Flex vertical gap={10} role="radiogroup" aria-label="Javob variantlari">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={selected === i}
              className={`quiz-option${selected === i ? " is-selected" : ""}`}
              onClick={() => choose(i)}
            >
              <span className="quiz-letter">{LETTERS[i]}</span>
              <span style={{ paddingTop: 2 }}>{opt}</span>
            </button>
          ))}
        </Flex>

        <Flex justify="space-between" align="center" gap={12} wrap>
          <Popconfirm
            title="Testni to'xtatasizmi?"
            description="Javoblaringiz saqlanmaydi."
            okText="Ha, to'xtatish"
            cancelText="Davom etish"
            onConfirm={() => setPhase("intro")}
          >
            <Button type="text">Bekor qilish</Button>
          </Popconfirm>

          {timed ? (
            <Button type="primary" size="large" disabled={!hasAnswer} loading={submitting} onClick={nextTimed}>
              {isLast ? "Testni yakunlash" : "Keyingi savol"}
            </Button>
          ) : (
            <Flex gap={10} wrap>
              <Button size="large" icon={<ArrowLeftOutlined />} disabled={index === 0} onClick={() => goTo(index - 1)}>
                Oldingi
              </Button>
              {hasAnswer ? (
                <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPosition="end" onClick={forward} disabled={isLast && unansweredCount === 0}>
                  Keyingi
                </Button>
              ) : (
                <Button size="large" icon={<ForwardOutlined />} iconPosition="end" onClick={forward} disabled={isLast && unansweredCount <= 1}>
                  O'tkazib yuborish
                </Button>
              )}
              {finishButton}
            </Flex>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}
