import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  App, Badge, Button, Card, Col, Empty, Flex, Form, Input, InputNumber, Modal, Popconfirm, Row, Segmented,
  Select, Skeleton, Table, Tabs, Tag, Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { CheckCircleFilled, DeleteOutlined, FireOutlined, FlagOutlined, PlusOutlined, TrophyOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import { modules } from "@/data/curriculum";
import { moduleColor, moduleLabel } from "@/data/moduleTheme";
import { PageHeader, StatCard, optionalMark } from "@/components/common";
import { CTFChallengeCard, ctfDifficultyColor, ctfModuleTitle, type CTFChallengeData } from "@/components/CTFChallengeCard";

const { Text } = Typography;

const moduleOptions = Object.values(modules).map((m) => ({ value: m.id, label: m.title }));
const DIFFICULTY_ORDER: Record<string, number> = { "Oson": 1, "O'rta": 2, "Qiyin": 3 };

/** Modul → qiyinlik → XP bo'yicha tartiblash */
const sortChallenges = (list: CTFChallengeData[]) =>
  [...list].sort((a, b) =>
    a.moduleId - b.moduleId ||
    (DIFFICULTY_ORDER[a.difficulty] ?? 9) - (DIFFICULTY_ORDER[b.difficulty] ?? 9) ||
    a.points - b.points ||
    a.id - b.id,
  );

/** Modul tablari: "Barchasi" + mashqi bor har bir modul. counter — yorliqdagi son (masalan "2/3"). */
function ModuleTabs({
  challenges,
  active,
  onChange,
  counter,
}: {
  challenges: CTFChallengeData[];
  active: string;
  onChange: (key: string) => void;
  counter: (list: CTFChallengeData[]) => string | number;
}) {
  const moduleIds = Array.from(new Set(challenges.map((c) => c.moduleId))).sort((a, b) => a - b);
  const badge = (count: string | number, color: string) => (
    <Badge count={count} color={color} overflowCount={999} showZero style={{ marginLeft: 4 }} />
  );
  return (
    <Tabs
      activeKey={active}
      onChange={onChange}
      style={{ marginBottom: 0 }}
      items={[
        { key: "all", label: <span>Barchasi {badge(counter(challenges), "#94a3b8")}</span> },
        ...moduleIds.map((id) => ({
          key: String(id),
          label: (
            <span>
              {moduleLabel(id, challenges.find((c) => c.moduleId === id)?.moduleTitle)}{" "}
              {badge(counter(challenges.filter((c) => c.moduleId === id)), moduleColor(id))}
            </span>
          ),
        })),
      ]}
    />
  );
}

interface ChallengeForm {
  moduleId: number;
  title: string;
  description?: string;
  difficulty: "Oson" | "O'rta" | "Qiyin";
  points: number;
  hint?: string;
  flag: string;
}

function TeacherView({ challenges, isLoading }: { challenges: CTFChallengeData[]; isLoading: boolean }) {
  const { token } = useAppStore();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<ChallengeForm>();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("all");
  const [difficulty, setDifficulty] = useState<string>("all");

  const shown = useMemo(
    () => sortChallenges(challenges).filter((c) =>
      (tab === "all" || String(c.moduleId) === tab) &&
      (difficulty === "all" || c.difficulty === difficulty),
    ),
    [challenges, tab, difficulty],
  );

  const submit = async (v: ChallengeForm) => {
    setSaving(true);
    try {
      await api.post("/api/ctf", {
        moduleId: v.moduleId,
        title: v.title.trim(),
        description: v.description?.trim() ?? "",
        difficulty: v.difficulty,
        points: v.points,
        hint: v.hint?.trim() ?? "",
        flag: v.flag.trim(),
      }, token);
      await queryClient.invalidateQueries({ queryKey: ["ctf-all"] });
      message.success(`"${v.title}" mashqi yaratildi`);
      form.resetFields();
      setOpen(false);
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Mashq saqlanmadi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CTFChallengeData) => {
    try {
      await api.del(`/api/ctf/${c.id}`, token);
      await queryClient.invalidateQueries({ queryKey: ["ctf-all"] });
      message.success("Mashq o'chirildi");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "O'chirishda xatolik");
    }
  };

  const columns: TableColumnsType<CTFChallengeData> = [
    {
      title: "Mashq",
      key: "title",
      render: (_, c) => (
        <Flex gap={12} align="flex-start" style={{ minWidth: 0 }}>
          <FlagOutlined style={{ color: moduleColor(c.moduleId), fontSize: 16, marginTop: 4 }} />
          <Flex vertical gap={2} style={{ minWidth: 0 }}>
            <Text strong>{c.title}</Text>
            {c.description && <Text type="secondary" ellipsis style={{ fontSize: 12.5, maxWidth: 560 }}>{c.description}</Text>}
          </Flex>
        </Flex>
      ),
    },
    ...(tab === "all"
      ? [{
          title: "Modul",
          key: "module",
          width: 220,
          render: (_: unknown, c: CTFChallengeData) => (
            <Tag bordered={false} style={{ marginInlineEnd: 0, color: moduleColor(c.moduleId), background: `${moduleColor(c.moduleId)}14` }}>
              {moduleLabel(c.moduleId, ctfModuleTitle(c))}
            </Tag>
          ),
        }]
      : []),
    {
      title: "Qiyinlik",
      key: "difficulty",
      width: 110,
      render: (_, c) => <Tag bordered={false} color={ctfDifficultyColor[c.difficulty]} style={{ marginInlineEnd: 0 }}>{c.difficulty}</Tag>,
    },
    {
      title: "XP",
      key: "points",
      width: 90,
      render: (_, c) => <Text strong style={{ color: "#2563eb" }}>{c.points} XP</Text>,
    },
    {
      title: "",
      key: "actions",
      width: 56,
      render: (_, c) => (
        <Popconfirm
          title="Mashqni o'chirasizmi?"
          okText="O'chirish"
          cancelText="Bekor qilish"
          okButtonProps={{ danger: true }}
          onConfirm={() => remove(c)}
        >
          <Button type="text" danger icon={<DeleteOutlined />} aria-label="Mashqni o'chirish" />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="page">
      <PageHeader
        title="CTF mashqlari"
        subtitle="Modullarga oid flag topish mashqlarini yarating va boshqaring."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Yangi mashq</Button>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={8}><StatCard label="Jami mashqlar" value={challenges.length} icon={<FlagOutlined />} /></Col>
        <Col xs={8}><StatCard label="Modullar" value={new Set(challenges.map((c) => c.moduleId)).size} icon={<TrophyOutlined />} /></Col>
        <Col xs={8}><StatCard label="Jami XP" value={challenges.reduce((s, c) => s + c.points, 0)} icon={<FireOutlined />} tone="warning" /></Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "4px 20px 0" }}>
          <ModuleTabs challenges={challenges} active={tab} onChange={setTab} counter={(l) => l.length} />
        </div>
        <Flex gap={12} wrap align="center" style={{ padding: "14px 20px", borderTop: "1px solid #eef2f8", borderBottom: "1px solid #eef2f8", background: "#fafcff" }}>
          <Segmented
            value={difficulty}
            onChange={(v) => setDifficulty(v as string)}
            options={[{ value: "all", label: "Barchasi" }, { value: "Oson", label: "Oson" }, { value: "O'rta", label: "O'rta" }, { value: "Qiyin", label: "Qiyin" }]}
          />
        </Flex>
        <Table<CTFChallengeData>
          rowKey="id"
          columns={columns}
          dataSource={shown}
          loading={isLoading}
          size="middle"
          scroll={{ x: 720 }}
          locale={{ emptyText: <Empty description="Hozircha mashq yo'q" /> }}
          pagination={{ pageSize: 15, hideOnSinglePage: true, showSizeChanger: false, style: { paddingInline: 20 } }}
        />
      </Card>

      <Modal
        title="Yangi CTF mashqi"
        open={open}
        onCancel={() => { setOpen(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText="Yaratish"
        cancelText="Bekor qilish"
        confirmLoading={saving}
        width={880}
        destroyOnHidden
      >
        <Form<ChallengeForm>
          form={form}
          layout="vertical"
          requiredMark={optionalMark}
          initialValues={{ difficulty: "Oson", points: 50, moduleId: tab === "all" ? undefined : Number(tab) }}
          onFinish={submit}
        >
          <Row gutter={24}>
            {/* Chap ustun: asosiy ma'lumotlar */}
            <Col xs={24} md={12}>
              <Form.Item name="moduleId" label="Modul" rules={[{ required: true, message: "Modulni tanlang" }]}>
                <Select placeholder="Modulni tanlang" options={moduleOptions} />
              </Form.Item>
              <Form.Item name="title" label="Sarlavha" rules={[{ required: true, whitespace: true, message: "Sarlavhani kiriting" }]}>
                <Input placeholder="Masalan: Yashirin xabar" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="difficulty" label="Qiyinlik" rules={[{ required: true }]}>
                    <Select options={["Oson", "O'rta", "Qiyin"].map((d) => ({ value: d, label: d }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="points" label="XP mukofoti" rules={[{ required: true, message: "XP kiriting" }]}>
                    <InputNumber min={1} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="flag"
                label="To'g'ri flag"
                rules={[{ required: true, whitespace: true, message: "Flagni kiriting" }]}
                extra="Flag serverda hash ko'rinishida saqlanadi — yaratilgandan keyin uni qayta ko'rib bo'lmaydi."
              >
                <Input placeholder="cyberai{...}" style={{ fontFamily: "ui-monospace, Menlo, monospace" }} />
              </Form.Item>
            </Col>
            {/* O'ng ustun: matn va maslahat */}
            <Col xs={24} md={12}>
              <Form.Item name="description" label="Topshiriq matni">
                <Input.TextArea rows={7} placeholder="Mashq tavsifi, shifrlangan qator va h.k." />
              </Form.Item>
              <Form.Item name="hint" label="Maslahat">
                <Input placeholder="O'quvchiga yordam beruvchi maslahat" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

type StatusFilter = "Barchasi" | "Yechilmagan" | "Yechilgan";

function StudentView({ challenges, isLoading }: { challenges: CTFChallengeData[]; isLoading: boolean }) {
  const { token } = useAppStore();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("Barchasi");
  const [difficulty, setDifficulty] = useState<string>("all");

  const filtered = useMemo(
    () => sortChallenges(challenges).filter((c) =>
      (tab === "all" || String(c.moduleId) === tab) &&
      (difficulty === "all" || c.difficulty === difficulty) &&
      (status === "Barchasi" || (status === "Yechilgan" ? c.solved : !c.solved)),
    ),
    [challenges, tab, status, difficulty],
  );

  const solved = challenges.filter((c) => c.solved);
  const pct = challenges.length ? Math.round((solved.length / challenges.length) * 100) : 0;

  return (
    <div className="page">
      <PageHeader title="CTF mashqlari" subtitle="Har bir modul mavzusiga oid flag'larni toping va XP to'plang." />

      <Row gutter={[16, 16]}>
        <Col xs={8}><StatCard label="Yechilgan" value={`${solved.length} / ${challenges.length}`} icon={<CheckCircleFilled />} tone="success" hint={`${pct}% bajarildi`} /></Col>
        <Col xs={8}><StatCard label="To'plangan XP" value={solved.reduce((s, c) => s + c.points, 0)} icon={<FireOutlined />} tone="warning" /></Col>
        <Col xs={8}><StatCard label="Mumkin bo'lgan XP" value={challenges.reduce((s, c) => s + c.points, 0)} icon={<TrophyOutlined />} /></Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "4px 20px 0" }}>
          <ModuleTabs
            challenges={challenges}
            active={tab}
            onChange={setTab}
            counter={(l) => `${l.filter((c) => c.solved).length}/${l.length}`}
          />
        </div>
        <Flex gap={12} wrap align="center" style={{ padding: "14px 20px", borderTop: "1px solid #eef2f8" }}>
          <Segmented<StatusFilter> options={["Barchasi", "Yechilmagan", "Yechilgan"]} value={status} onChange={setStatus} />
          <Select
            value={difficulty}
            onChange={setDifficulty}
            style={{ width: 170 }}
            options={[{ value: "all", label: "Barcha qiyinliklar" }, ...["Oson", "O'rta", "Qiyin"].map((d) => ({ value: d, label: d }))]}
          />
          <Text type="secondary" style={{ marginLeft: "auto" }}>{filtered.length} ta mashq</Text>
        </Flex>
      </Card>

      {isLoading ? (
        <Row gutter={[16, 16]}>
          {[0, 1, 2].map((i) => <Col key={i} xs={24} md={12} xl={8}><Card><Skeleton active /></Card></Col>)}
        </Row>
      ) : filtered.length === 0 ? (
        <Card><Empty description="Mashqlar topilmadi" /></Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map((c) => (
            <Col key={c.id} xs={24} md={12} xl={8}>
              <CTFChallengeCard
                challenge={c}
                token={token}
                showModule={tab === "all"}
                onSolved={() => queryClient.invalidateQueries({ queryKey: ["ctf-all"] })}
              />
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}

export default function CTF() {
  const { userRole, token } = useAppStore();
  const { data, isLoading } = useQuery({
    queryKey: ["ctf-all"],
    queryFn: () => api.get<CTFChallengeData[]>("/api/ctf", token),
  });
  const challenges = data ?? [];
  return userRole === "Teacher"
    ? <TeacherView challenges={challenges} isLoading={isLoading} />
    : <StudentView challenges={challenges} isLoading={isLoading} />;
}
