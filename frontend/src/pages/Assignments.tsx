import { useEffect, useMemo, useState } from "react";
import {
  App, Button, Card, Col, Collapse, Empty, Flex, Form, Input, List, Modal, Progress, Radio, Result, Row, Segmented,
  Select, Table, Tag, Tooltip, Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  CheckCircleFilled, CheckOutlined, ClockCircleOutlined, DeleteOutlined, FormOutlined, PlusOutlined, SendOutlined,
  TeamOutlined, UserOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import type { Assignment, AssignmentQuestion } from "@/store/useAppStore";
import { modules } from "@/data/curriculum";
import { moduleColor, moduleLabel } from "@/data/moduleTheme";
import { PageHeader, StatCard, optionalMark } from "@/components/common";
import { translateLevel } from "@/lib/utils";

const { Text } = Typography;

interface AssignmentForm {
  title: string;
  description?: string;
  studentId: number;
  moduleId: number;
}

interface QuestionDraft {
  question: string;
  options: string[];
  correct: number;
}

const moduleOptions = Object.values(modules).map((m) => ({ value: m.id, label: moduleLabel(m.id) }));
const EMPTY_DRAFT: QuestionDraft = { question: "", options: ["", "", "", ""], correct: 0 };

/**
 * Bitta "topshiriq" — bir vaqtda yuborilgan nusxalar guruhi. "Hamma o'quvchilar"ga yuborilganda
 * backend har bir o'quvchi uchun alohida yozuv yaratadi; ular shu kalit bo'yicha birlashtiriladi
 * (backend'dagi backfillLegacyAssignmentBatches bilan bir xil qoida).
 */
interface AssignmentGroup {
  key: string;
  title: string;
  description?: string;
  moduleId: number;
  date: string;
  questions: AssignmentQuestion[];
  items: Assignment[];
  done: number;
}

function groupAssignments(list: Assignment[]): AssignmentGroup[] {
  const map = new Map<string, AssignmentGroup>();
  for (const a of list) {
    const key = [a.title, a.description ?? "", a.targetModuleId, a.assignmentType, a.dateAssigned.slice(0, 10)].join("|");
    let g = map.get(key);
    if (!g) {
      g = { key, title: a.title, description: a.description, moduleId: a.targetModuleId, date: a.dateAssigned.slice(0, 10), questions: a.questions, items: [], done: 0 };
      map.set(key, g);
    }
    g.items.push(a);
    if (a.completed) g.done += 1;
  }
  return Array.from(map.values()).sort((x, y) => y.date.localeCompare(x.date) || x.title.localeCompare(y.title));
}

type StatusFilter = "Barchasi" | "Jarayonda" | "Yakunlangan";

function QuestionsPreview({ questions }: { questions: AssignmentQuestion[] }) {
  if (questions.length === 0) return <Text type="secondary">Savol qo'shilmagan.</Text>;
  return (
    <Flex vertical gap={10}>
      {questions.map((q, i) => (
        <div key={q.id} style={{ padding: "10px 14px", border: "1px solid #eef2f8", borderRadius: 10, background: "#fff" }}>
          <Text strong>{i + 1}. {q.question}</Text>
          <Flex vertical gap={2} style={{ marginTop: 6 }}>
            {q.options.map((opt, oi) => (
              <Text key={oi} type={oi === q.correctAnswer ? "success" : "secondary"} strong={oi === q.correctAnswer} style={{ fontSize: 13 }}>
                {String.fromCharCode(65 + oi)}. {opt} {oi === q.correctAnswer && <CheckCircleFilled />}
              </Text>
            ))}
          </Flex>
        </div>
      ))}
    </Flex>
  );
}

export default function Assignments() {
  const { students, assignments, addAssignment, completeAssignment, userRole, fetchStudents, fetchAssignments } = useAppStore();
  const { message } = App.useApp();
  const [form] = Form.useForm<AssignmentForm>();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<AssignmentQuestion[]>([]);
  const [draft, setDraft] = useState<QuestionDraft>(EMPTY_DRAFT);
  const [sending, setSending] = useState(false);

  const [status, setStatus] = useState<StatusFilter>("Barchasi");
  const [moduleFilter, setModuleFilter] = useState<number | "all">("all");
  const [studentFilter, setStudentFilter] = useState<number | "all">("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (userRole !== "Teacher") return;
    fetchStudents();
    fetchAssignments();
  }, [userRole, fetchStudents, fetchAssignments]);

  const groups = useMemo(() => groupAssignments(assignments), [assignments]);

  if (userRole !== "Teacher") {
    return <Result status="403" title="Bu sahifa faqat o'qituvchilar uchun" />;
  }

  // ── Filtrlash ──
  const q = query.trim().toLowerCase();
  const shown = groups.filter((g) =>
    (status === "Barchasi" || (status === "Yakunlangan" ? g.done === g.items.length : g.done < g.items.length)) &&
    (moduleFilter === "all" || g.moduleId === moduleFilter) &&
    (studentFilter === "all" || g.items.some((a) => a.studentId === studentFilter)) &&
    (!q || g.title.toLowerCase().includes(q) || (g.description ?? "").toLowerCase().includes(q)),
  );

  const totalRows = assignments.length;
  const doneRows = assignments.filter((a) => a.completed).length;
  const activeGroups = groups.filter((g) => g.done < g.items.length).length;

  // ── Savol konstruktori ──
  const addDraftQuestion = () => {
    const filled = draft.options.map((o) => o.trim());
    const options = filled.filter(Boolean);
    if (!draft.question.trim()) {
      message.warning("Savol matnini kiriting");
      return;
    }
    if (options.length < 2) {
      message.warning("Kamida 2 ta variant kiriting");
      return;
    }
    if (!filled[draft.correct]) {
      message.warning("To'g'ri javob sifatida bo'sh bo'lmagan variantni tanlang");
      return;
    }
    const correctAnswer = options.indexOf(filled[draft.correct]);
    setQuestions((prev) => [...prev, { id: Date.now(), question: draft.question.trim(), options, correctAnswer }]);
    setDraft(EMPTY_DRAFT);
  };

  const closeModal = () => {
    setOpen(false);
    form.resetFields();
    setQuestions([]);
    setDraft(EMPTY_DRAFT);
  };

  const submit = async (v: AssignmentForm) => {
    setSending(true);
    const res = await addAssignment(v.title.trim(), v.studentId, v.moduleId, questions, v.description?.trim() ?? "", "Amaliy");
    setSending(false);
    if (!res.success) {
      message.error(res.message ?? "Topshiriq yuborilmadi");
      return;
    }
    message.success(v.studentId === 0 ? `Topshiriq ${students.length} ta o'quvchiga yuborildi` : "Topshiriq yuborildi");
    closeModal();
  };

  const markDone = async (a: Assignment) => {
    const res = await completeAssignment(a.id);
    if (res.success) message.success(`${a.studentName}: bajarildi deb belgilandi`);
    else message.error(res.message ?? "Xatolik");
  };

  // ── Jadval ──
  const columns: TableColumnsType<AssignmentGroup> = [
    {
      title: "Topshiriq",
      key: "title",
      render: (_, g) => (
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Text strong>{g.title}</Text>
          {g.description && <Text type="secondary" ellipsis style={{ fontSize: 12.5, maxWidth: 460 }}>{g.description}</Text>}
        </Flex>
      ),
    },
    {
      title: "Modul",
      key: "module",
      width: 210,
      render: (_, g) => (
        <Tag bordered={false} style={{ marginInlineEnd: 0, color: moduleColor(g.moduleId), background: `${moduleColor(g.moduleId)}14` }}>
          {moduleLabel(g.moduleId)}
        </Tag>
      ),
    },
    {
      title: "Kimga",
      key: "to",
      width: 220,
      render: (_, g) => g.items.length > 1
        ? <Text style={{ whiteSpace: "nowrap" }}><TeamOutlined style={{ color: "#64748b", marginRight: 6 }} />Hamma o'quvchilar · {g.items.length}</Text>
        : <Text ellipsis style={{ maxWidth: 200 }}><UserOutlined style={{ color: "#64748b", marginRight: 6 }} />{g.items[0].studentName}</Text>,
    },
    {
      title: "Savollar",
      key: "questions",
      width: 90,
      align: "center",
      render: (_, g) => <Text type={g.questions.length ? undefined : "secondary"}>{g.questions.length || "—"}</Text>,
    },
    {
      title: "Bajarilish",
      key: "progress",
      width: 170,
      render: (_, g) => {
        const pct = Math.round((g.done / g.items.length) * 100);
        return (
          <Flex vertical gap={0}>
            <Text style={{ fontSize: 12.5 }}>{g.done} / {g.items.length} bajardi</Text>
            <Progress percent={pct} size="small" showInfo={false} status={pct === 100 ? "success" : "normal"} style={{ margin: 0 }} />
          </Flex>
        );
      },
    },
    {
      title: "Sana",
      key: "date",
      width: 110,
      render: (_, g) => <Text type="secondary" style={{ whiteSpace: "nowrap" }}>{g.date}</Text>,
    },
  ];

  const expanded = (g: AssignmentGroup) => {
    const items = studentFilter === "all" ? g.items : g.items.filter((a) => a.studentId === studentFilter);
    const sorted = [...items].sort((a, b) => Number(a.completed) - Number(b.completed) || a.studentName.localeCompare(b.studentName));
    return (
      <Row gutter={[24, 16]} style={{ padding: "4px 8px" }}>
        <Col xs={24} lg={12}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>O'quvchilar</Text>
          <List
            size="small"
            bordered
            style={{ background: "#fff" }}
            dataSource={sorted}
            renderItem={(a) => (
              <List.Item
                extra={a.completed
                  ? <Tag color="success" bordered={false} icon={<CheckCircleFilled />} style={{ marginInlineEnd: 0 }}>Bajarildi</Tag>
                  : (
                    <Tooltip title="Bajarildi deb belgilash">
                      <Button size="small" icon={<CheckOutlined />} onClick={() => markDone(a)}>Bajarildi</Button>
                    </Tooltip>
                  )}
              >
                <Flex align="center" gap={8}>
                  {a.completed ? <CheckCircleFilled style={{ color: "#16a34a" }} /> : <ClockCircleOutlined style={{ color: "#d97706" }} />}
                  <Text>{a.studentName}</Text>
                </Flex>
              </List.Item>
            )}
          />
        </Col>
        <Col xs={24} lg={12}>
          <Text strong style={{ display: "block", marginBottom: 8 }}>Savollar ({g.questions.length})</Text>
          {g.questions.length > 3 ? (
            <Collapse
              size="small"
              items={[{ key: "q", label: `${g.questions.length} ta savolni ko'rish`, children: <QuestionsPreview questions={g.questions} /> }]}
            />
          ) : (
            <QuestionsPreview questions={g.questions} />
          )}
        </Col>
      </Row>
    );
  };

  return (
    <div className="page">
      <PageHeader
        title="Topshiriqlar"
        subtitle="O'quvchilarga vazifa yuboring, savollar qo'shing va bajarilishini kuzating."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Yangi topshiriq</Button>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={8}><StatCard label="Topshiriqlar" value={groups.length} icon={<FormOutlined />} hint={`${activeGroups} tasi jarayonda`} /></Col>
        <Col xs={8}>
          <StatCard
            label="Bajarilish"
            value={`${totalRows ? Math.round((doneRows / totalRows) * 100) : 0}%`}
            icon={<CheckCircleFilled />}
            tone="success"
            footer={<Progress percent={totalRows ? Math.round((doneRows / totalRows) * 100) : 0} showInfo={false} size="small" />}
          />
        </Col>
        <Col xs={8}><StatCard label="Kutilmoqda" value={totalRows - doneRows} icon={<ClockCircleOutlined />} tone="warning" hint="o'quvchi bajarishi kerak" /></Col>
      </Row>

      <Card styles={{ body: { padding: 0 } }}>
        <Flex gap={12} wrap align="center" style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f8", background: "#fafcff" }}>
          <Segmented<StatusFilter> options={["Barchasi", "Jarayonda", "Yakunlangan"]} value={status} onChange={setStatus} />
          <Select
            value={moduleFilter}
            onChange={setModuleFilter}
            style={{ width: 220 }}
            options={[{ value: "all", label: "Barcha modullar" }, ...moduleOptions]}
          />
          <Select
            value={studentFilter}
            onChange={setStudentFilter}
            showSearch
            optionFilterProp="label"
            style={{ width: 210 }}
            options={[{ value: "all", label: "Hamma o'quvchilar" }, ...students.map((s) => ({ value: s.id, label: s.name }))]}
          />
          <Input.Search
            placeholder="Topshiriq nomi bo'yicha qidirish"
            allowClear
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: "1 1 220px", maxWidth: 320, marginLeft: "auto" }}
          />
        </Flex>
        <Table<AssignmentGroup>
          key={`${status}|${moduleFilter}|${studentFilter}|${q}`}
          rowKey="key"
          columns={columns}
          dataSource={shown}
          size="middle"
          scroll={{ x: 960 }}
          expandable={{ expandedRowRender: expanded, expandRowByClick: true }}
          onRow={() => ({ style: { cursor: "pointer" } })}
          locale={{ emptyText: <Empty description={groups.length === 0 ? "Hozircha topshiriq yuborilmagan" : "Filtr bo'yicha topshiriq topilmadi"} /> }}
          pagination={{ pageSize: 12, hideOnSinglePage: true, showSizeChanger: false, showTotal: (t) => `${t} ta topshiriq`, style: { paddingInline: 20 } }}
        />
      </Card>

      <Modal
        title="Yangi topshiriq"
        open={open}
        onCancel={closeModal}
        width={1000}
        destroyOnHidden
        footer={
          <Flex justify="space-between" align="center">
            <Text type="secondary">{questions.length ? `${questions.length} ta savol qo'shildi` : "Savollar ixtiyoriy"}</Text>
            <Flex gap={8}>
              <Button onClick={closeModal}>Bekor qilish</Button>
              <Button type="primary" icon={<SendOutlined />} loading={sending} onClick={() => form.submit()}>Topshiriqni yuborish</Button>
            </Flex>
          </Flex>
        }
      >
        <Row gutter={24}>
          {/* Chap: topshiriq ma'lumotlari */}
          <Col xs={24} md={11}>
            <Form<AssignmentForm>
              form={form}
              layout="vertical"
              requiredMark={optionalMark}
              initialValues={{ studentId: 0, moduleId: 1 }}
              onFinish={submit}
            >
              <Form.Item name="title" label="Topshiriq nomi" rules={[{ required: true, whitespace: true, message: "Nomini kiriting" }]}>
                <Input placeholder="Masalan: Kriptografiya asoslari bo'yicha test" />
              </Form.Item>
              <Form.Item name="description" label="Tavsif">
                <Input.TextArea rows={3} placeholder="Topshiriq haqida qisqacha izoh" />
              </Form.Item>
              <Form.Item name="studentId" label="Kimga" rules={[{ required: true }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={[
                    { value: 0, label: `Hamma o'quvchilar (${students.length})` },
                    ...students.map((s) => ({ value: s.id, label: `${s.name} (${translateLevel(s.level)})` })),
                  ]}
                />
              </Form.Item>
              <Form.Item name="moduleId" label="Modul" rules={[{ required: true }]}>
                <Select options={moduleOptions} />
              </Form.Item>
            </Form>
          </Col>

          {/* O'ng: savollar konstruktori */}
          <Col xs={24} md={13}>
            <div style={{ border: "1px solid #e8eef8", borderRadius: 12, background: "#fafcff", padding: 16 }}>
              <Text strong style={{ display: "block", marginBottom: 10 }}>Savol qo'shish</Text>
              <Input
                placeholder="Savol matni, masalan: SSL nima uchun ishlatiladi?"
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
                style={{ marginBottom: 10 }}
              />
              <Radio.Group value={draft.correct} onChange={(e) => setDraft((d) => ({ ...d, correct: e.target.value }))} style={{ width: "100%" }}>
                <Row gutter={[10, 8]}>
                  {[0, 1, 2, 3].map((i) => (
                    <Col key={i} span={12}>
                      <Flex gap={8} align="center">
                        <Tooltip title="To'g'ri javob"><Radio value={i} /></Tooltip>
                        <Input
                          size="small"
                          placeholder={`${String.fromCharCode(65 + i)} variant`}
                          value={draft.options[i]}
                          onChange={(e) => setDraft((d) => ({ ...d, options: d.options.map((o, oi) => (oi === i ? e.target.value : o)) }))}
                        />
                      </Flex>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
              <Flex justify="space-between" align="center" style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Chapdagi belgi — to'g'ri javob</Text>
                <Button size="small" icon={<PlusOutlined />} onClick={addDraftQuestion}>Savolni qo'shish</Button>
              </Flex>
            </div>

            <div style={{ marginTop: 14, maxHeight: 220, overflowY: "auto" }}>
              {questions.length === 0 ? (
                <Text type="secondary" style={{ fontSize: 13 }}>Hali savol qo'shilmagan.</Text>
              ) : (
                <List
                  size="small"
                  dataSource={questions}
                  renderItem={(item, i) => (
                    <List.Item
                      style={{ paddingInline: 0 }}
                      actions={[
                        <Button key="d" type="text" size="small" danger icon={<DeleteOutlined />} aria-label="Savolni o'chirish"
                          onClick={() => setQuestions((p) => p.filter((x) => x.id !== item.id))} />,
                      ]}
                    >
                      <List.Item.Meta
                        title={`${i + 1}. ${item.question}`}
                        description={`${item.options.length} variant · to'g'ri: ${item.options[item.correctAnswer]}`}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Col>
        </Row>
      </Modal>
    </div>
  );
}
