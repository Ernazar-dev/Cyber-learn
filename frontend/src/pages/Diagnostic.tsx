import { useCallback } from "react";
import { useLocation, useRoute } from "wouter";
import { Button, Card, Col, Collapse, Flex, Progress, Result, Row, Statistic, Tag, Typography } from "antd";
import { CheckCircleFilled } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { getDirection } from "@/data/curriculum";
import { PageHeader } from "@/components/common";
import { QuizRunner, type QuizOutcome } from "@/components/QuizRunner";
import { translateLevel } from "@/lib/utils";
import api from "@/lib/api";

const { Text } = Typography;

export default function Diagnostic() {
  const [, params] = useRoute("/learning/:directionId/diagnostic");
  const [, setLocation] = useLocation();
  const direction = getDirection(params?.directionId);
  const { submitAssessment, lastFuzzyResult, token, userRole } = useAppStore();

  const handleFinish = useCallback(async (o: QuizOutcome) => {
    const metrics = { knowledge: o.knowledge, errors: o.errors, speed: o.speed };
    submitAssessment(metrics);
    // Best-effort backend sync so module unlocks stay consistent server-side.
    await api.post("/api/assessment/submit", metrics, token).catch(() => {});
  }, [submitAssessment, token]);

  if (!direction) {
    return <Result status="404" title="Yo'nalish topilmadi" extra={<Button onClick={() => setLocation("/learning")}>Orqaga</Button>} />;
  }

  const base = `/learning/${direction.id}`;
  const { diagnostic } = direction;

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

      {userRole === "Teacher" ? (
        <Card title="Test savollari va to'g'ri javoblar">
          <Collapse
            ghost
            items={diagnostic.questions.map((q, i) => ({
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
          questions={diagnostic.questions}
          timeLimit={diagnostic.timeLimit}
          extraRules={["Natija asosida darajangiz va ochiladigan modullar yangilanadi"]}
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
