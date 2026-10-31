import { useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { App, Button, Card, Col, Collapse, Flex, Progress, Result, Row, Skeleton, Statistic, Tag, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { useAppStore, type ServerAssessment } from "@/store/useAppStore";
import { getDirection, type QuizQuestion } from "@/data/curriculum";
import { PageHeader } from "@/components/common";
import { QuizRunner } from "@/components/QuizRunner";
import { translateLevel } from "@/lib/utils";
import api from "@/lib/api";

const { Text } = Typography;

interface DiagnosticData {
  timeLimit: number;
  questions: QuizQuestion[];
}

export default function Diagnostic() {
  const [, params] = useRoute("/learning/:directionId/diagnostic");
  const [, setLocation] = useLocation();
  const direction = getDirection(params?.directionId);
  const { submitAssessment, lastFuzzyResult, token, userRole } = useAppStore();
  const { message } = App.useApp();

  // Savollar serverdan; o'quvchiga to'g'ri javoblarsiz (correct = -1) keladi
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["diagnostic", token],
    queryFn: () => api.get<DiagnosticData>("/api/diagnostic", token),
    enabled: !!token,
  });

  // Server vaqtni o'zi qayd etadi — tezlik ko'rsatkichi shundan hisoblanadi
  const handleStart = useCallback(() => {
    void api.post("/api/diagnostic/start", {}, token).catch(() => {});
  }, [token]);

  // Javoblar serverda baholanadi; daraja va ochiladigan modullarni server hisoblaydi
  const grade = useCallback(async (answers: number[]) => {
    try {
      const res = await api.post<{ correct: number; result: ServerAssessment }>("/api/assessment/submit", { answers }, token);
      const r = res.result;
      submitAssessment({ knowledge: r.knowledge, errors: r.errors, speed: r.speed }, r);
      return res.correct;
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Javoblarni yuborib bo'lmadi, qayta urinib ko'ring");
      throw err;
    }
  }, [message, submitAssessment, token]);

  const handleFinish = useCallback(() => {}, []);

  if (!direction) {
    return <Result status="404" title="Yo'nalish topilmadi" extra={<Button onClick={() => setLocation("/learning")}>Orqaga</Button>} />;
  }

  const base = `/learning/${direction.id}`;
  const { diagnostic } = direction;
  const questions = data?.questions ?? [];

  return (
    <div className="page page-narrow">
      <PageHeader
        crumbs={[
          { title: "Ta'lim yo'nalishlari", href: "/learning" },
          { title: direction.title, href: base },
          { title: diagnostic.title },
        ]}
        title={diagnostic.title}
        subtitle="Bilim darajangizni aniqlash uchun ixtiyoriy test."
      />

      {isLoading ? (
        <Card><Skeleton active /></Card>
      ) : isError || !data ? (
        <Result status="warning" title="Savollarni yuklab bo'lmadi" extra={<Button onClick={() => void refetch()}>Qayta urinish</Button>} />
      ) : userRole === "Teacher" ? (
        <Card title="Test savollari va to'g'ri javoblar">
          <Collapse
            ghost
            items={questions.map((q, i) => ({
              key: i,
              label: `${i + 1}. ${q.q}`,
              children: (
                <Flex vertical gap={6}>
                  {q.options.map((opt, oi) => (
                    <Text key={oi} type={oi === q.correct ? "success" : "secondary"} strong={oi === q.correct}>
                      {String.fromCharCode(65 + oi)}. {opt} {oi === q.correct && <CheckCircleFilled />}
                    </Text>
                  ))}
                </Flex>
              ),
            }))}
          />
        </Card>
      ) : (
        <QuizRunner
          title={diagnostic.title}
          description={diagnostic.description}
          questions={questions}
          timeLimit={data.timeLimit}
          extraRules={["Natija asosida darajangiz va ochiladigan modullar yangilanadi"]}
          onStart={handleStart}
          grade={grade}
          onFinish={handleFinish}
          renderResult={(o, retry) => (
            <Card>
              <Result
                status="success"
                title="Diagnostika yakunlandi"
                subTitle={`${o.total} ta savoldan ${o.correct} tasiga to'g'ri javob berdingiz.`}
                style={{ paddingBottom: 8 }}
              />
              {lastFuzzyResult && (
                <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                  <Col xs={24} sm={12}>
                    <Card size="small">
                      <Statistic title="Aniqlangan daraja" value={translateLevel(lastFuzzyResult.level)} />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Card size="small">
                      <Statistic title="Tayyorgarlik ko'rsatkichi" value={(lastFuzzyResult.score * 100).toFixed(1)} suffix="%" />
                      <Progress percent={Math.round(lastFuzzyResult.score * 100)} showInfo={false} size="small" strokeColor="#2563eb" />
                    </Card>
                  </Col>
                </Row>
              )}
              <Flex justify="center" gap={10} wrap>
                <Button onClick={retry}>Qayta topshirish</Button>
                <Button type="primary" onClick={() => setLocation(base)}>Modullarga o'tish</Button>
              </Flex>
              <Flex justify="center" style={{ marginTop: 14 }}>
                <Tag bordered={false} color="blue">Darajangizga mos modullar ochildi</Tag>
              </Flex>
            </Card>
          )}
        />
      )}
    </div>
  );
}
