import { useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { Alert, Avatar, Button, Card, Col, Empty, Flex, Progress, Row, Space, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowRightOutlined, BarChartOutlined, BookOutlined, BulbOutlined, CheckCircleFilled, PlusOutlined, TeamOutlined, UserOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import type { Student } from "@/store/useAppStore";
import { getDirectionByModule } from "@/data/curriculum";
import { moduleColor, moduleLabel } from "@/data/moduleTheme";
import { ModuleRadarChart } from "@/components/ModuleRadarChart";
import { LevelTag, PageHeader, StatCard, percent } from "@/components/common";
import { FuzzyNum } from "@/components/FuzzyEvaluation";
import { CountUp } from "@/components/motion";

const { Text } = Typography;

function TeacherAnalytics() {
  const { students, assignments, fetchStudents, fetchAssignments } = useAppStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchStudents();
    fetchAssignments();
  }, [fetchStudents, fetchAssignments]);

  const avg = students.reduce((a, s) => a + s.fuzzyScore, 0) / Math.max(students.length, 1);

  const columns: TableColumnsType<Student> = [
    {
      title: "O'quvchi",
      dataIndex: "name",
      render: (_, s) => (
        <Space>
          <Avatar size="small" style={{ background: "#e8f0ff", color: "#2563eb" }} icon={<UserOutlined />} />
          <Text strong>{s.name}</Text>
        </Space>
      ),
    },
    { title: "Diagnostika", dataIndex: "diagnosticScore", render: (v: number) => <>{percent(v)}<FuzzyNum score={v} /></>, sorter: (a, b) => a.diagnosticScore - b.diagnosticScore },
    {
      title: "Fuzzy tayyorgarlik",
      dataIndex: "fuzzyScore",
      sorter: (a, b) => a.fuzzyScore - b.fuzzyScore,
      render: (v: number) => (
        <Flex align="center" style={{ minWidth: 170 }}>
          <Progress percent={Math.round(v * 100)} size="small" strokeColor="#2563eb" style={{ flex: 1, marginBottom: 0 }} />
          <FuzzyNum score={v} />
        </Flex>
      ),
    },
    { title: "Daraja", dataIndex: "level", render: (_, s) => <LevelTag level={s.level} /> },
    { title: "Xatolar", dataIndex: "errors", render: (v: number) => <>{percent(v)}<FuzzyNum score={v} /></> },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Analitika"
        subtitle="Guruh ko'rsatkichlari va moslashuvchan o'quv yo'nalishlarini boshqarish."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setLocation("/assignments")}>Topshiriq qo'shish</Button>}
      />

      <Row gutter={[16, 16]} className="stagger">
        <Col xs={24} sm={8}><StatCard label="Guruh o'rtacha ko'rsatkichi" value={<>{percent(avg)}<FuzzyNum score={avg} size={16} /></>} icon={<BarChartOutlined />} hint="ANFIS baholash bo'yicha" /></Col>
        <Col xs={24} sm={8}><StatCard label="O'quvchilar" value={`${students.length} nafar`} icon={<TeamOutlined />} hint="Tizimda ro'yxatdan o'tgan" /></Col>
        <Col xs={24} sm={8}><StatCard label="Topshiriqlar" value={`${assignments.length} ta`} icon={<BookOutlined />} hint="O'qituvchi tomonidan yuborilgan" /></Col>
      </Row>

      <Card title="O'quvchilar ko'rsatkichlari" styles={{ body: { padding: 0 } }}>
        <Table<Student>
          rowKey="id"
          columns={columns}
          dataSource={students}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 860 }}
          locale={{ emptyText: "O'quvchilar yo'q" }}
        />
      </Card>
    </div>
  );
}

function StudentAnalytics() {
  const { assignments, currentUser, readinessScore, fuzzyMetrics, moduleProgress, fetchAssignments } = useAppStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  const mine = assignments.filter((a) => a.studentId === currentUser?.id);
  const doneCount = mine.filter((a) => a.completed).length;
  // Bajarilmaganlar tepada, har guruh ichida eng yangisi birinchi
  const sortedMine = [...mine].sort((a, b) => Number(a.completed) - Number(b.completed) || b.dateAssigned.localeCompare(a.dateAssigned));

  const recommendation = useMemo(() => {
    const completed = moduleProgress.filter((m) => m.completed);
    const locked = moduleProgress.filter((m) => !m.unlocked).length;
    let text: string;
    if (completed.length === 0) {
      text = "Hali hech qaysi modul tugatilmagan. Birinchi modulni tugating — statistika shu yerda paydo bo'ladi.";
    } else {
      const weakest = completed.reduce((min, m) => ((m.score ?? 0) < (min.score ?? 0) ? m : min));
      text = (weakest.score ?? 0) < 0.85
        ? `Eng past natija — «${weakest.title}» (${percent(weakest.score ?? 0)}). Shu mavzuni takrorlash va tegishli CTF mashqlarini yechish tavsiya etiladi.`
        : "Tugatilgan barcha modullar bo'yicha yuqori natija! Yangi modullarni ochib, bilimingizni mustahkamlang.";
    }
    if (locked > 0) text += ` Yana ${locked} ta modul ochilishini kutmoqda.`;
    return text;
  }, [moduleProgress]);

  return (
    <div className="page">
      <PageHeader title="Analitika" subtitle="Shaxsiy o'quv natijalaringiz va o'qituvchi topshiriqlari." />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={15}>
          <Card title="Shaxsiy fuzzy tahlil" style={{ height: "100%" }}>
            <Flex vertical gap={18}>
              <Flex justify="space-between" align="center" gap={12} wrap>
                <Flex vertical>
                  <Text strong>Hozirgi tayyorgarlik darajasi</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>Fuzzy qoidalar bo'yicha yakuniy ko'rsatkich</Text>
                </Flex>
                <Text style={{ fontSize: 30, fontWeight: 650, color: "#2563eb" }}>
                  <CountUp value={Math.round(readinessScore * 100)} suffix="%" />
                  <FuzzyNum score={readinessScore} size={18} />
                </Text>
              </Flex>
              <Progress percent={Math.round(readinessScore * 100)} showInfo={false} strokeColor="#2563eb" />
              <Row gutter={[12, 12]}>
                {[
                  { label: "Bilim darajasi", value: fuzzyMetrics.knowledge, color: "#2563eb" },
                  { label: "Bajarish tezligi", value: fuzzyMetrics.speed, color: "#16a34a" },
                  { label: "Xatolar ulushi", value: fuzzyMetrics.errors, color: "#dc2626" },
                ].map((m) => (
                  <Col key={m.label} xs={8}>
                    <div style={{ background: "#f8fafc", border: "1px solid #eef1f6", borderRadius: 12, padding: 12, textAlign: "center" }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{m.label}</Text>
                      <div style={{ fontSize: 20, fontWeight: 650, color: m.color }}>{percent(m.value)}</div>
                      <FuzzyNum score={m.value} size={12} />
                    </div>
                  </Col>
                ))}
              </Row>
              <Alert type="info" showIcon message="Ko'rsatkichlaringiz o'qituvchi belgilagan qoidalar asosida baholanadi va o'quv yo'nalishingiz shunga ko'ra moslashtiriladi." />
            </Flex>
          </Card>
        </Col>

        <Col xs={24} lg={9}>
          <Card
            title="O'qituvchi topshiriqlari"
            extra={mine.length > 0 && <Text type="secondary" style={{ fontSize: 13 }}>{doneCount}/{mine.length} bajarildi</Text>}
            style={{ height: "100%" }}
          >
            {mine.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hozircha topshiriqlar yo'q" />
            ) : (
              <Flex vertical gap={14}>
                <Progress percent={Math.round((doneCount / mine.length) * 100)} size="small" strokeColor="#16a34a" />
                <Flex vertical gap={10} style={{ maxHeight: 360, overflowY: "auto", paddingRight: 2 }}>
                  {sortedMine.map((a) => {
                    const color = moduleColor(a.targetModuleId);
                    const dir = getDirectionByModule(a.targetModuleId);
                    const open = () => dir && setLocation(`/learning/${dir.id}/module/${a.targetModuleId}?assignment=${a.id}`);
                    return (
                      <Flex
                        key={a.id}
                        gap={12}
                        align="center"
                        style={{
                          border: "1px solid #eef1f6",
                          borderLeft: `3px solid ${a.completed ? "#16a34a" : color}`,
                          borderRadius: 10,
                          padding: "10px 12px",
                          background: a.completed ? "#fafcfb" : "#fff",
                        }}
                      >
                        <Flex vertical gap={2} style={{ flex: 1, minWidth: 0 }}>
                          <Text strong ellipsis={{ tooltip: a.title }} type={a.completed ? "secondary" : undefined}>{a.title}</Text>
                          <Text type="secondary" ellipsis style={{ fontSize: 12 }}>
                            <span style={{ color }}>{moduleLabel(a.targetModuleId)}</span>
                            {a.questions.length > 0 && ` · ${a.questions.length} savol`} · {a.dateAssigned}
                          </Text>
                        </Flex>
                        {a.completed ? (
                          <Tooltip title="Topshiriqni ko'rish">
                            <Button size="small" type="text" icon={<CheckCircleFilled style={{ color: "#16a34a" }} />} onClick={open} disabled={!dir} />
                          </Tooltip>
                        ) : (
                          <Button size="small" type="primary" ghost icon={<ArrowRightOutlined />} iconPosition="end" onClick={open} disabled={!dir}>
                            Ochish
                          </Button>
                        )}
                      </Flex>
                    );
                  })}
                </Flex>
              </Flex>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="Modullar bo'yicha ko'rsatkich" extra={<Text type="secondary">Har bir modul testidan olingan ball</Text>}>
        <Flex vertical gap={16}>
          <ModuleRadarChart moduleProgress={moduleProgress} />
          <Alert type="warning" showIcon icon={<BulbOutlined />} message={recommendation} />
        </Flex>
      </Card>
    </div>
  );
}

export default function Analytics() {
  const { userRole } = useAppStore();
  return userRole === "Teacher" ? <TeacherAnalytics /> : <StudentAnalytics />;
}
