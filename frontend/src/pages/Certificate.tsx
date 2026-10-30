import { useState } from "react";
import { useLocation } from "wouter";
import { App, Button, Card, Col, Flex, Progress, Row, Tag, Typography } from "antd";
import { CheckCircleFilled, DownloadOutlined, LockOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { directions, moduleCode, modules } from "@/data/curriculum";
import { IconTile, PageHeader, percent } from "@/components/common";
import { downloadModuleCertificate } from "@/lib/utils";
import api from "@/lib/api";

const { Text } = Typography;

export default function Certificate() {
  const { moduleProgress, token } = useAppStore();
  const { message } = App.useApp();
  const [, setLocation] = useLocation();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const base = `/learning/${directions[0].id}`;
  const completed = moduleProgress.filter((m) => m.completed).length;

  const download = async (id: number) => {
    setDownloadingId(id);
    try {
      await downloadModuleCertificate(id, (p) => api.downloadFile(p, token));
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Sertifikatni yuklab bo'lmadi");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Sertifikatlar"
        subtitle="Moduldagi barcha o'qituvchi topshiriqlaridan kamida 70% bilan o'tsangiz, shu modul bo'yicha sertifikat olasiz."
      />

      <Card styles={{ body: { padding: 18 } }}>
        <Flex justify="space-between" align="center" gap={16} wrap>
          <Text>Olingan sertifikatlar: <Text strong>{completed} / {moduleProgress.length}</Text></Text>
          <Progress percent={Math.round((completed / Math.max(moduleProgress.length, 1)) * 100)} strokeColor="#2563eb" style={{ flex: "1 1 240px", maxWidth: 360, margin: 0 }} />
        </Flex>
      </Card>

      <Row gutter={[16, 16]} className="stagger">
        {moduleProgress.map((m) => (
          <Col key={m.id} xs={24} md={12}>
            <Card style={{ height: "100%", borderStyle: m.completed ? "solid" : "dashed", background: m.completed ? "#fff" : "#fbfcfe" }}>
              <Flex vertical gap={14}>
                <Flex justify="space-between" align="flex-start">
                  <IconTile
                    icon={m.completed ? <SafetyCertificateOutlined /> : <LockOutlined />}
                    tone={m.completed ? "warning" : "muted"}
                    size={44}
                  />
                  {m.completed && (
                    <Tag color="success" bordered={false} icon={<CheckCircleFilled />} style={{ marginInlineEnd: 0 }}>
                      Tugatildi{m.score !== undefined ? ` · ${percent(m.score)}` : ""}
                    </Tag>
                  )}
                </Flex>
                <Flex vertical>
                  <Text type="secondary" style={{ fontSize: 12 }}>{moduleCode(m.id)}</Text>
                  <Text strong style={{ fontSize: 15 }}>{modules[m.id]?.title ?? m.title}</Text>
                </Flex>
                {m.completed ? (
                  <Button type="primary" icon={<DownloadOutlined />} loading={downloadingId === m.id} onClick={() => download(m.id)}>
                    Sertifikatni yuklab olish
                  </Button>
                ) : (
                  <Button disabled={!m.unlocked} onClick={() => setLocation(`${base}/module/${m.id}`)}>
                    {m.unlocked ? "Modulga o'tish" : "Modul hali yopiq"}
                  </Button>
                )}
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
