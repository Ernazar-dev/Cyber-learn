import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button, Card, Col, Flex, Progress, Row, Tag, Typography } from "antd";
import {
  ArrowRightOutlined, CheckCircleFilled, DesktopOutlined, FormOutlined, GlobalOutlined, KeyOutlined, LockOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { directions, modules } from "@/data/curriculum";
import { IconTile, PageHeader } from "@/components/common";

const { Title, Text, Paragraph } = Typography;

/** Har bir modul uchun o'z ikonkasi va aksent rangi (tartib bo'yicha) */
const moduleLook: { icon: ReactNode; color: string; soft: string }[] = [
  { icon: <SafetyOutlined />, color: "#2563eb", soft: "#eff6ff" },
  { icon: <GlobalOutlined />, color: "#0891b2", soft: "#ecfeff" },
  { icon: <KeyOutlined />, color: "#7c3aed", soft: "#f5f3ff" },
  { icon: <DesktopOutlined />, color: "#16a34a", soft: "#f0fdf4" },
];

export default function Directions() {
  const [, setLocation] = useLocation();
  const { moduleProgress, userRole, assignments, currentUser, fetchAssignments } = useAppStore();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Modul bo'yicha alohida topshiriqlar soni (o'qituvchida har o'quvchi nusxasi bitta sanaladi)
  const taskCount = (moduleId: number) => new Set(
    assignments
      .filter((a) => a.targetModuleId === moduleId && (userRole === "Teacher" || a.studentId === currentUser?.id))
      .map((a) => `${a.title}|${a.dateAssigned}`),
  ).size;
  const isStudent = userRole === "Student";

  return (
    <div className="page">
      <PageHeader
        title="Ta'lim yo'nalishlari"
        subtitle="Modulni tanlang — har birida nazariya, o'qituvchi topshiriqlari va amaliy CTF mashqlari bor."
      />

      {directions.map((d) => {
        const done = moduleProgress.filter((m) => d.moduleIds.includes(m.id) && m.completed).length;
        const pct = Math.round((done / d.moduleIds.length) * 100);
        return (
          <Flex key={d.id} vertical gap={20}>
            {/* Yo'nalish haqida qisqacha */}
            <Card className="dashboard-welcome" styles={{ body: { padding: "20px 24px" } }}>
              <Flex justify="space-between" align="center" gap={20} wrap>
                <Flex gap={16} align="center" style={{ flex: "1 1 420px", minWidth: 0 }}>
                  <IconTile icon={<SafetyOutlined />} size={52} />
                  <Flex vertical gap={2} style={{ minWidth: 0 }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>Yo'nalish · {d.moduleIds.length} ta modul</Text>
                    <Title level={3} style={{ fontWeight: 700 }}>{d.title}</Title>
                    <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0, maxWidth: 720 }}>{d.description}</Paragraph>
                  </Flex>
                </Flex>
                <Flex vertical gap={12} style={{ flex: "0 1 360px", minWidth: 260 }}>
                  {isStudent && (
                    <div>
                      <Flex justify="space-between">
                        <Text type="secondary" style={{ fontSize: 13 }}>{done} / {d.moduleIds.length} modul tugatildi</Text>
                        <Text strong style={{ fontSize: 13 }}>{pct}%</Text>
                      </Flex>
                      <Progress percent={pct} showInfo={false} />
                    </div>
                  )}
                  <Flex gap={10} wrap>
                    <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => setLocation(`/learning/${d.id}`)}>
                      Yo'nalishni ochish
                    </Button>
                    <Button icon={<FormOutlined />} onClick={() => setLocation(`/learning/${d.id}/diagnostic`)}>Diagnostika</Button>
                  </Flex>
                </Flex>
              </Flex>
            </Card>

            {/* Modullar — 4 ta karta */}
            <Row gutter={[20, 20]}>
              {d.moduleIds.map((id, idx) => {
                const mod = modules[id];
                const look = moduleLook[idx % moduleLook.length];
                const p = moduleProgress.find((m) => m.id === id);
                const unlocked = !isStudent || !!p?.unlocked;
                const completed = isStudent && !!p?.completed;
                const open = () => setLocation(`/learning/${d.id}/module/${id}`);

                return (
                  <Col key={id} xs={24} sm={12} xl={6}>
                    <Card
                      hoverable={unlocked}
                      onClick={unlocked ? open : undefined}
                      style={{ height: "100%", overflow: "hidden", opacity: unlocked ? 1 : 0.7, cursor: unlocked ? "pointer" : "not-allowed" }}
                      styles={{ body: { padding: 22, height: "100%" } }}
                    >
                      <span aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: look.color }} />
                      <Flex vertical gap={14} style={{ height: "100%" }}>
                        <Flex justify="space-between" align="flex-start">
                          <span style={{ width: 48, height: 48, borderRadius: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, background: look.soft, color: look.color }}>
                            {look.icon}
                          </span>
                          {completed ? (
                            <Tag color="success" icon={<CheckCircleFilled />} bordered={false} style={{ marginInlineEnd: 0 }}>Tugatildi</Tag>
                          ) : !unlocked ? (
                            <Tag icon={<LockOutlined />} bordered={false} style={{ marginInlineEnd: 0 }}>Yopiq</Tag>
                          ) : (
                            <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0 }}>Ochiq</Tag>
                          )}
                        </Flex>

                        <Flex vertical gap={6}>
                          <Text style={{ fontSize: 12, fontWeight: 600, color: look.color, letterSpacing: "0.04em" }}>{idx + 1}-MODUL</Text>
                          <Text strong style={{ fontSize: 17, lineHeight: 1.3 }}>{mod.title}</Text>
                          <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0, fontSize: 13.5 }}>{mod.summary}</Paragraph>
                        </Flex>

                        <Flex gap={6} wrap>
                          {mod.concepts.slice(0, 3).map((c) => (
                            <Tag key={c} bordered={false} style={{ marginInlineEnd: 0, background: "#f3f7fd", color: "#475569" }}>{c}</Tag>
                          ))}
                        </Flex>

                        <Flex justify="space-between" align="center" style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid #eef2f8" }}>
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {taskCount(mod.id) > 0 ? `${taskCount(mod.id)} ta topshiriq` : "Topshiriq hali yo'q"}
                          </Text>
                          {unlocked && (
                            <Text style={{ color: look.color, fontWeight: 600, fontSize: 13 }}>
                              {completed ? "Takrorlash" : "Boshlash"} <ArrowRightOutlined />
                            </Text>
                          )}
                        </Flex>
                      </Flex>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </Flex>
        );
      })}
    </div>
  );
}
