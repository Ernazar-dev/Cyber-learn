import { useEffect, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { App, Badge, Button, Card, Col, Empty, Flex, Progress, Result, Row, Skeleton, Tabs, Tag, Typography } from "antd";
import {
  ArrowRightOutlined, BookOutlined, CheckCircleFilled, DownloadOutlined, FlagOutlined, SolutionOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { MODULE_PASSING_SCORE, getDirection, moduleCode, modules } from "@/data/curriculum";
import { IconTile, PageHeader, percent } from "@/components/common";
import { CTFChallengeCard, type CTFChallengeData } from "@/components/CTFChallengeCard";
import { AssignmentPanel } from "@/components/AssignmentPanel";
import { downloadModuleCertificate } from "@/lib/utils";
import api from "@/lib/api";

const { Text, Title } = Typography;

function ModuleCTF({ moduleId }: { moduleId: number }) {
  const { token } = useAppStore();
  const { data, isLoading } = useQuery({
    queryKey: ["ctf-module", moduleId],
    queryFn: () => api.get<CTFChallengeData[]>(`/api/modules/${moduleId}/ctf`, token),
  });

  if (isLoading) return <Skeleton active />;
  if (!data || data.length === 0) {
    return <Empty description="Bu modul uchun hozircha CTF mashqlari yo'q" />;
  }
  return (
    <Row gutter={[16, 16]} className="stagger">
      {data.map((ch) => (
        <Col key={ch.id} xs={24} md={12}>
          <CTFChallengeCard challenge={ch} token={token} />
        </Col>
      ))}
    </Row>
  );
}

export default function ModuleDetail() {
  const [, params] = useRoute("/learning/:directionId/module/:moduleId");
  const [, setLocation] = useLocation();
  const { message } = App.useApp();
  const id = Number(params?.moduleId);
  const direction = getDirection(params?.directionId);
  const content = modules[id];
  const { moduleProgress, token, userRole, assignments, currentUser, fetchAssignments } = useAppStore();
  const progress = moduleProgress.find((m) => m.id === id);
  const isTeacher = userRole === "Teacher";
  // Analitikadagi "Ochish" tugmasi ?assignment=<id> bilan keladi — darhol topshiriq tabini ochamiz
  const assignmentParam = Number(new URLSearchParams(useSearch()).get("assignment")) || undefined;
  const [tab, setTab] = useState(assignmentParam ? "assignment" : "theory");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!isTeacher) fetchAssignments();
  }, [isTeacher, fetchAssignments]);

  const myAssignments = isTeacher ? [] : assignments.filter((a) => a.studentId === currentUser?.id && a.targetModuleId === id);
  const pendingAssignments = myAssignments.filter((a) => !a.completed).length;
  // Modul tugashi uchun faqat savolli topshiriqlar hisobga olinadi (backend: tryCompleteModule)
  const gradedAssignments = myAssignments.filter((a) => a.questions.length > 0);
  const gradedDone = gradedAssignments.filter((a) => a.completed).length;

  const downloadCertificate = async () => {
    setDownloading(true);
    try {
      await downloadModuleCertificate(id, (p) => api.downloadFile(p, token));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Sertifikatni yuklab bo'lmadi");
    } finally {
      setDownloading(false);
    }
  };

  if (!direction || !content || !direction.moduleIds.includes(id)) {
    return <Result status="404" title="Modul topilmadi" extra={<Button onClick={() => setLocation("/learning")}>Yo'nalishlarga qaytish</Button>} />;
  }

  const base = `/learning/${direction.id}`;
  // Topshiriq berilgan modulni server o'quvchiga ochib qo'yadi (CreateAssignment) —
  // lokal progress hali yangilanmagan bo'lsa ham topshiriq bajarilishi mumkin bo'lsin
  const unlocked = isTeacher || !!progress?.unlocked || myAssignments.length > 0;
  const completed = !!progress?.completed;

  if (!unlocked) {
    return (
      <Result
        status="403"
        title="Bu modul hali yopiq"
        subTitle="Oldingi modulni tugating yoki diagnostika testini topshirib darajangizni aniqlang."
        extra={<Button type="primary" onClick={() => setLocation(base)}>Yo'nalishga qaytish</Button>}
      />
    );
  }

  const idx = direction.moduleIds.indexOf(id);
  const nextId = direction.moduleIds[idx + 1];
  const nextUnlocked = nextId !== undefined && (isTeacher || !!moduleProgress.find((m) => m.id === nextId)?.unlocked);

  return (
    <div className="page">
      <PageHeader
        crumbs={[
          { title: "Ta'lim yo'nalishlari", href: "/learning" },
          { title: direction.title, href: base },
          { title: content.title },
        ]}
        title={content.title}
        subtitle={content.summary}
        extra={completed && !isTeacher && (
          <Tag color="success" icon={<CheckCircleFilled />} bordered={false} style={{ padding: "4px 10px", fontSize: 13 }}>
            Tugatildi{progress?.score ? ` · ${percent(progress.score)}` : ""}
          </Tag>
        )}
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={17}>
          <Card styles={{ body: { paddingTop: 8 } }}>
            <Tabs
              activeKey={tab}
              onChange={setTab}
              items={[
                {
                  key: "theory",
                  label: <span><BookOutlined /> Nazariya</span>,
                  children: (
                    <Flex vertical gap={20}>
                      <p className="prose-text">{content.content}</p>
                      <div>
                        <Text strong style={{ display: "block", marginBottom: 8 }}>Asosiy tushunchalar</Text>
                        <Flex gap={8} wrap>
                          {content.concepts.map((c) => <Tag key={c} bordered={false} color="blue">{c}</Tag>)}
                        </Flex>
                      </div>
                      {!isTeacher && pendingAssignments > 0 && (
                        <Flex justify="flex-end">
                          <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => setTab("assignment")}>
                            Topshiriqlarga o'tish
                          </Button>
                        </Flex>
                      )}
                    </Flex>
                  ),
                },
                ...(isTeacher ? [] : [{
                  key: "assignment",
                  label: (
                    <span>
                      <SolutionOutlined /> Topshiriqlar{" "}
                      {pendingAssignments > 0 && <Badge count={pendingAssignments} size="small" color="#d97706" />}
                    </span>
                  ),
                  children: myAssignments.length > 0
                    ? <AssignmentPanel items={myAssignments} initialId={assignmentParam} />
                    : <Empty description="O'qituvchi hali bu modul bo'yicha topshiriq bermagan" />,
                }]),
                {
                  key: "ctf",
                  label: <span><FlagOutlined /> CTF mashqlari</span>,
                  children: <ModuleCTF moduleId={id} />,
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Flex vertical gap={16}>
            <Card>
              <Flex vertical gap={12}>
                <Flex gap={12} align="center">
                  <IconTile icon={<BookOutlined />} size={40} />
                  <Flex vertical>
                    <Text type="secondary" style={{ fontSize: 12 }}>{moduleCode(id)} · {idx + 1}-modul</Text>
                    <Text strong>{direction.title}</Text>
                  </Flex>
                </Flex>
                <Flex vertical gap={6}>
                  <Text type="secondary" style={{ fontSize: 13 }}>1. Nazariyani o'qing</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    2. O'qituvchi topshiriqlarini bajaring (har biridan {percent(MODULE_PASSING_SCORE)} dan yuqori)
                  </Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>3. CTF mashqlarida amaliyot qiling</Text>
                </Flex>
                {!isTeacher && gradedAssignments.length > 0 && !completed && (
                  <Flex vertical gap={2}>
                    <Text style={{ fontSize: 13 }}>Topshiriqlar: {gradedDone} / {gradedAssignments.length}</Text>
                    <Progress
                      percent={Math.round((gradedDone / gradedAssignments.length) * 100)}
                      size="small"
                      showInfo={false}
                      strokeColor="#16a34a"
                    />
                  </Flex>
                )}
              </Flex>
            </Card>

            {completed && !isTeacher && (
              <Card>
                <Flex vertical gap={10}>
                  <Title level={5} style={{ fontWeight: 600 }}>Sertifikat tayyor</Title>
                  <Text type="secondary" style={{ fontSize: 13 }}>Ushbu modul bo'yicha rasmiy sertifikatingizni yuklab oling.</Text>
                  <Button type="primary" icon={<DownloadOutlined />} loading={downloading} onClick={downloadCertificate}>
                    Sertifikatni yuklab olish
                  </Button>
                </Flex>
              </Card>
            )}

            {nextId !== undefined && (
              <Button block disabled={!nextUnlocked} onClick={() => setLocation(`${base}/module/${nextId}`)}>
                Keyingi modul: {modules[nextId].title}
              </Button>
            )}
          </Flex>
        </Col>
      </Row>
    </div>
  );
}
