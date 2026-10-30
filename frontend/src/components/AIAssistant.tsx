import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar, Badge, Button, Drawer, Flex, FloatButton, Input, Tag, Typography } from "antd";
import { MessageOutlined, RobotOutlined, SendOutlined } from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import { translateLevel } from "@/lib/utils";
import { askGeminiAssistant, hasGeminiApiKey, type AssistantMessage } from "@/lib/geminiAssistant";

const { Text } = Typography;

interface ChatMessage extends AssistantMessage {
  id: number;
}

const starterPrompts = ["Qaysi moduldan boshlay?", "Fuzzy bahoyimni tushuntir", "CIA triadasi nima?"];

export function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "model", text: "Salom! Men CyberAI yordamchisiman. Modul tanlash, mavzuni tushuntirish yoki fuzzy bahoni sharhlashda yordam beraman." },
  ]);
  const nextId = useRef(2);
  const bottomRef = useRef<HTMLDivElement>(null);
  const connected = hasGeminiApiKey();

  const {
    currentUser, userRole, hasCompletedInitialTest, currentLevel, readinessScore, fuzzyMetrics,
    moduleProgress, assignments, lessons,
  } = useAppStore();

  const context = useMemo(() => {
    const completed = moduleProgress.filter((m) => m.completed).map((m) => m.title);
    const unlocked = moduleProgress.filter((m) => m.unlocked).map((m) => m.title);
    const active = assignments
      .filter((a) => userRole === "Teacher" || a.studentId === currentUser?.id)
      .filter((a) => !a.completed)
      .map((a) => a.title);
    return [
      "Platforma konteksti:",
      `Foydalanuvchi: ${currentUser?.name || "Noma'lum"}`,
      `Rol: ${userRole === "Teacher" ? "O'qituvchi" : "O'quvchi"}`,
      `Diagnostika: ${hasCompletedInitialTest ? "ha" : "yo'q"}`,
      `Daraja: ${translateLevel(currentLevel)}`,
      `Tayyorgarlik: ${(readinessScore * 100).toFixed(0)}%`,
      `Bilim: ${(fuzzyMetrics.knowledge * 100).toFixed(0)}%, xatolar: ${(fuzzyMetrics.errors * 100).toFixed(0)}%, tezlik: ${(fuzzyMetrics.speed * 100).toFixed(0)}%`,
      `Ochilgan: ${unlocked.join(", ") || "yo'q"}`,
      `Tugallangan: ${completed.join(", ") || "yo'q"}`,
      `Topshiriqlar: ${active.join(", ") || "yo'q"}`,
      `Darslar: ${lessons.slice(0, 6).map((l) => `${l.title} (${l.difficulty})`).join(", ") || "hali qo'shilmagan"}`,
    ].join("\n");
  }, [assignments, currentLevel, currentUser, fuzzyMetrics, hasCompletedInitialTest, lessons, moduleProgress, readinessScore, userRole]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (prompt: string) => {
    const text = prompt.trim();
    if (!text || loading) return;
    const next = [...messages, { id: nextId.current++, role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const reply = await askGeminiAssistant(next.map(({ role, text: t }) => ({ role, text: t })), context);
      setMessages((cur) => [...cur, { id: nextId.current++, role: "model", text: reply }]);
    } catch (err) {
      setMessages((cur) => [...cur, {
        id: nextId.current++,
        role: "model",
        text: err instanceof Error ? err.message : "AI yordamchi bilan bog'lanishda xatolik yuz berdi.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <FloatButton type="primary" icon={<MessageOutlined />} tooltip="AI yordamchi" onClick={() => setOpen(true)} style={{ insetInlineEnd: 24, insetBlockEnd: 24 }} />
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={420}
        title={
          <Flex align="center" gap={10}>
            <Avatar style={{ background: "#e8f0ff", color: "#2563eb" }} icon={<RobotOutlined />} />
            <Flex vertical>
              <Text strong>AI yordamchi</Text>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 400 }}>
                <Badge status={connected ? "success" : "error"} /> {connected ? "Ulangan" : "API kaliti sozlanmagan"}
              </Text>
            </Flex>
          </Flex>
        }
        styles={{ body: { padding: 16, background: "#f8fafc" } }}
        footer={
          <Flex vertical gap={10}>
            <Flex gap={6} wrap>
              {starterPrompts.map((p) => (
                <Tag key={p} style={{ cursor: loading ? "not-allowed" : "pointer" }} onClick={() => void send(p)}>{p}</Tag>
              ))}
            </Flex>
            <Flex gap={8} align="flex-end">
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Savolingizni yozing..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <Button type="primary" icon={<SendOutlined />} loading={loading} disabled={!input.trim()} onClick={() => void send(input)} aria-label="Yuborish" />
            </Flex>
          </Flex>
        }
      >
        <Flex vertical gap={12}>
          {messages.map((m) => (
            <Flex key={m.id} justify={m.role === "user" ? "flex-end" : "flex-start"}>
              <div
                style={{
                  maxWidth: "85%",
                  padding: "10px 14px",
                  borderRadius: 14,
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.55,
                  fontSize: 14,
                  background: m.role === "user" ? "#2563eb" : "#fff",
                  color: m.role === "user" ? "#fff" : "#0f172a",
                  border: m.role === "user" ? "none" : "1px solid #e5eaf2",
                  borderTopRightRadius: m.role === "user" ? 4 : 14,
                  borderTopLeftRadius: m.role === "user" ? 14 : 4,
                }}
              >
                {m.text}
              </div>
            </Flex>
          ))}
          {loading && <Text type="secondary" style={{ fontSize: 13 }}>Javob tayyorlanmoqda...</Text>}
          <div ref={bottomRef} />
        </Flex>
      </Drawer>
    </>
  );
}
