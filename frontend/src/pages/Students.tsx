import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { App, Avatar, Button, Card, Flex, Input, Popconfirm, Progress, Result, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { DeleteOutlined, EyeOutlined, UserOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import type { Student } from "@/store/useAppStore";
import { LevelTag, PageHeader } from "@/components/common";
import { FuzzyBadge } from "@/components/FuzzyEvaluation";

const { Text } = Typography;

export default function Students() {
  const { students, userRole, fetchStudents, deleteStudent } = useAppStore();
  const [, setLocation] = useLocation();
  const { message } = App.useApp();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (userRole === "Teacher") fetchStudents();
  }, [userRole, fetchStudents]);

  if (userRole !== "Teacher") {
    return <Result status="403" title="Bu sahifa faqat o'qituvchilar uchun" />;
  }

  const remove = async (s: Student) => {
    const res = await deleteStudent(s.id);
    if (res.success) message.success(`${s.name} o'chirildi`);
    else message.error(res.message ?? "Xatolik");
  };

  const columns: TableColumnsType<Student> = [
    {
      title: "O'quvchi",
      dataIndex: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, s) => (
        <Flex align="center" gap={10}>
          <Avatar style={{ background: "#e8f0ff", color: "#2563eb" }} icon={<UserOutlined />} />
          <Flex vertical>
            <Text strong>{s.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {s.username ? `@${s.username}` : "Login yo'q"}
              {s.hasPassword === false && <Tag color="warning" bordered={false} style={{ marginInlineStart: 8 }}>Parol o'rnatilmagan</Tag>}
            </Text>
          </Flex>
        </Flex>
      ),
    },
    {
      title: "Daraja",
      dataIndex: "level",
      filters: [
        { text: "Boshlang'ich", value: "Beginner" },
        { text: "O'rta", value: "Intermediate" },
        { text: "Yuqori", value: "Advanced" },
      ],
      onFilter: (v, s) => s.level === v,
      render: (_, s) => <LevelTag level={s.level} />,
    },
    {
      title: "Fuzzy tayyorgarlik",
      dataIndex: "fuzzyScore",
      sorter: (a, b) => a.fuzzyScore - b.fuzzyScore,
      render: (v: number) => <Progress percent={Math.round(v * 100)} size="small" strokeColor="#2563eb" style={{ minWidth: 140 }} />,
    },
    {
      title: "Fuzzy yakuniy baho",
      key: "finalFuzzy",
      sorter: (a, b) => (a.finalFuzzy?.score ?? -1) - (b.finalFuzzy?.score ?? -1),
      render: (_: unknown, s: Student) => <FuzzyBadge score={s.finalFuzzy?.score} readiness={s.finalFuzzy?.readiness} />,
    },
    {
      title: "Modullar",
      dataIndex: "completedModulesCount",
      sorter: (a, b) => a.completedModulesCount - b.completedModulesCount,
      render: (v: number) => `${v} / 4`,
    },
    {
      title: "",
      key: "actions",
      align: "right",
      render: (_, s) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Tooltip title="Batafsil">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setLocation(`/students/${s.id}`)} />
          </Tooltip>
          <Popconfirm
            title={`${s.name}ni o'chirasizmi?`}
            description="Bu amalni ortga qaytarib bo'lmaydi."
            okText="O'chirish"
            cancelText="Bekor qilish"
            okButtonProps={{ danger: true }}
            onConfirm={() => remove(s)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const q = query.trim().toLowerCase();
  const data = students.filter((s) => s.name.toLowerCase().includes(q) || (s.username ?? "").includes(q));

  return (
    <div className="page">
      <PageHeader title="O'quvchilar" subtitle="Har bir o'quvchining darajasi, fuzzy ko'rsatkichi va modullar bo'yicha natijasi." />
      <Card
        title={`Jami: ${students.length} ta o'quvchi`}
        extra={<Input.Search allowClear placeholder="Ism bo'yicha qidirish" onChange={(e) => setQuery(e.target.value)} style={{ width: 240 }} />}
        styles={{ body: { padding: 0 } }}
      >
        <Table<Student>
          rowKey="id"
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 720 }}
          onRow={(s) => ({ onClick: () => setLocation(`/students/${s.id}`), style: { cursor: "pointer" } })}
          locale={{ emptyText: "O'quvchilar topilmadi" }}
        />
      </Card>
    </div>
  );
}
