import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { App, Avatar, Button, Card, Col, Flex, Form, Input, Modal, Popconfirm, Result, Row, Skeleton, Tag, Typography } from "antd";
import { CheckCircleOutlined, DeleteOutlined, ExperimentOutlined, FormOutlined, KeyOutlined, UserOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { ModuleRadarChart } from "@/components/ModuleRadarChart";
import { LevelTag, PageHeader, StatCard, percent } from "@/components/common";

const { Text } = Typography;

export default function StudentDetail() {
  const [, params] = useRoute("/students/:id");
  const id = params?.id ? Number(params.id) : null;
  const { students, userRole, fetchStudents, deleteStudent, setStudentCredentials } = useAppStore();
  const [, setLocation] = useLocation();
  const { message } = App.useApp();
  const [credForm] = Form.useForm<{ username: string; password: string }>();
  const [credOpen, setCredOpen] = useState(false);
  const [savingCred, setSavingCred] = useState(false);

  useEffect(() => {
    if (userRole === "Teacher") fetchStudents();
  }, [userRole, fetchStudents]);

  if (userRole !== "Teacher") {
    return <Result status="403" title="Bu sahifa faqat o'qituvchilar uchun" />;
  }

  const student = students.find((s) => s.id === id);
  const crumbs = [{ title: "O'quvchilar", href: "/students" }, { title: student?.name ?? "..." }];

  if (!student) {
    return (
      <div className="page">
        <PageHeader crumbs={crumbs} title="O'quvchi" />
        <Card><Skeleton active /></Card>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        crumbs={crumbs}
        title={
          <Flex align="center" gap={12}>
            <Avatar size={44} style={{ background: "#e8f0ff", color: "#2563eb" }} icon={<UserOutlined />} />
            {student.name}
          </Flex>
        }
        subtitle={
          <Flex gap={8} align="center" wrap style={{ marginTop: 4 }}>
            <Text type="secondary">{student.username ? `Login: @${student.username}` : "Login yo'q"}</Text>
            <LevelTag level={student.level} />
            {student.hasPassword === false && <Tag color="warning" bordered={false}>Parol o'rnatilmagan</Tag>}
          </Flex>
        }
        extra={
          <>
          <Button icon={<KeyOutlined />} onClick={() => { credForm.setFieldsValue({ username: student.username ?? "", password: "" }); setCredOpen(true); }}>
            Login va parol
          </Button>
          <Popconfirm
            title={`${student.name}ni o'chirasizmi?`}
            description="Bu amalni ortga qaytarib bo'lmaydi."
            okText="O'chirish"
            cancelText="Bekor qilish"
            okButtonProps={{ danger: true }}
            onConfirm={async () => {
              const res = await deleteStudent(student.id);
              if (res.success) {
                message.success("O'quvchi o'chirildi");
                setLocation("/students");
              } else {
                message.error(res.message ?? "Xatolik");
              }
            }}
          >
            <Button danger icon={<DeleteOutlined />}>O'chirish</Button>
          </Popconfirm>
          </>
        }
      />

      <Modal
        title="Login va parol"
        open={credOpen}
        onCancel={() => setCredOpen(false)}
        onOk={() => credForm.submit()}
        okText="Saqlash"
        cancelText="Bekor qilish"
        confirmLoading={savingCred}
        destroyOnHidden
      >
        <Form
          form={credForm}
          layout="vertical"
          requiredMark={false}
          onFinish={async (v: { username: string; password: string }) => {
            setSavingCred(true);
            const res = await setStudentCredentials(student.id, v.password, v.username.trim().toLowerCase());
            setSavingCred(false);
            if (res.success) {
              message.success("Login va parol saqlandi. Ularni o'quvchiga xavfsiz yo'l bilan yetkazing.");
              setCredOpen(false);
            } else {
              message.error(res.message ?? "Xatolik");
            }
          }}
        >
          <Form.Item
            name="username"
            label="Login"
            rules={[
              { required: true, whitespace: true, message: "Login kiriting" },
              { min: 4, max: 64, message: "Login kamida 4 belgidan iborat bo'lsin" },
            ]}
          >
            <Input prefix={<UserOutlined />} autoComplete="off" placeholder="Kamida 4 belgi" />
          </Form.Item>
          <Form.Item name="password" label="Yangi parol" rules={[{ required: true, min: 8, message: "Parol kamida 8 belgidan iborat bo'lsin" }]}>
            <Input.Password prefix={<KeyOutlined />} autoComplete="new-password" placeholder="Kamida 8 belgi" />
          </Form.Item>
        </Form>
      </Modal>

      <Row gutter={[16, 16]} className="stagger">
        <Col xs={24} sm={8}><StatCard label="Fuzzy tayyorgarlik" value={percent(student.fuzzyScore)} icon={<ExperimentOutlined />} /></Col>
        <Col xs={24} sm={8}><StatCard label="Diagnostika testi" value={percent(student.diagnosticScore)} icon={<FormOutlined />} /></Col>
        <Col xs={24} sm={8}><StatCard label="Tugatilgan modullar" value={`${student.completedModulesCount} ta`} icon={<CheckCircleOutlined />} tone="success" /></Col>
      </Row>

      <Card title="Modullar bo'yicha ko'rsatkich" extra={<Text type="secondary">Har bir modul testidan olingan ball</Text>}>
        <ModuleRadarChart moduleProgress={student.moduleProgress} />
      </Card>
    </div>
  );
}
