import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button, Col, Flex, Row, Typography } from "antd";
import {
  ArrowRightOutlined, CheckCircleFilled, DesktopOutlined, FormOutlined, GlobalOutlined, KeyOutlined, LockOutlined,
  PlusOutlined, SafetyOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { directions, modules } from "@/data/curriculum";
import { PageHeader } from "@/components/common";

const { Title, Text, Paragraph } = Typography;

/** Har bir modul uchun o'z ikonkasi va aksent rangi (tartib bo'yicha) */
const moduleLook: { icon: ReactNode; color: string; soft: string }[] = [
  { icon: <SafetyOutlined />, color: "#2563eb", soft: "#eff6ff" },
  { icon: <GlobalOutlined />, color: "#0891b2", soft: "#ecfeff" },
  { icon: <KeyOutlined />, color: "#7c3aed", soft: "#f5f3ff" },
  { icon: <DesktopOutlined />, color: "#16a34a", soft: "#f0fdf4" },
];

/** Yuqoridagi pill-statistika */
function StatPill({ label, value, tone = "neutral" }: { label: string; value: ReactNode; tone?: "blue" | "green" | "amber" | "neutral" }) {
  return (
    <span className={`dir-pill dir-pill--${tone}`}>
      {label} <b>{value}</b>
    </span>
  );
}

/** "Keyingi qadam" ustunidagi kichik karta */
function NextCard({ kicker, title, meta, tone, onClick }: { kicker: string; title: string; meta?: ReactNode; tone: "blue" | "amber" | "violet"; onClick?: () => void }) {
  return (
    <button type="button" className={`dir-next dir-next--${tone}`} onClick={onClick}>
      <Text type="secondary" style={{ fontSize: 12 }}>{kicker}</Text>
      <Text strong style={{ fontSize: 15.5, lineHeight: 1.3 }}>{title}</Text>
      {meta && <Text type="secondary" style={{ fontSize: 12.5 }}>{meta}</Text>}
    </button>
  );
}

export default function Directions() {
  const [, setLocation] = useLocation();
  const { moduleProgress, userRole, assignments, currentUser, fetchAssignments, hasCompletedInitialTest } = useAppStore();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const isStudent = userRole === "Student";
  const myAssignments = assignments.filter((a) => !isStudent || a.studentId === currentUser?.id);
  // Bir xil topshiriq (o'qituvchida har o'quvchi nusxasi) bitta sanaladi
  const taskKey = (a: { title: string; dateAssigned: string }) => `${a.title}|${a.dateAssigned}`;
  const taskCount = (moduleId: number) =>
    new Set(myAssignments.filter((a) => a.targetModuleId === moduleId).map(taskKey)).size;
  const pendingTasks = myAssignments.filter((a) => !a.completed).length;
  const firstPending = myAssignments.find((a) => !a.completed);

  return (
    <div className="page">
      <PageHeader
        title="Ta'lim yo'nalishlari"
        subtitle="Modulni tanlang — har birida nazariya, o'qituvchi topshiriqlari va amaliy CTF mashqlari bor."
      />

      {directions.map((d) => {
        const done = moduleProgress.filter((m) => d.moduleIds.includes(m.id) && m.completed).length;
        const total = d.moduleIds.length;
        const pct = Math.round((done / total) * 100);
        const nextId = d.moduleIds.find((id) => {
          const p = moduleProgress.find((m) => m.id === id);
          return p?.unlocked && !p.completed;
        });
        const base = `/learning/${d.id}`;

        return (
          <section key={d.id} className="dir-panel">
            {/* Sarlavha qatori */}
            <Flex justify="space-between" align="center" gap={12} wrap>
              <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                <span className="dir-dot" aria-hidden />
                <Text strong style={{ fontSize: 15 }}>{d.title}</Text>
                <Text type="secondary" style={{ fontSize: 13 }}>· {total} ta modul</Text>
              </Flex>
              <Flex gap={8} wrap>
                <Button shape="round" icon={<FormOutlined />} onClick={() => setLocation(`${base}/diagnostic`)}>
                  Diagnostika
                </Button>
                <Button shape="round" type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => setLocation(base)}>
                  Yo'nalishni ochish
                </Button>
              </Flex>
            </Flex>

            {/* Katta ko'rsatkich + tavsif */}
            <Flex align="flex-end" gap={24} wrap style={{ margin: "20px 0 16px" }}>
              <div className="dir-hero-num">
                {isStudent ? <>{pct}<small>%</small></> : <>{total}<small> modul</small></>}
              </div>
              <Paragraph type="secondary" style={{ margin: 0, flex: "1 1 320px", maxWidth: 620 }} ellipsis={{ rows: 2 }}>
                {d.description}
              </Paragraph>
            </Flex>

            <Flex gap={8} wrap style={{ marginBottom: 20 }}>
              {isStudent ? (
                <>
                  <StatPill tone="green" label="Tugatilgan modullar" value={`${done} / ${total}`} />
                  <StatPill tone="amber" label="Bajarilmagan topshiriqlar" value={pendingTasks} />
                  <StatPill label="Diagnostika" value={hasCompletedInitialTest ? "o'tilgan" : "kutilmoqda"} />
                </>
              ) : (
                <>
                  <StatPill tone="blue" label="Modullar" value={total} />
                  <StatPill tone="amber" label="Topshiriqlar" value={new Set(myAssignments.map(taskKey)).size} />
                  <StatPill label="Bajarilmagan" value={pendingTasks} />
                </>
              )}
            </Flex>

            <Row gutter={[16, 16]}>
              {/* Modullar */}
              <Col xs={24} lg={16}>
                <div className="dir-box">
                  <Title level={5} style={{ margin: "0 0 14px", fontWeight: 600 }}>Modullar</Title>
                  <Row gutter={[12, 12]}>
                    {d.moduleIds.map((id, idx) => {
                      const mod = modules[id];
                      const look = moduleLook[idx % moduleLook.length];
                      const p = moduleProgress.find((m) => m.id === id);
                      const unlocked = !isStudent || !!p?.unlocked;
                      const completed = isStudent && !!p?.completed;
                      const tasks = taskCount(mod.id);
                      return (
                        <Col key={id} xs={24} sm={12}>
                          <button
                            type="button"
                            className="dir-tile"
                            disabled={!unlocked}
                            onClick={() => setLocation(`${base}/module/${id}`)}
                          >
                            <span className="dir-tile__icon" style={{ background: look.soft, color: look.color }}>{look.icon}</span>
                            <Flex vertical gap={2} style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                              <Text style={{ fontSize: 11.5, fontWeight: 600, color: look.color, letterSpacing: "0.04em" }}>{idx + 1}-MODUL</Text>
                              <Text strong ellipsis style={{ fontSize: 14 }}>{mod.title}</Text>
                              <Text type="secondary" style={{ fontSize: 12.5 }}>
                                {tasks > 0 ? `${tasks} ta topshiriq` : "Topshiriq hali yo'q"}
                              </Text>
                            </Flex>
                            {completed ? (
                              <CheckCircleFilled style={{ color: "#16a34a", fontSize: 18 }} aria-label="Tugatildi" />
                            ) : !unlocked ? (
                              <LockOutlined style={{ color: "#94a3b8" }} aria-label="Yopiq" />
                            ) : (
                              <ArrowRightOutlined style={{ color: "#94a3b8" }} />
                            )}
                          </button>
                        </Col>
                      );
                    })}
                  </Row>
                </div>
              </Col>

              {/* Keyingi qadam */}
              <Col xs={24} lg={8}>
                <div className="dir-box" style={{ height: "100%" }}>
                  <Title level={5} style={{ margin: "0 0 14px", fontWeight: 600 }}>Keyingi qadam</Title>
                  <Flex vertical gap={10}>
                    {isStudent ? (
                      <>
                        {!hasCompletedInitialTest && (
                          <NextCard tone="blue" kicker="Boshlash" title="Diagnostika testi" meta="Darajangizni aniqlang — mos modullar ochiladi" onClick={() => setLocation(`${base}/diagnostic`)} />
                        )}
                        {nextId ? (
                          <NextCard tone="violet" kicker="Davom eting" title={modules[nextId].title} meta={`${d.moduleIds.indexOf(nextId) + 1}-modul`} onClick={() => setLocation(`${base}/module/${nextId}`)} />
                        ) : done === total ? (
                          <NextCard tone="violet" kicker="Tabriklaymiz" title="Barcha modullar tugatildi" meta="Sertifikatlaringizni yuklab oling" onClick={() => setLocation(base)} />
                        ) : null}
                        {pendingTasks > 0 && (
                          <NextCard tone="amber" kicker="Kutilmoqda" title={`${pendingTasks} ta topshiriq`} meta="O'qituvchi bergan topshiriqlar" onClick={() => setLocation(firstPending ? `${base}/module/${firstPending.targetModuleId}` : base)} />
                        )}
                      </>
                    ) : (
                      <>
                        <NextCard tone="violet" kicker="O'qituvchi" title="Topshiriq yaratish" meta={<><PlusOutlined /> Savollar bilan vazifa yuboring</>} onClick={() => setLocation("/assignments")} />
                        <NextCard tone="amber" kicker="Nazorat" title="O'quvchilar natijalari" meta={<><TeamOutlined /> % va Fuzzy baholar</>} onClick={() => setLocation("/students")} />
                      </>
                    )}
                  </Flex>
                </div>
              </Col>
            </Row>
          </section>
        );
      })}
    </div>
  );
}
