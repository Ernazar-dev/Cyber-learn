import { useState } from "react";
import { Alert, App, Button, Card, Flex, Input, Space, Tag, Typography } from "antd";
import { BulbOutlined, CheckCircleFilled, FlagOutlined, SendOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { modules } from "@/data/curriculum";
import { moduleColor } from "@/data/moduleTheme";

const { Text, Paragraph } = Typography;

export type CTFChallengeData = {
  id: number;
  moduleId: number;
  moduleTitle?: string;
  title: string;
  description: string;
  difficulty: "Oson" | "O'rta" | "Qiyin";
  points: number;
  hint: string;
  solved: boolean;
};

export const ctfDifficultyColor: Record<string, string> = {
  "Oson": "green",
  "O'rta": "orange",
  "Qiyin": "red",
};

export const ctfModuleTitle = (c: Pick<CTFChallengeData, "moduleId" | "moduleTitle">) =>
  modules[c.moduleId]?.title ?? c.moduleTitle ?? "";

export function CTFChallengeCard({
  challenge,
  token,
  showModule = false,
  onSolved,
}: {
  challenge: CTFChallengeData;
  token: string | null;
  showModule?: boolean;
  /** Flag to'g'ri topilganda chaqiriladi (masalan, ro'yxat va hisoblagichlarni yangilash uchun) */
  onSolved?: () => void;
}) {
  const { message } = App.useApp();
  const [flag, setFlag] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [solved, setSolved] = useState(challenge.solved);

  const submit = async () => {
    const value = flag.trim();
    if (!value) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ correct: boolean; alreadySolved: boolean; message: string; pointsAwarded?: number }>(
        `/api/ctf/${challenge.id}/submit`, { flag: value }, token,
      );
      if (res.correct) {
        setSolved(true);
        onSolved?.();
        if (!res.alreadySolved) message.success(`Flag qabul qilindi: +${res.pointsAwarded ?? 0} XP`);
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      style={{ height: "100%", overflow: "hidden", background: solved ? "#f6fdf9" : undefined }}
      styles={{ body: { padding: 20, height: "100%" } }}
    >
      <span aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: solved ? "#16a34a" : moduleColor(challenge.moduleId) }} />
      <Flex vertical gap={12} style={{ height: "100%" }}>
        <Flex justify="space-between" align="flex-start" gap={8}>
          <Space size={10} align="start">
            <FlagOutlined style={{ color: "#2563eb", fontSize: 16, marginTop: 3 }} />
            <Text strong style={{ fontSize: 15 }}>{challenge.title}</Text>
          </Space>
          {solved && (
            <Tag color="success" icon={<CheckCircleFilled />} bordered={false} style={{ marginInlineEnd: 0 }}>
              Yechildi
            </Tag>
          )}
        </Flex>

        <Flex gap={6} wrap>
          {showModule && (
            <Tag bordered={false} style={{ color: moduleColor(challenge.moduleId), background: `${moduleColor(challenge.moduleId)}14` }}>
              {ctfModuleTitle(challenge)}
            </Tag>
          )}
          <Tag color={ctfDifficultyColor[challenge.difficulty]} bordered={false}>{challenge.difficulty}</Tag>
          <Tag color="blue" bordered={false}>{challenge.points} XP</Tag>
        </Flex>

        {challenge.description && (
          <Paragraph type="secondary" style={{ marginBottom: 0, whiteSpace: "pre-wrap" }}>
            {challenge.description}
          </Paragraph>
        )}

        {challenge.hint && !solved && (
          hintShown ? (
            <Alert type="warning" showIcon icon={<BulbOutlined />} message={challenge.hint} />
          ) : (
            <Button type="link" icon={<BulbOutlined />} onClick={() => setHintShown(true)} style={{ padding: 0, alignSelf: "flex-start" }}>
              Maslahatni ko'rsatish
            </Button>
          )
        )}

        {!solved && (
          <Space.Compact style={{ width: "100%", marginTop: "auto" }}>
            <Input
              placeholder="cyberai{...}"
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              onPressEnter={submit}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              status={error ? "error" : undefined}
            />
            <Button type="primary" icon={<SendOutlined />} loading={submitting} disabled={!flag.trim()} onClick={submit}>
              Yuborish
            </Button>
          </Space.Compact>
        )}

        {error && !solved && <Text type="danger" style={{ fontSize: 13 }}>{error}</Text>}
      </Flex>
    </Card>
  );
}
