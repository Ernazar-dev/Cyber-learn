import { useState } from "react";
import { App, Button, Card, Flex, Form, Input, Tabs, Typography } from "antd";
import {
  ArrowLeftOutlined, IdcardOutlined, LockOutlined, LoginOutlined, UserAddOutlined, UserOutlined,
} from "@ant-design/icons";
import { BrandLogo } from "@/components/common";
import { useAppStore } from "@/store/useAppStore";

const { Title } = Typography;

interface AuthPageProps {
  onBack?: () => void;
}

export default function AuthPage({ onBack }: AuthPageProps) {
  const { loginUser, registerStudent } = useAppStore();
  const { message } = App.useApp();
  const [action, setAction] = useState<"login" | "register">("login");
  const [submitting, setSubmitting] = useState(false);

  const onLogin = async (v: { username: string; password: string }) => {
    setSubmitting(true);
    try {
      const res = await loginUser(v.username.trim(), v.password);
      if (res.success) message.success("Xush kelibsiz!");
      else message.error(res.message ?? "Login yoki parol noto'g'ri");
    } finally {
      setSubmitting(false);
    }
  };

  const onRegister = async (v: { name: string; username: string; password: string }) => {
    setSubmitting(true);
    try {
      const res = await registerStudent(v.name.trim(), v.username.trim().toLowerCase(), v.password);
      if (res.success) message.success("Profil yaratildi. Xush kelibsiz!");
      else message.error(res.message ?? "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  };

  const loginForm = (
    <Form className="auth-form" layout="vertical" requiredMark={false} onFinish={onLogin}>
      <Form.Item name="username" label="Login" rules={[{ required: true, whitespace: true, message: "Loginni kiriting" }]}>
        <Input size="large" prefix={<UserOutlined />} placeholder="Login" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" label="Parol" rules={[{ required: true, message: "Parolni kiriting" }]}>
        <Input.Password size="large" prefix={<LockOutlined />} placeholder="Parol" autoComplete="current-password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={submitting} icon={<LoginOutlined />}>
        Kirish
      </Button>
    </Form>
  );

  const registerForm = (
    <Form className="auth-form" layout="vertical" requiredMark={false} onFinish={onRegister}>
      <Form.Item name="name" label="To'liq ism" rules={[{ required: true, whitespace: true, min: 2, message: "Ism va familiyangizni kiriting" }]}>
        <Input size="large" prefix={<IdcardOutlined />} placeholder="Ism va familiya" autoComplete="name" />
      </Form.Item>
      <Form.Item
        name="username"
        label="Login"
        rules={[
          { required: true, whitespace: true, message: "Login tanlang" },
          { min: 4, max: 64, message: "Login kamida 4 belgidan iborat bo'lsin" },
        ]}
      >
        <Input size="large" prefix={<UserOutlined />} placeholder="Kamida 4 belgi" autoComplete="username" />
      </Form.Item>
      <Form.Item name="password" label="Parol" rules={[{ required: true, min: 8, message: "Parol kamida 8 belgidan iborat bo'lsin" }]}>
        <Input.Password size="large" prefix={<LockOutlined />} placeholder="Kamida 8 belgi" autoComplete="new-password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={submitting} icon={<UserAddOutlined />}>
        Ro'yxatdan o'tish
      </Button>
    </Form>
  );

  return (
    <Flex align="center" justify="center" style={{ minHeight: "100dvh", background: "#f4f7fc", padding: "24px 16px" }}>
      <Flex vertical gap={12} style={{ width: "100%", maxWidth: 420 }}>
        {onBack && (
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={onBack} style={{ alignSelf: "flex-start", paddingInline: 0, height: "auto" }}>
            Bosh sahifaga qaytish
          </Button>
        )}

        <Card className="animate-scale-in" styles={{ body: { padding: "24px 28px 28px" } }}>
          <Flex vertical align="center" gap={10}>
            <BrandLogo size={48} />
            <Title level={3} style={{ margin: 0, fontWeight: 800 }}>
              {action === "login" ? "Tizimga kirish" : "Ro'yxatdan o'tish"}
            </Title>
          </Flex>
          <Tabs
            centered
            activeKey={action}
            onChange={(k) => setAction(k as "login" | "register")}
            items={[{ key: "login", label: "Kirish" }, { key: "register", label: "Ro'yxatdan o'tish" }]}
            style={{ marginTop: 8 }}
          />
          {action === "login" ? loginForm : registerForm}
        </Card>
      </Flex>
    </Flex>
  );
}
