import { useLocation, useRoute } from "wouter";
import { Alert, Button, Card, Col, Flex, List, Progress, Result, Row, Tag, Typography } from "antd";
import {
  ArrowRightOutlined, CheckCircleFilled, CheckOutlined, EyeOutlined, LockOutlined, QuestionCircleOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { getDirection, moduleCode, modules } from "@/data/curriculum";
import { IconTile, LevelTag, PageHeader, SectionTitle, percent } from "@/components/common";

const { Text, Title } = Typography;

export default function DirectionDetail() {
  const [, params] = useRoute("/learning/:directionId");
  const [, setLocation] = useLocation();
  const direction = getDirection(params?.directionId);
  const { moduleProgress, userRole, hasCompletedInitialTest, currentLevel, readinessScore } = useAppStore();
  const isTeacher = userRole === "Teacher";

  if (!direction) {
    return (
      <Result
        status="404"
        title="Yo'nalish topilmadi"
        extra={<Button type="primary" onClick={() => setLocation("/learning")}>Yo'nalishlarga qaytish</Button>}
      />
    );
  }

  const items = direction.moduleIds.map((id) => ({
    content: modules[id],
    progress: moduleProgress.find((m) => m.id === id),
  }));
  const done = items.filter((i) => i.progress?.completed).length;
  const base = `/learning/${direction.id}`;

  return (
    <div className="page">
      <PageHeader
        crumbs={[{ title: "Ta'lim yo'nalishlari", href: "/learning" }, { title: direction.title }]}
        title={direction.title}
        subtitle={direction.description}
      />

      {!isTeacher && !hasCompletedInitialTest && (
        <Alert
          type="info"
          showIcon
          message="Darajangiz hali aniqlanmagan"
          description="Birinchi modul ochiq — darhol o'rganishni boshlashingiz mumkin. Agar bilimingiz yaxshi bo'lsa, diagnostika testini topshiring: tizim darajangizni aniqlab, mos modullarni ochadi."
        />
      )}

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Flex vertical gap={12}>
            <SectionTitle extra={!isTeacher && <Text type="secondary">{done} / {items.length} tugatildi</Text>}>
              Modullar
            </SectionTitle>

            {items.map(({ content, progress }, idx) => {
              const unlocked = isTeacher || !!progress?.unlocked;
              const completed = !!progress?.completed;
              return (
                <Card
                  key={content.id}
                  className={unlocked ? "hover-card" : "card-disabled"}
                  onClick={() => unlocked && setLocation(`${base}/module/${content.id}`)}
                  styles={{ body: { padding: 18 } }}
                >
                  <Flex gap={16} align="center" wrap>
                    <IconTile
                      size={44}
                      tone={completed ? "success" : unlocked ? "primary" : "muted"}
                      icon={completed ? <CheckOutlined /> : unlocked ? <span style={{ fontSize: 16, fontWeight: 600 }}>{idx + 1}</span> : <LockOutlined />}
                    />
                    <Flex vertical gap={2} style={{ flex: "1 1 240px", minWidth: 0 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{moduleCode(content.id)}</Text>
                      <Text strong style={{ fontSize: 15 }}>{content.title}</Text>
                      <Text type="secondary" style={{ fontSize: 13 }}>{content.summary}</Text>
                    </Flex>
                    <Flex align="center" gap={10}>
                      {!isTeacher && (
                        completed ? (
                          <Tag color="success" bordered={false} icon={<CheckCircleFilled />}>
                            Tugatildi{progress?.score !== undefined ? ` · ${percent(progress.score)}` : ""}
                          </Tag>
                        ) : unlocked ? (
                          <Tag color="blue" bordered={false}>Ochiq</Tag>
                        ) : (
                          <Tag bordered={false} icon={<LockOutlined />}>Yopiq</Tag>
                        )
                      )}
                      <Button
                        type={unlocked && !completed ? "primary" : "default"}
                        disabled={!unlocked}
                        icon={isTeacher ? <EyeOutlined /> : <ArrowRightOutlined />}
                        iconPosition={isTeacher ? "start" : "end"}
                      >
                        {isTeacher ? "Ko'rish" : completed ? "Qayta ko'rish" : "Ochish"}
                      </Button>
                    </Flex>
                  </Flex>
                </Card>
              );
            })}

            {!isTeacher && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                <LockOutlined /> Yopiq modullar oldingi modul tugatilganda yoki diagnostika natijasiga ko'ra ochiladi.
              </Text>
            )}
          </Flex>
        </Col>

        <Col xs={24} lg={8}>
          <Flex vertical gap={16}>
            <Card>
              <Flex vertical gap={14}>
                <Flex gap={12} align="center">
                  <IconTile icon={<QuestionCircleOutlined />} size={40} />
                  <Flex vertical>
                    <Text strong style={{ fontSize: 15 }}>{direction.diagnostic.title}</Text>
                    <Text type="secondary" style={{ fontSize: 13 }}>Ixtiyoriy · {direction.diagnostic.questions.length} ta savol</Text>
                  </Flex>
                </Flex>
                <Text type="secondary" style={{ fontSize: 13 }}>{direction.diagnostic.description}</Text>

                {!isTeacher && hasCompletedInitialTest && (
                  <div style={{ background: "#f8fafc", border: "1px solid #eef1f6", borderRadius: 10, padding: 12 }}>
                    <Flex justify="space-between" align="center" style={{ marginBottom: 6 }}>
                      <Text style={{ fontSize: 13 }}>Oxirgi natija</Text>
                      <LevelTag level={currentLevel} />
                    </Flex>
                    <Progress percent={Math.round(readinessScore * 100)} size="small" strokeColor="#2563eb" />
                  </div>
                )}

                <Button
                  block
                  type={!isTeacher && !hasCompletedInitialTest ? "primary" : "default"}
                  onClick={() => setLocation(`${base}/diagnostic`)}
                >
                  {isTeacher ? "Savollarni ko'rish" : hasCompletedInitialTest ? "Qayta topshirish" : "Diagnostikaga o'tish"}
                </Button>
              </Flex>
            </Card>

            <Card title="Nimalarni o'rganasiz">
              <List
                size="small"
                split={false}
                dataSource={direction.outcomes}
                renderItem={(o) => (
                  <List.Item style={{ paddingInline: 0 }}>
                    <Text><CheckOutlined style={{ color: "#16a34a", marginRight: 8 }} />{o}</Text>
                  </List.Item>
                )}
              />
            </Card>

            {!isTeacher && (
              <Card>
                <Flex vertical gap={6}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Yo'nalish bo'yicha progress</Text>
                  <Title level={3} style={{ fontWeight: 650 }}>{Math.round((done / items.length) * 100)}%</Title>
                  <Progress percent={Math.round((done / items.length) * 100)} showInfo={false} strokeColor="#2563eb" />
                </Flex>
              </Card>
            )}
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
