import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Card, Col, Empty, Flex, Input, Row, Select, Skeleton, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { CrownFilled, FireOutlined, TeamOutlined, ThunderboltOutlined, TrophyOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import type { Level } from "@/lib/utils";
import { LevelTag, PageHeader, StatCard } from "@/components/common";

const { Text } = Typography;

type Entry = {
  rank: number;
  userId: number;
  name: string;
  avatar?: string;
  xp: number;
  level: Level;
  totalScore: number;
  completedTasks: number;
};

const MEDAL = {
  1: { color: "#d4a106", bg: "#fffbea", border: "#fbe7a1" },
  2: { color: "#8a96a8", bg: "#f6f8fb", border: "#e2e8f0" },
  3: { color: "#c0743a", bg: "#fff6ef", border: "#f8d9c0" },
} as const;

function UserAvatar({ e, size = 36 }: { e: Entry; size?: number }) {
  return (
    <Avatar size={size} src={e.avatar || undefined} style={{ background: "#e8f0ff", color: "#2563eb", fontWeight: 600 }}>
      {e.name[0]?.toUpperCase()}
    </Avatar>
  );
}

export default function Rankings() {
  const { currentUser } = useAppStore();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => api.get<Entry[]>("/api/rankings?limit=500"),
  });

  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => a.rank - b.rank), [data]);
  const filtered = sorted.filter((e) =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
    (level === "all" || e.level === level),
  );
  const top3 = sorted.slice(0, 3);
  const me = sorted.find((e) => e.userId === currentUser?.id);
  const maxXP = Math.max(0, ...sorted.map((e) => e.xp));
  const avgXP = sorted.length ? Math.round(sorted.reduce((s, e) => s + e.xp, 0) / sorted.length) : 0;

  const columns: TableColumnsType<Entry> = [
    {
      title: "#",
      dataIndex: "rank",
      width: 64,
      render: (r: number) => <Text strong style={{ color: r <= 3 ? MEDAL[r as 1 | 2 | 3].color : "#94a3b8" }}>{r}</Text>,
    },
    {
      title: "O'quvchi",
      dataIndex: "name",
      render: (_, e) => (
        <Flex align="center" gap={10}>
          <UserAvatar e={e} />
          <Text strong>{e.name}</Text>
          {e.userId === currentUser?.id && <Tag color="blue" bordered={false}>Siz</Tag>}
        </Flex>
      ),
    },
    { title: "Daraja", dataIndex: "level", render: (_, e) => <LevelTag level={e.level} /> },
    { title: "XP", dataIndex: "xp", align: "right", render: (v: number) => <Text strong style={{ color: "#16a34a" }}>{v.toLocaleString()}</Text> },
    { title: "Vazifalar", dataIndex: "completedTasks", align: "right" },
  ];

  return (
    <div className="page">
      <PageHeader
        title="Reyting"
        subtitle={`XP asosida · ${sorted.length} o'quvchi`}
        extra={me && (
          <Card size="small" styles={{ body: { padding: "8px 16px" } }}>
            <Flex vertical align="flex-end">
              <Text type="secondary" style={{ fontSize: 12 }}>Mening o'rnim</Text>
              <Text strong style={{ fontSize: 22, color: "#2563eb", lineHeight: 1.2 }}>#{me.rank}</Text>
            </Flex>
          </Card>
        )}
      />

      {isLoading ? (
        <Card><Skeleton active /></Card>
      ) : sorted.length === 0 ? (
        <Card><Empty description="Reyting hali shakllanmagan" /></Card>
      ) : (
        <>
          <Row gutter={[16, 16]} className="stagger">
            {top3.map((e) => {
              const m = MEDAL[e.rank as 1 | 2 | 3] ?? MEDAL[3];
              return (
                <Col key={e.userId} xs={24} md={8}>
                  <Card style={{ background: m.bg, borderColor: m.border, height: "100%" }}>
                    <Flex vertical align="center" gap={8}>
                      {e.rank === 1 ? <CrownFilled style={{ color: m.color, fontSize: 22 }} /> : <TrophyOutlined style={{ color: m.color, fontSize: 20 }} />}
                      <UserAvatar e={e} size={e.rank === 1 ? 64 : 54} />
                      <Text strong style={{ fontSize: 15, textAlign: "center" }}>{e.name}</Text>
                      <Flex gap={6} wrap justify="center">
                        <Tag bordered={false} style={{ color: m.color, background: "#fff" }}>{e.rank}-o'rin</Tag>
                        <LevelTag level={e.level} />
                      </Flex>
                      <Text strong style={{ fontSize: 18 }}>{e.xp.toLocaleString()} XP</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{e.completedTasks} ta vazifa</Text>
                    </Flex>
                  </Card>
                </Col>
              );
            })}
          </Row>

          <Card
            title="Umumiy jadval"
            styles={{ body: { padding: 0 } }}
            extra={
              <Flex gap={8} wrap>
                <Input.Search allowClear placeholder="Ism bo'yicha qidirish" onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
                <Select
                  value={level}
                  onChange={setLevel}
                  style={{ width: 170 }}
                  options={[
                    { value: "all", label: "Barcha darajalar" },
                    { value: "Beginner", label: "Boshlang'ich" },
                    { value: "Intermediate", label: "O'rta" },
                    { value: "Advanced", label: "Yuqori" },
                  ]}
                />
              </Flex>
            }
          >
            <Table<Entry>
              rowKey="userId"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 20, hideOnSinglePage: true }}
              scroll={{ x: 560 }}
              rowClassName={(e) => (e.userId === currentUser?.id ? "ant-table-row-selected" : "")}
              locale={{ emptyText: "O'quvchi topilmadi" }}
            />
          </Card>

          <Row gutter={[16, 16]} className="stagger">
            <Col xs={12} md={6}><StatCard label="Jami o'quvchilar" value={sorted.length} icon={<TeamOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="Maksimal XP" value={maxXP.toLocaleString()} icon={<ThunderboltOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="O'rtacha XP" value={avgXP.toLocaleString()} icon={<FireOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="Bajarilgan vazifalar" value={sorted.reduce((s, e) => s + e.completedTasks, 0)} icon={<TrophyOutlined />} tone="success" /></Col>
          </Row>
        </>
      )}
    </div>
  );
}
