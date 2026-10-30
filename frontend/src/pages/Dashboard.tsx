import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button, Card, Col, Empty, Flex, List, Progress, Row, Steps, Tag, Typography } from "antd";
import {
  ArrowRightOutlined, BarChartOutlined, BookOutlined, CheckCircleOutlined, ExperimentOutlined,
  FormOutlined, RiseOutlined, StarOutlined, TeamOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { directions, modules } from "@/data/curriculum";
import { IconTile, LevelTag, PageHeader, SectionTitle, StatCard, percent } from "@/components/common";
import { CountUp } from "@/components/motion";
import { translateLevel } from "@/lib/utils";

const { Text } = Typography;

function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { currentUser, hasCompletedInitialTest, currentLevel, readinessScore, moduleProgress } = useAppStore();
  const direction = directions[0];
  const base = `/learning/${direction.id}`;

  const completed = moduleProgress.filter((m) => m.completed).length;
  const total = moduleProgress.length;
  const completion = Math.round((completed / Math.max(total, 1)) * 100);
  const nextModule = moduleProgress.find((m) => m.unlocked && !m.completed);

  const recommendation = !hasCompletedInitialTest
    ? {
        title: "Darajangizni aniqlang",
        text: "Diagnostika testi bilimingizni baholaydi va sizga mos modullarni ochadi. Xohlasangiz, darhol 1-moduldan ham boshlashingiz mumkin.",
        action: "Diagnostika haqida",
        path: `${base}/diagnostic`,
      }
    : nextModule
      ? {
          title: `Davom eting: ${modules[nextModule.id]?.title ?? nextModule.title}`,
          text: `Fuzzy baholash bo'yicha darajangiz — ${translateLevel(currentLevel).toLowerCase()}. Keyingi qadam shu modul.`,
          action: "Modulni ochish",
          path: `${base}/module/${nextModule.id}`,
        }
      : {
          title: "Barcha ochiq modullar tugatildi",
          text: "Ajoyib natija! Sertifikatlaringizni yuklab oling yoki CTF mashqlarida bilimingizni sinab ko'ring.",
          action: "Sertifikatlar",
          path: "/certificate",
        };

  const currentStep = moduleProgress.findIndex((m) => !m.completed);

  return (
    <div className="page">
      <PageHeader title={`Xush kelibsiz, ${currentUser?.name ?? ""}`} subtitle="O'quv jarayoningiz bir qarashda." />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={16}>
          <Card className="dashboard-welcome" style={{ height: "100%" }} styles={{ body: { padding: 24, height: "100%" } }}>
            <Flex vertical justify="space-between" gap={20} style={{ height: "100%" }}>
              <Flex gap={14} align="flex-start">
                <IconTile icon={<StarOutlined />} size={44} />
                <Flex vertical gap={4}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Keyingi qadam</Text>
                  <Text strong style={{ fontSize: 18 }}>{recommendation.title}</Text>
                  <Text type="secondary" style={{ maxWidth: 560 }}>{recommendation.text}</Text>
                </Flex>
              </Flex>
              <Flex gap={10} wrap>
                <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => setLocation(recommendation.path)}>
                  {recommendation.action}
                </Button>
                <Button onClick={() => setLocation(base)}>Yo'nalishni ko'rish</Button>
              </Flex>
            </Flex>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card style={{ height: "100%" }} styles={{ body: { padding: 24 } }}>
            <Flex vertical align="center" gap={8}>
              <Text type="secondary" style={{ fontSize: 13, alignSelf: "flex-start" }}>Tayyorgarlik darajasi</Text>
              <Progress
                type="dashboard"
                percent={Math.round(readinessScore * 100)}
                size={132}
                strokeWidth={8}
                format={(p) => <span style={{ fontSize: 26, fontWeight: 700, color: "#0f172a" }}>{p}%</span>}
              />
              {hasCompletedInitialTest ? <LevelTag level={currentLevel} /> : <Text type="secondary" style={{ fontSize: 13 }}>Daraja hali aniqlanmagan</Text>}
            </Flex>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard
            label="Umumiy progress"
            count={{ value: completion, suffix: "%" }}
            icon={<RiseOutlined />}
            footer={<Progress percent={completion} showInfo={false} size="small" />}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Fuzzy bahosi"
            {...(hasCompletedInitialTest ? { count: { value: readinessScore, decimals: 2 } } : { value: "—" })}
            icon={<ExperimentOutlined />}
            hint={hasCompletedInitialTest ? "ANFIS baholash natijasi" : "Diagnostika topshirilmagan"}
          />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard
            label="Tugatilgan modullar"
            value={<><CountUp value={completed} /> <span style={{ fontSize: 18, color: "#5b6880", fontWeight: 600 }}>/ {total}</span></>}
            icon={<CheckCircleOutlined />}
            tone="success"
            hint="Har bir modul uchun sertifikat beriladi"
          />
        </Col>
      </Row>

      <Card
        title={direction.title}
        extra={<Button type="link" onClick={() => setLocation(base)}>Yo'nalishni ochish</Button>}
      >
        <Steps
          direction="vertical"
          size="small"
          current={currentStep === -1 ? total : currentStep}
          items={moduleProgress.map((m) => ({
            title: (
              <Flex gap={8} align="center" wrap>
                <span>{modules[m.id]?.title ?? m.title}</span>
                {m.completed && m.score !== undefined && <Tag color="success" bordered={false}>{percent(m.score)}</Tag>}
                {!m.unlocked && <Tag bordered={false}>Yopiq</Tag>}
              </Flex>
            ),
            description: modules[m.id]?.summary,
            status: m.completed ? "finish" : m.unlocked ? "process" : "wait",
            onClick: m.unlocked ? () => setLocation(`${base}/module/${m.id}`) : undefined,
            style: m.unlocked ? { cursor: "pointer" } : undefined,
          }))}
        />
      </Card>
    </div>
  );
}

function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { students, assignments, fetchStudents, fetchAssignments } = useAppStore();

  useEffect(() => {
    fetchStudents();
    fetchAssignments();
  }, [fetchStudents, fetchAssignments]);

  const avg = students.length ? students.reduce((a, s) => a + s.fuzzyScore, 0) / students.length : 0;
  const pending = assignments.filter((a) => !a.completed).length;

  const actions = [
    { title: "Topshiriq yaratish", text: "O'quvchilarga savollar bilan vazifa yuboring", icon: <FormOutlined />, path: "/assignments" },
    { title: "Guruh analitikasi", text: "Diagnostika va fuzzy natijalarni ko'ring", icon: <BarChartOutlined />, path: "/analytics" },
    { title: "AI dvigateli", text: "Fuzzy qoidalar og'irliklarini sozlang", icon: <ExperimentOutlined />, path: "/ai-engine" },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Guruh holati"
        subtitle="O'quvchilar natijalarini kuzating, topshiriq yuboring va baholash qoidalarini sozlang."
        extra={
          <>
            <Button icon={<TeamOutlined />} onClick={() => setLocation("/students")}>O'quvchilar</Button>
            <Button type="primary" icon={<FormOutlined />} onClick={() => setLocation("/assignments")}>Topshiriq yaratish</Button>
          </>
        }
      />

      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}><StatCard label="O'quvchilar" count={{ value: students.length }} icon={<TeamOutlined />} /></Col>
        <Col xs={12} lg={6}><StatCard label="O'rtacha fuzzy bahosi" count={{ value: Math.round(avg * 100), suffix: "%" }} icon={<StarOutlined />} /></Col>
        <Col xs={12} lg={6}><StatCard label="Jami topshiriqlar" count={{ value: assignments.length }} icon={<BookOutlined />} /></Col>
        <Col xs={12} lg={6}><StatCard label="Kutilmoqda" count={{ value: pending }} icon={<FormOutlined />} tone="warning" /></Col>
      </Row>

      <Row gutter={[16, 16]} className="stagger">
        {actions.map((a) => (
          <Col key={a.path} xs={24} md={8}>
            <Card className="hover-card" onClick={() => setLocation(a.path)}>
              <Flex gap={14} align="center">
                <IconTile icon={a.icon} size={40} />
                <Flex vertical style={{ flex: 1, minWidth: 0 }}>
                  <Text strong>{a.title}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{a.text}</Text>
                </Flex>
                <ArrowRightOutlined style={{ color: "#94a3b8" }} />
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Card title={<SectionTitle>So'nggi topshiriqlar</SectionTitle>} extra={<Button type="link" onClick={() => setLocation("/assignments")}>Barchasi</Button>}>
        {assignments.length === 0 ? (
          <Empty description="Hozircha topshiriqlar yo'q" />
        ) : (
          <List
            dataSource={assignments.slice(0, 6)}
            renderItem={(a) => (
              <List.Item extra={a.completed ? <Tag color="success" bordered={false}>Bajarildi</Tag> : <Tag color="warning" bordered={false}>Kutilmoqda</Tag>}>
                <List.Item.Meta
                  title={a.title}
                  description={`${a.studentName} · ${modules[a.targetModuleId]?.title ?? `${a.targetModuleId}-modul`} · ${a.dateAssigned}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { userRole } = useAppStore();
  return userRole === "Teacher" ? <TeacherDashboard /> : <StudentDashboard />;
}
