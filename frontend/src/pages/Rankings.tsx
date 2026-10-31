import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, Card, Col, Empty, Flex, Input, Progress, Row, Select, Skeleton, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { CheckCircleFilled, CrownFilled, FireOutlined, LockOutlined, TeamOutlined, ThunderboltOutlined, TrophyOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import api from "@/lib/api";
import type { Level } from "@/lib/utils";
import { LevelTag, PageHeader, StatCard } from "@/components/common";
import { RankBadge, XP_RANKS, getXpRank, rankRange, type XpRank } from "@/components/RankBadge";

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
    <Avatar size={size} src={e.avatar || undefined} style={{ background: "#e8f0ff", color: "#2563eb", fontWeight: 600, flexShrink: 0 }}>
      {e.name[0]?.toUpperCase()}
    </Avatar>
  );
}

/** Joriy darajadagi taraqqiyot: 0..100 */
function rankProgress(xp: number, r: XpRank) {
  if (r.next === null) return 100;
  return Math.min(100, Math.max(0, Math.round(((xp - r.min) / (r.next - r.min)) * 100)));
}

/** O'quvchining o'z darajasi va keyingi darajagacha qolgan XP */
function MyRankCard({ me }: { me: Entry }) {
  const r = getXpRank(me.xp);
  const next = r.next === null ? null : XP_RANKS[r.tier];
  const pct = rankProgress(me.xp, r);

  return (
    <Card
      style={{ height: "100%", background: `linear-gradient(135deg, #fff 55%, ${r.color}14)`, borderColor: `${r.color}33` }}
      styles={{ body: { padding: 22 } }}
    >
      <Flex gap={20} align="center" wrap>
        <div className="rank-hero-badge">
          <RankBadge tier={r.tier} size={96} />
        </div>
        <Flex vertical gap={6} style={{ flex: 1, minWidth: 220 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>Mening darajam · {r.tier}/{XP_RANKS.length}</Text>
          <Flex align="baseline" gap={10} wrap>
            <Text strong style={{ fontSize: 26, lineHeight: 1.15, color: r.color }}>{r.name}</Text>
            <Text type="secondary">{r.uz}</Text>
          </Flex>
          <Flex gap={8} wrap>
            <Tag bordered={false} color="green" style={{ fontWeight: 600 }}>{me.xp.toLocaleString()} XP</Tag>
            <Tag bordered={false} color="blue">#{me.rank}-o'rin</Tag>
          </Flex>
          <Progress
            percent={pct}
            showInfo={false}
            strokeColor={{ from: r.color, to: next ? next.color : r.color }}
            style={{ margin: "4px 0 0" }}
          />
          {next ? (
            <Flex justify="space-between" align="center" gap={8} wrap>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Keyingi daraja <Text strong>{next.name}</Text> — yana <Text strong style={{ color: "#16a34a" }}>{(next.min - me.xp).toLocaleString()} XP</Text>
              </Text>
              <RankBadge tier={next.tier} size={26} locked />
            </Flex>
          ) : (
            <Text style={{ fontSize: 13, color: r.color, fontWeight: 600 }}>
              <CrownFilled /> Eng yuqori darajaga erishdingiz!
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
}

/** Barcha darajalar: nishon, nomi va XP oralig'i */
function RankLadder({ xp }: { xp?: number }) {
  const current = xp === undefined ? null : getXpRank(xp).tier;
  return (
    <Card title="Darajalar va nishonlar" style={{ height: "100%" }} styles={{ body: { padding: 16 } }}>
      <Row gutter={[10, 10]}>
        {XP_RANKS.map((r) => {
          const reached = current !== null && r.tier <= current;
          const isCurrent = r.tier === current;
          const locked = current !== null && !reached;
          return (
            <Col key={r.tier} xs={8} sm={4} lg={8} xl={4}>
              <Tooltip title={`${r.uz} · ${rankRange(r)} XP`}>
                <div
                  className="rank-tile"
                  style={isCurrent ? { borderColor: r.color, boxShadow: `0 0 0 3px ${r.color}22`, background: `${r.color}0d` } : undefined}
                >
                  <div className={isCurrent ? "rank-current-glow" : undefined} style={{ position: "relative", "--glow": r.color } as CSSProperties}>
                    <RankBadge tier={r.tier} size={48} locked={locked} />
                    {locked && <LockOutlined className="rank-tile-mark" style={{ color: "#94a3b8" }} />}
                    {reached && !isCurrent && <CheckCircleFilled className="rank-tile-mark" style={{ color: "#16a34a" }} />}
                  </div>
                  <Text strong style={{ fontSize: 12.5, color: locked ? "#94a3b8" : "#0f172a", textAlign: "center", lineHeight: 1.2 }}>{r.name}</Text>
                  <Text type="secondary" style={{ fontSize: 11.5 }}>{rankRange(r)}</Text>
                </div>
              </Tooltip>
            </Col>
          );
        })}
      </Row>
    </Card>
  );
}

export default function Rankings() {
  const { currentUser } = useAppStore();
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState<string>("all");
  const [tier, setTier] = useState<number | "all">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["rankings"],
    queryFn: () => api.get<Entry[]>("/api/rankings?limit=500"),
  });

  const sorted = useMemo(() => (data ?? []).slice().sort((a, b) => a.rank - b.rank), [data]);
  const filtered = sorted.filter((e) =>
    (!search || e.name.toLowerCase().includes(search.toLowerCase())) &&
    (level === "all" || e.level === level) &&
    (tier === "all" || getXpRank(e.xp).tier === tier),
  );
  const top3 = sorted.slice(0, 3);
  const me = sorted.find((e) => e.userId === currentUser?.id);
  const maxXP = Math.max(0, ...sorted.map((e) => e.xp));
  const avgXP = sorted.length ? Math.round(sorted.reduce((s, e) => s + e.xp, 0) / sorted.length) : 0;

  const columns: TableColumnsType<Entry> = [
    {
      title: "#",
      dataIndex: "rank",
      width: 56,
      render: (r: number) => <Text strong style={{ color: r <= 3 ? MEDAL[r as 1 | 2 | 3].color : "#94a3b8" }}>{r}</Text>,
    },
    {
      title: "O'quvchi",
      dataIndex: "name",
      render: (_, e) => {
        const r = getXpRank(e.xp);
        return (
          <Flex align="center" gap={10}>
            <span className="badge-pop"><RankBadge tier={r.tier} size={34} /></span>
            <UserAvatar e={e} />
            <Flex vertical style={{ minWidth: 0 }}>
              <Flex align="center" gap={6}>
                <Text strong ellipsis>{e.name}</Text>
                {e.userId === currentUser?.id && <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0 }}>Siz</Tag>}
              </Flex>
              <Text style={{ fontSize: 12, color: r.color, fontWeight: 500 }}>{r.name}</Text>
            </Flex>
          </Flex>
        );
      },
    },
    { title: "Bilim darajasi", dataIndex: "level", render: (_, e) => <LevelTag level={e.level} /> },
    {
      title: "XP",
      dataIndex: "xp",
      align: "right",
      render: (v: number) => <Text strong style={{ color: "#16a34a" }}>{v.toLocaleString()}</Text>,
    },
    {
      title: "XP darajasi",
      key: "xpRank",
      align: "right",
      render: (_, e) => {
        const r = getXpRank(e.xp);
        return (
          <Flex vertical align="flex-end" style={{ lineHeight: 1.25 }}>
            <Text strong>{r.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{rankRange(r)}</Text>
          </Flex>
        );
      },
    },
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
        <>
          <RankLadder />
          <Card><Empty description="Reyting hali shakllanmagan" /></Card>
        </>
      ) : (
        <>
          <Row gutter={[16, 16]} className="stagger">
            {me && <Col xs={24} lg={12}><MyRankCard me={me} /></Col>}
            <Col xs={24} lg={me ? 12 : 24}><RankLadder xp={me?.xp} /></Col>
          </Row>

          <Row gutter={[16, 16]} className="stagger">
            {top3.map((e) => {
              const m = MEDAL[e.rank as 1 | 2 | 3] ?? MEDAL[3];
              const r = getXpRank(e.xp);
              return (
                <Col key={e.userId} xs={24} md={8}>
                  <Card className={e.rank === 1 ? "podium-card podium-first" : "podium-card"} style={{ background: m.bg, borderColor: m.border, height: "100%" }}>
                    <Flex vertical align="center" gap={8}>
                      {e.rank === 1 ? <CrownFilled className="crown-bob" style={{ color: m.color, fontSize: 22 }} /> : <TrophyOutlined style={{ color: m.color, fontSize: 20 }} />}
                      <div style={{ position: "relative" }}>
                        <UserAvatar e={e} size={e.rank === 1 ? 64 : 54} />
                        <span className="badge-pop" style={{ position: "absolute", right: -10, bottom: -6 }}><RankBadge tier={r.tier} size={30} /></span>
                      </div>
                      <Text strong style={{ fontSize: 15, textAlign: "center" }}>{e.name}</Text>
                      <Flex gap={6} wrap justify="center">
                        <Tag bordered={false} style={{ color: m.color, background: "#fff" }}>{e.rank}-o'rin</Tag>
                        <Tag bordered={false} style={{ color: r.color, background: "#fff", fontWeight: 600 }}>{r.name}</Tag>
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
                <Input.Search allowClear placeholder="Ism bo'yicha qidirish" onChange={(e) => setSearch(e.target.value)} style={{ width: 200 }} />
                <Select<number | "all">
                  value={tier}
                  onChange={setTier}
                  style={{ width: 180 }}
                  options={[
                    { value: "all", label: "Barcha XP darajalari" },
                    ...XP_RANKS.map((r) => ({
                      value: r.tier,
                      label: <Flex align="center" gap={8}><RankBadge tier={r.tier} size={18} />{r.name}</Flex>,
                    })),
                  ]}
                />
                <Select
                  value={level}
                  onChange={setLevel}
                  style={{ width: 160 }}
                  options={[
                    { value: "all", label: "Barcha bilim darajalari" },
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
              scroll={{ x: 760 }}
              rowClassName={(e) => (e.userId === currentUser?.id ? "ant-table-row-selected" : "")}
              locale={{ emptyText: "O'quvchi topilmadi" }}
            />
          </Card>

          <Row gutter={[16, 16]} className="stagger">
            <Col xs={12} md={6}><StatCard label="Jami o'quvchilar" value={sorted.length} icon={<TeamOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="Maksimal XP" value={maxXP} icon={<ThunderboltOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="O'rtacha XP" value={avgXP} icon={<FireOutlined />} /></Col>
            <Col xs={12} md={6}><StatCard label="Bajarilgan vazifalar" value={sorted.reduce((s, e) => s + e.completedTasks, 0)} icon={<TrophyOutlined />} tone="success" /></Col>
          </Row>
        </>
      )}
    </div>
  );
}
