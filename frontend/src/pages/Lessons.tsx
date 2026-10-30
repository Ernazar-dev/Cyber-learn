import { useEffect, useMemo, useState } from "react";
import {
  App, Badge, Button, Card, Col, Drawer, Empty, Flex, Form, Input, Modal, Popconfirm, Progress, Radio,
  Row, Segmented, Select, Space, Table, Tabs, Tag, Tooltip, Typography, Upload,
} from "antd";
import type { TableColumnsType } from "antd";
import {
  ArrowLeftOutlined, CheckCircleFilled, CheckOutlined, CloseOutlined, DeleteOutlined, DownloadOutlined,
  ExperimentOutlined, FileTextOutlined, InboxOutlined, LeftOutlined,
  LinkOutlined, PaperClipOutlined, PieChartOutlined,
  PlayCircleOutlined, PlusOutlined, ReadOutlined, RightOutlined,
} from "@ant-design/icons";
import { useAppStore } from "@/store/useAppStore";
import type { Lesson } from "@/store/useAppStore";
import { PageHeader, StatCard, optionalMark } from "@/components/common";
import { modules } from "@/data/curriculum";
import { MODULE_COLORS } from "@/data/moduleTheme";
import { formatFileSize } from "@/lib/utils";
import { API_URL } from "@/lib/api";

const { Text } = Typography;

const CATEGORIES = ["Asoslar", "Tarmoq", "Kriptografiya", "Tizim himoyasi", "Umumiy"];
const DIFFICULTIES = ["Boshlang'ich", "O'rta", "Yuqori"] as const;
const difficultyColor: Record<string, string> = { "Boshlang'ich": "green", "O'rta": "orange", "Yuqori": "red" };

type TypeFilter = "Barchasi" | "Nazariy" | "Amaliy";

const lessonType = (l: Lesson) => l.lessonType ?? "Nazariy";

/** Dars kategoriyasi → modul raqami (curriculum bilan bir xil tartib) */
const CATEGORY_MODULE: Record<string, number> = { Asoslar: 1, Tarmoq: 2, Kriptografiya: 3, "Tizim himoyasi": 4 };

const TOPIC_RE = /^\s*(\d+)\s*[-–—]?\s*mavzu\s*[:.\-–—]?\s*/i;

/** "3-MAVZU: KIBERJINOYATCHILIK ..." → { num: 3, text: "Kiberjinoyatchilik ..." } (faqat ko'rinish uchun) */
function parseTitle(title: string): { num: number | null; text: string } {
  const m = title.match(TOPIC_RE);
  let text = (m ? title.slice(m[0].length) : title).replace(/\s+/g, " ").trim();
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (letters.length > 3 && letters === letters.toUpperCase()) {
    text = text.toLowerCase();
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }
  return { num: m ? Number(m[1]) : null, text: text || title };
}

const categoryOrder = (c: string) => CATEGORY_MODULE[c] ?? 99;

function moduleLabel(category: string) {
  const n = CATEGORY_MODULE[category];
  return n && modules[n] ? `${n}. ${modules[n].title}` : category;
}

function LessonTags({ lesson }: { lesson: Lesson }) {
  return (
    <Flex gap={6} wrap align="center">
      <Tag bordered={false} color={lessonType(lesson) === "Nazariy" ? "blue" : "cyan"}>{lessonType(lesson)}</Tag>
      <Tag bordered={false} color={difficultyColor[lesson.difficulty]}>{lesson.difficulty}</Tag>
      <Tag bordered={false}>{lesson.category}</Tag>
      {lesson.videoUrl && <Tag bordered={false} icon={<PlayCircleOutlined />}>Video</Tag>}
      {lesson.fileUrl && <Tag bordered={false} icon={<PaperClipOutlined />}>Fayl</Tag>}
    </Flex>
  );
}

// ─────────────────────────────────────────────
// TO'LIQ EKRAN DARS KO'RISH OYNASI (FULL-SCREEN LESSON VIEWER)
// ─────────────────────────────────────────────
interface LessonViewerProps {
  lesson: Lesson | null;
  allLessons: Lesson[];
  mode: "student" | "teacher";
  userId: number;
  onClose: () => void;
  onSelectLesson: (l: Lesson) => void;
  onMarkRead?: (lessonId: number) => Promise<void>;
}

function LessonFullScreenViewer({
  lesson,
  allLessons,
  mode,
  userId,
  onClose,
  onSelectLesson,
  onMarkRead,
}: LessonViewerProps) {
  const [sidebarTab, setSidebarTab] = useState<"topics" | "content">("topics");
  const [mainView, setMainView] = useState<"material" | "content">("material");
  const [markingRead, setMarkingRead] = useState(false);

  // Dars almashganda asosiy ko'rinishni moslash
  useEffect(() => {
    if (lesson?.fileUrl) {
      setMainView("material");
    } else {
      setMainView("content");
    }
  }, [lesson?.id, lesson?.fileUrl]);

  // Tartiblangan darslar ro'yxati
  const orderedLessons = useMemo(() => {
    return [...allLessons].sort((a, b) =>
      categoryOrder(a.category) - categoryOrder(b.category) ||
      ((parseTitle(a.title).num ?? 1e9) - (parseTitle(b.title).num ?? 1e9)) ||
      a.id - b.id
    );
  }, [allLessons]);

  if (!lesson) return null;

  const currentIndex = orderedLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

  const isRead = (lesson.readByStudents ?? []).includes(userId);
  const { num, text } = parseTitle(lesson.title);
  const n = CATEGORY_MODULE[lesson.category];
  const moduleColor = n ? MODULE_COLORS[n - 1] : "#2563eb";

  const fileHref = lesson.fileUrl
    ? (lesson.fileUrl.startsWith("http://") || lesson.fileUrl.startsWith("https://")
        ? lesson.fileUrl
        : `${API_URL}${lesson.fileUrl}`)
    : "";

  const fileName = lesson.fileName || lesson.fileUrl?.split("/").pop() || "";
  const fileExt = fileName.toLowerCase().split(".").pop() || "";
  const isPdf = fileExt === "pdf";
  const isVideo = ["mp4", "webm", "mov", "avi"].includes(fileExt);
  const isImage = ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(fileExt);

  // PDF uchun navpanes=0 (chap sahifalar panelini boshlang'ich yopiq qilish) va zoom=120 (120% masshtab)
  const pdfSrc = `${fileHref}#toolbar=1&navpanes=0&zoom=120`;

  const handleMarkRead = async () => {
    if (!onMarkRead || isRead) return;
    setMarkingRead(true);
    try {
      await onMarkRead(lesson.id);
    } finally {
      setMarkingRead(false);
    }
  };

  return (
    <Drawer
      open={!!lesson}
      onClose={onClose}
      width="100%"
      placement="right"
      destroyOnClose
      closable={false}
      className="lesson-fullscreen-drawer"
      styles={{
        body: {
          padding: 0,
          margin: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
        },
        header: { display: "none" },
      }}
    >
      {/* ─── YUQORI PANEL (HEADER) ─── */}
      <div
        style={{
          height: 56,
          minHeight: 56,
          background: "#ffffff",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          gap: 12,
          zIndex: 20,
        }}
      >
        {/* Chap qism: Chiqish + Dars sarlavhasi va teglari */}
        <Flex align="center" gap={12} style={{ minWidth: 0, flex: "1 1 auto" }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={onClose}
            style={{ fontWeight: 500 }}
          >
            Chiqish
          </Button>

          <div style={{ height: 20, width: 1, background: "#e2e8f0" }} />

          <Flex align="center" gap={8} style={{ minWidth: 0, overflow: "hidden" }}>
            <Tag
              bordered={false}
              style={{
                marginInlineEnd: 0,
                color: moduleColor,
                background: `${moduleColor}15`,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {lesson.category}
            </Tag>
            <Text
              strong
              ellipsis
              style={{ fontSize: 15, color: "#0f172a", maxWidth: 460 }}
              title={lesson.title}
            >
              {num ? `${num}-mavzu: ` : ""}{text}
            </Text>
            <Tag bordered={false} color={lessonType(lesson) === "Nazariy" ? "blue" : "cyan"} style={{ marginInlineEnd: 0 }}>
              {lessonType(lesson)}
            </Tag>
            <Tag bordered={false} color={difficultyColor[lesson.difficulty]} style={{ marginInlineEnd: 0 }}>
              {lesson.difficulty}
            </Tag>
          </Flex>
        </Flex>

        {/* O'ng qism: Amallar, Navigatsiya va Sidebar toggle */}
        <Flex align="center" gap={8} style={{ flexShrink: 0 }}>
          {/* Agar ham fayl, ham matn bo'lsa ko'rinishni almashtirish */}
          {lesson.fileUrl && lesson.content && (
            <Segmented
              size="small"
              value={mainView}
              onChange={(v) => setMainView(v as "material" | "content")}
              options={[
                { label: "Material", value: "material", icon: <PaperClipOutlined /> },
                { label: "Matn", value: "content", icon: <FileTextOutlined /> },
              ]}
            />
          )}

          {/* Oldingi va Keyingi dars tugmalari */}
          <Space.Compact size="middle">
            <Tooltip title={prevLesson ? `Oldingi: ${parseTitle(prevLesson.title).text}` : "Oldingi dars yo'q"}>
              <Button
                icon={<LeftOutlined />}
                disabled={!prevLesson}
                onClick={() => prevLesson && onSelectLesson(prevLesson)}
              >
                Oldingi
              </Button>
            </Tooltip>
            <Tooltip title={nextLesson ? `Keyingi: ${parseTitle(nextLesson.title).text}` : "Keyingi dars yo'q"}>
              <Button
                icon={<RightOutlined />}
                iconPosition="end"
                disabled={!nextLesson}
                onClick={() => nextLesson && onSelectLesson(nextLesson)}
              >
                Keyingi
              </Button>
            </Tooltip>
          </Space.Compact>

          {/* O'quvchi uchun: Darsni o'qidim holati */}
          {mode === "student" && (
            isRead ? (
              <Tag
                color="success"
                icon={<CheckCircleFilled />}
                bordered={false}
                style={{ padding: "4px 12px", fontSize: 13, borderRadius: 6, marginInlineEnd: 0, fontWeight: 500 }}
              >
                O'qildi
              </Tag>
            ) : (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={markingRead}
                onClick={handleMarkRead}
                style={{ background: "#10b981", borderColor: "#10b981" }}
              >
                Darsni o'qidim
              </Button>
            )
          )}

          {/* Faylni yuklab olish */}
          {fileHref && (
            <Tooltip title="Faylni yuklab olish">
              <Button
                icon={<DownloadOutlined />}
                href={fileHref}
                download={fileName}
              >
                Yuklab olish
              </Button>
            </Tooltip>
          )}

          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
            aria-label="Yopish"
            style={{ color: "#64748b" }}
          />
        </Flex>
      </div>

      {/* ─── ASOSIY TANA: CHAP PANEL + O'NG MATERIAL QISMI ─── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        {/* CHAP PANEL: Mavzular ro'yxati va Dars tavsifi/matni (ixcham — kichikroq joy oladi) */}
        <div
          style={{
            width: 320,
            minWidth: 290,
            maxWidth: 360,
            background: "#ffffff",
            borderRight: "1px solid #e2e8f0",
            display: "flex",
            flexDirection: "column",
            height: "100%",
            zIndex: 10,
          }}
        >
            <div style={{ padding: "10px 14px", borderBottom: "1px solid #f1f5f9" }}>
              <Segmented
                block
                value={sidebarTab}
                onChange={(v) => setSidebarTab(v as "topics" | "content")}
                options={[
                  { label: `Mavzular (${orderedLessons.length})`, value: "topics", icon: <ReadOutlined /> },
                  { label: "Dars matni", value: "content", icon: <FileTextOutlined /> },
                ]}
              />
            </div>

            {sidebarTab === "topics" ? (
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 0" }}>
                {orderedLessons.map((l) => {
                  const lActive = l.id === lesson.id;
                  const { num: lNum, text: lText } = parseTitle(l.title);
                  const lRead = mode === "student" && (l.readByStudents ?? []).includes(userId);
                  return (
                    <div
                      key={l.id}
                      onClick={() => onSelectLesson(l)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        background: lActive ? "#eff6ff" : "transparent",
                        borderLeft: lActive ? "3px solid #2563eb" : "3px solid transparent",
                        borderBottom: "1px solid #f8fafc",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!lActive) e.currentTarget.style.background = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        if (!lActive) e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <Flex justify="space-between" align="flex-start" gap={8}>
                        <Flex gap={8} align="flex-start" style={{ minWidth: 0, flex: 1 }}>
                          <Text
                            strong
                            style={{
                              color: lActive ? "#2563eb" : "#94a3b8",
                              fontSize: 12.5,
                              minWidth: 20,
                            }}
                          >
                            {lNum ?? "•"}
                          </Text>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text
                              strong={lActive}
                              style={{
                                display: "block",
                                fontSize: 13,
                                color: lActive ? "#1d4ed8" : "#1e293b",
                                lineHeight: 1.4,
                              }}
                              ellipsis
                            >
                              {lText}
                            </Text>
                            <Flex gap={6} align="center" style={{ marginTop: 4 }}>
                              <Tag
                                bordered={false}
                                style={{ fontSize: 11, padding: "0 5px", lineHeight: "18px", margin: 0 }}
                                color={lessonType(l) === "Nazariy" ? "blue" : "cyan"}
                              >
                                {lessonType(l)}
                              </Tag>
                              {l.fileUrl && <PaperClipOutlined style={{ fontSize: 11, color: "#64748b" }} />}
                              {l.videoUrl && <PlayCircleOutlined style={{ fontSize: 11, color: "#2563eb" }} />}
                            </Flex>
                          </div>
                        </Flex>
                        {mode === "student" && (
                          lRead ? (
                            <CheckCircleFilled style={{ color: "#10b981", fontSize: 14, marginTop: 2 }} />
                          ) : (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1", marginTop: 6 }} />
                          )
                        )}
                      </Flex>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                <Flex vertical gap={14}>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      Modul
                    </Text>
                    <div style={{ marginTop: 4 }}>
                      <Tag bordered={false} color={moduleColor} style={{ fontWeight: 600 }}>{moduleLabel(lesson.category)}</Tag>
                    </div>
                  </div>

                  {lesson.description && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        Qisqacha tavsif
                      </Text>
                      <p style={{ margin: "4px 0 0", color: "#334155", fontSize: 13, lineHeight: 1.5 }}>
                        {lesson.description}
                      </p>
                    </div>
                  )}

                  <div>
                    <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                      Dars matni
                    </Text>
                    <div style={{ margin: "6px 0 0", background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: 8, padding: 12 }}>
                      <p className="prose-text" style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                        {lesson.content || "Dars matni mavjud emas."}
                      </p>
                    </div>
                  </div>

                  {lesson.videoUrl && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        Video havola
                      </Text>
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={lesson.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, wordBreak: "break-all", color: "#2563eb" }}
                        >
                          <PlayCircleOutlined /> {lesson.videoUrl}
                        </a>
                      </div>
                    </div>
                  )}

                  {lesson.tags && lesson.tags.length > 0 && (
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.5px" }}>
                        Teglar
                      </Text>
                      <Flex gap={6} wrap style={{ marginTop: 6 }}>
                        {lesson.tags.map((t) => <Tag key={t}>#{t}</Tag>)}
                      </Flex>
                    </div>
                  )}
                </Flex>
              </div>
            )}
          </div>

        {/* O'NG QISM: Asosiy fokus — Material (Katta, to'liq ekran, qulay) */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            background: isPdf && mainView === "material" ? "#1e293b" : "#f8fafc",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {mainView === "material" && lesson.fileUrl ? (
            isPdf ? (
              <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
                <iframe
                  src={pdfSrc}
                  title={fileName}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    display: "block",
                    background: "#1e293b",
                  }}
                />
              </div>
            ) : isVideo ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0b0f19" }}>
                <video
                  controls
                  src={fileHref}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    borderRadius: 12,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                    outline: "none",
                  }}
                />
              </div>
            ) : isImage ? (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "#0b0f19", overflow: "auto" }}>
                <img
                  src={fileHref}
                  alt={fileName}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
                  }}
                />
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
                <Card
                  style={{
                    maxWidth: 520,
                    width: "100%",
                    textAlign: "center",
                    borderRadius: 16,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05)",
                    padding: "24px 16px",
                  }}
                >
                  <div style={{ width: 80, height: 80, borderRadius: 20, background: "#eff6ff", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 36, marginBottom: 16 }}>
                    <FileTextOutlined />
                  </div>
                  <Typography.Title level={4} style={{ margin: "0 0 8px 0" }}>
                    {fileName}
                  </Typography.Title>
                  <Text type="secondary" style={{ display: "block", marginBottom: 24 }}>
                    {lesson.fileSize ? `Fayl hajmi: ${formatFileSize(lesson.fileSize)}` : "Yuklab olish uchun tayyor"}
                  </Text>
                  <Button
                    type="primary"
                    size="large"
                    icon={<DownloadOutlined />}
                    href={fileHref}
                    download={fileName}
                  >
                    Faylni yuklab olish
                  </Button>
                </Card>
              </div>
            )
          ) : (
            /* Matnli dars yoki material bo'lmagan darslar uchun katta o'qish ko'rinishi */
            <div style={{ flex: 1, overflowY: "auto", padding: "36px 40px", background: "#ffffff" }}>
              <div style={{ maxWidth: 860, margin: "0 auto" }}>
                <LessonTags lesson={lesson} />
                <Typography.Title level={2} style={{ marginTop: 14, marginBottom: 8, color: "#0f172a" }}>
                  {num ? `${num}-mavzu: ` : ""}{text}
                </Typography.Title>
                {lesson.description && (
                  <Text type="secondary" style={{ fontSize: 16, display: "block", marginBottom: 24, lineHeight: 1.6 }}>
                    {lesson.description}
                  </Text>
                )}
                {lesson.videoUrl && (
                  <Card size="small" style={{ marginBottom: 24, background: "#eff6ff", borderColor: "#bfdbfe" }}>
                    <Flex gap={12} align="center">
                      <PlayCircleOutlined style={{ color: "#2563eb", fontSize: 24 }} />
                      <div>
                        <Text strong style={{ display: "block" }}>Video darslik havolasi</Text>
                        <a href={lesson.videoUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#2563eb" }}>
                          {lesson.videoUrl}
                        </a>
                      </div>
                    </Flex>
                  </Card>
                )}
                <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: 12, padding: 24, marginBottom: 24 }}>
                  <p className="prose-text" style={{ fontSize: 16, lineHeight: 1.8, margin: 0, maxWidth: "100%" }}>
                    {lesson.content}
                  </p>
                </div>
                {lesson.tags && lesson.tags.length > 0 && (
                  <Flex gap={8} wrap>
                    {lesson.tags.map((t) => <Tag key={t}>#{t}</Tag>)}
                  </Flex>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Drawer>
  );
}


type ReadFilter = "all" | "unread" | "read";

function LessonCatalog({
  lessons,
  mode,
  userId,
  onOpen,
  onDelete,
}: {
  lessons: Lesson[];
  mode: "teacher" | "student";
  userId: number;
  onOpen: (l: Lesson) => void;
  onDelete?: (l: Lesson) => void;
}) {
  const [tab, setTab] = useState<string>("all");
  const [type, setType] = useState<TypeFilter>("Barchasi");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [query, setQuery] = useState("");

  const isRead = (l: Lesson) => l.readByStudents.includes(userId);

  const categories = useMemo(
    () => Array.from(new Set(lessons.map((l) => l.category))).sort((a, b) => categoryOrder(a) - categoryOrder(b) || a.localeCompare(b)),
    [lessons],
  );

  // Mavzu raqami bo'yicha tartiblangan, sarlavhasi tozalangan darslar.
  // Sarlavhada raqam bo'lmasa — modul ichidagi tartib raqami (qo'shilgan ketma-ketlik) ko'rsatiladi.
  const rows = useMemo(() => {
    const sorted = lessons
      .map((l) => ({ lesson: l, ...parseTitle(l.title) }))
      .sort((a, b) =>
        categoryOrder(a.lesson.category) - categoryOrder(b.lesson.category) ||
        (a.num ?? 1e9) - (b.num ?? 1e9) ||
        a.lesson.id - b.lesson.id,
      );
    const pos: Record<string, number> = {};
    return sorted.map((r) => {
      pos[r.lesson.category] = (pos[r.lesson.category] ?? 0) + 1;
      return { ...r, num: r.num ?? pos[r.lesson.category] };
    });
  }, [lessons]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter(({ lesson: l, text }) =>
    (tab === "all" || l.category === tab) &&
    (type === "Barchasi" || lessonType(l) === type) &&
    (difficulty === "all" || l.difficulty === difficulty) &&
    (readFilter === "all" || (readFilter === "read") === isRead(l)) &&
    (!q || text.toLowerCase().includes(q) || l.title.toLowerCase().includes(q) || l.tags.some((t) => t.toLowerCase().includes(q))),
  );

  type Row = (typeof rows)[number];
  const columns: TableColumnsType<Row> = [
    {
      title: "№",
      key: "num",
      width: 60,
      align: "center",
      render: (_, r) => <Text type="secondary" strong>{r.num ?? "—"}</Text>,
    },
    {
      title: "Mavzu",
      key: "title",
      render: (_, r) => (
        <Flex vertical gap={2} style={{ minWidth: 0 }}>
          <Text strong style={{ color: "#0f172a" }}>{r.text}</Text>
          {r.lesson.description && <Text type="secondary" ellipsis style={{ fontSize: 12.5, maxWidth: 560 }}>{r.lesson.description}</Text>}
        </Flex>
      ),
    },
    ...(tab === "all"
      ? [{
          title: "Modul",
          key: "module",
          width: 210,
          render: (_: unknown, r: Row) => {
            const n = CATEGORY_MODULE[r.lesson.category];
            const color = n ? MODULE_COLORS[n - 1] : "#64748b";
            return <Tag bordered={false} style={{ marginInlineEnd: 0, color, background: `${color}14` }}>{moduleLabel(r.lesson.category)}</Tag>;
          },
        }]
      : []),
    {
      title: "Turi",
      key: "type",
      width: 100,
      render: (_, r) => <Tag bordered={false} color={lessonType(r.lesson) === "Nazariy" ? "blue" : "cyan"} style={{ marginInlineEnd: 0 }}>{lessonType(r.lesson)}</Tag>,
    },
    {
      title: "Daraja",
      key: "difficulty",
      width: 120,
      render: (_, r) => <Tag bordered={false} color={difficultyColor[r.lesson.difficulty]} style={{ marginInlineEnd: 0 }}>{r.lesson.difficulty}</Tag>,
    },
    {
      title: "Material",
      key: "material",
      width: 90,
      align: "center",
      render: (_, r) => (
        <Space size={10} style={{ color: "#64748b" }}>
          {r.lesson.fileUrl && <Tooltip title={r.lesson.fileName}><PaperClipOutlined /></Tooltip>}
          {r.lesson.videoUrl && <Tooltip title="Video"><PlayCircleOutlined /></Tooltip>}
          {!r.lesson.fileUrl && !r.lesson.videoUrl && "—"}
        </Space>
      ),
    },
    mode === "student"
      ? {
          title: "Holat",
          key: "read",
          width: 130,
          render: (_, r) => isRead(r.lesson)
            ? <Tag color="success" bordered={false} icon={<CheckCircleFilled />} style={{ marginInlineEnd: 0 }}>O'qildi</Tag>
            : <Text type="secondary" style={{ fontSize: 13, whiteSpace: "nowrap" }}>O'qilmagan</Text>,
        }
      : {
          title: "O'qigan",
          key: "readers",
          width: 90,
          align: "center",
          render: (_, r) => <Text>{r.lesson.readByStudents.length}</Text>,
        },
    ...(mode === "teacher" && onDelete
      ? [{
          title: "",
          key: "actions",
          width: 56,
          render: (_: unknown, r: Row) => (
            <span onClick={(e) => e.stopPropagation()}>
              <Popconfirm
                title="Darsni o'chirasizmi?"
                okText="O'chirish"
                cancelText="Bekor qilish"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(r.lesson)}
              >
                <Button type="text" danger icon={<DeleteOutlined />} aria-label="Darsni o'chirish" />
              </Popconfirm>
            </span>
          ),
        }]
      : []),
  ];

  const countIn = (c: string) => lessons.filter((l) => l.category === c).length;

  return (
    <Card styles={{ body: { padding: 0 } }}>
      <div style={{ padding: "4px 20px 0" }}>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: "all", label: <span>Barchasi <Badge count={lessons.length} color="#94a3b8" overflowCount={999} style={{ marginLeft: 4 }} /></span> },
            ...categories.map((c) => {
              const n = CATEGORY_MODULE[c];
              return {
                key: c,
                label: (
                  <span>
                    {moduleLabel(c)}{" "}
                    <Badge count={countIn(c)} color={n ? MODULE_COLORS[n - 1] : "#94a3b8"} overflowCount={999} style={{ marginLeft: 4 }} />
                  </span>
                ),
              };
            }),
          ]}
          style={{ marginBottom: 0 }}
        />
      </div>

      <Flex gap={12} wrap align="center" style={{ padding: "14px 20px", borderTop: "1px solid #eef2f8", borderBottom: "1px solid #eef2f8", background: "#fafcff" }}>
        <Segmented<TypeFilter> options={["Barchasi", "Nazariy", "Amaliy"]} value={type} onChange={setType} />
        <Select
          value={difficulty}
          onChange={setDifficulty}
          style={{ width: 170 }}
          options={[{ value: "all", label: "Barcha darajalar" }, ...DIFFICULTIES.map((d) => ({ value: d, label: d }))]}
        />
        {mode === "student" && (
          <Select<ReadFilter>
            value={readFilter}
            onChange={setReadFilter}
            style={{ width: 160 }}
            options={[{ value: "all", label: "Hammasi" }, { value: "unread", label: "O'qilmaganlar" }, { value: "read", label: "O'qilganlar" }]}
          />
        )}
        <Input.Search
          placeholder="Mavzu yoki teg bo'yicha qidirish"
          allowClear
          onChange={(e) => setQuery(e.target.value)}
          style={{ flex: "1 1 240px", maxWidth: 360, marginLeft: "auto" }}
        />
      </Flex>

      <Table<Row>
        key={`${tab}|${type}|${difficulty}|${readFilter}|${q}`}
        rowKey={(r) => r.lesson.id}
        columns={columns}
        dataSource={shown}
        size="middle"
        scroll={{ x: 900 }}
        onRow={(r) => ({ onClick: () => onOpen(r.lesson), style: { cursor: "pointer" } })}
        locale={{ emptyText: <Empty description={lessons.length === 0 ? "Hali dars qo'shilmagan" : "Filtr bo'yicha dars topilmadi"} /> }}
        pagination={{ pageSize: 15, hideOnSinglePage: true, showSizeChanger: false, showTotal: (t) => `${t} ta dars`, style: { paddingInline: 20 } }}
      />
    </Card>
  );
}

// ─────────────────────────────────────────────
// TEACHER
// ─────────────────────────────────────────────
interface LessonForm {
  title: string;
  description?: string;
  content: string;
  category: string;
  difficulty: (typeof DIFFICULTIES)[number];
  lessonType: "Nazariy" | "Amaliy";
  videoUrl?: string;
  tags?: string;
}

function uploadFile(
  file: File,
  token: string | null,
  onProgress: (p: number) => void,
): Promise<{ url: string; name: string; size: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const fd = new FormData();
    fd.append("file", file);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(body);
        else reject(new Error(body.error || `HTTP ${xhr.status}`));
      } catch {
        reject(new Error(`HTTP ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Tarmoq xatosi. Backend ishlab turganini tekshiring."));
    xhr.open("POST", `${API_URL}/api/upload`);
    // Yuklash faqat o'qituvchiga ruxsat etilgan (backend: Auth + TeacherOnly)
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(fd);
  });
}

function TeacherView() {
  const { lessons, addLesson, deleteLesson, token } = useAppStore();
  const { message } = App.useApp();
  const [form] = Form.useForm<LessonForm>();
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<number | null>(null);
  const preview = lessons.find((l) => l.id === previewId) ?? null;
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setOpen(false);
    form.resetFields();
    setFile(null);
    setUploadPct(null);
  };

  const submit = async (values: LessonForm) => {
    setSaving(true);
    try {
      let fileData: { url: string; name: string; size: number } | undefined;
      if (file) {
        setUploadPct(0);
        fileData = await uploadFile(file, token, setUploadPct);
      }
      const res = await addLesson({
        title: values.title.trim(),
        description: values.description?.trim() ?? "",
        content: values.content.trim(),
        category: values.category,
        difficulty: values.difficulty,
        lessonType: values.lessonType,
        videoUrl: values.videoUrl?.trim() ?? "",
        tags: (values.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
        fileUrl: fileData?.url,
        fileName: fileData?.name,
        fileSize: fileData?.size,
      });
      if (!res.success) {
        message.error(res.message ?? "Dars saqlanmadi");
        return;
      }
      message.success(`"${values.title}" darsi qo'shildi`);
      close();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "Fayl yuklanmadi");
    } finally {
      setSaving(false);
      setUploadPct(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Darslar"
        subtitle="Kiberxavfsizlik bo'yicha darslar yarating — ular o'quvchilarga darhol ko'rinadi."
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Yangi dars</Button>}
      />

      <Row gutter={[16, 16]}>
        <Col xs={8}><StatCard label="Jami darslar" value={lessons.length} icon={<ReadOutlined />} /></Col>
        <Col xs={8}><StatCard label="Nazariy" value={lessons.filter((l) => lessonType(l) === "Nazariy").length} icon={<FileTextOutlined />} /></Col>
        <Col xs={8}><StatCard label="Amaliy" value={lessons.filter((l) => lessonType(l) === "Amaliy").length} icon={<ExperimentOutlined />} /></Col>
      </Row>

      <LessonCatalog
        lessons={lessons}
        mode="teacher"
        userId={-1}
        onOpen={(l) => setPreviewId(l.id)}
        onDelete={async (l) => {
          const res = await deleteLesson(l.id);
          if (res.success) message.success("Dars o'chirildi");
          else message.error(res.message ?? "Xatolik");
        }}
      />

      <Modal
        title="Yangi dars yaratish"
        open={open}
        onCancel={close}
        onOk={() => form.submit()}
        okText="Darsni saqlash"
        cancelText="Bekor qilish"
        confirmLoading={saving}
        width={1080}
        destroyOnHidden
      >
        <Form<LessonForm>
          form={form}
          layout="vertical"
          requiredMark={optionalMark}
          initialValues={{ category: "Asoslar", difficulty: "Boshlang'ich", lessonType: "Nazariy" }}
          onFinish={submit}
        >
          <Row gutter={24}>
            {/* Chap ustun: dars haqida asosiy ma'lumot */}
            <Col xs={24} md={12}>
              <Form.Item name="lessonType" label="Dars turi" rules={[{ required: true }]}>
                <Radio.Group optionType="button" buttonStyle="solid" options={["Nazariy", "Amaliy"]} />
              </Form.Item>
              <Form.Item name="title" label="Dars nomi" rules={[{ required: true, whitespace: true, message: "Dars nomini kiriting" }]}>
                <Input placeholder="Masalan: Phishing hujumlari va ulardan himoyalanish" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="category" label="Kategoriya" rules={[{ required: true }]}>
                    <Select options={CATEGORIES.map((c) => ({ value: c, label: c }))} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="difficulty" label="Qiyinlik darajasi" rules={[{ required: true }]}>
                    <Select options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="description" label="Qisqacha tavsif">
                <Input.TextArea rows={2} placeholder="Dars haqida qisqacha izoh" />
              </Form.Item>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="videoUrl" label="Video havola" rules={[{ type: "url", message: "To'g'ri havola kiriting" }]}>
                    <Input prefix={<LinkOutlined />} placeholder="https://youtube.com/..." />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tags" label="Teglar" tooltip="Vergul bilan ajrating">
                    <Input placeholder="phishing, xavfsizlik" />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
            {/* O'ng ustun: dars matni va fayl */}
            <Col xs={24} md={12}>
              <Form.Item name="content" label="Dars matni" rules={[{ required: true, whitespace: true, message: "Dars matnini kiriting" }]}>
                <Input.TextArea rows={9} placeholder="Darsning batafsil matni" />
              </Form.Item>
              <Form.Item label="Darslik fayli" tooltip="PDF, PPTX, MP4, ZIP va boshqalar — maksimal 64 MB">
                <Upload.Dragger
                  multiple={false}
                  maxCount={1}
                  accept=".pdf,.ppt,.pptx,.doc,.docx,.xlsx,.xls,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.avi,.zip,.rar,.txt,.md"
                  beforeUpload={(f) => { setFile(f); return false; }}
                  onRemove={() => setFile(null)}
                  fileList={file ? [{ uid: "1", name: file.name, status: "done" }] : []}
                >
                  <p className="ant-upload-text" style={{ margin: 0 }}>
                    <InboxOutlined style={{ color: "#2563eb", marginRight: 8 }} />
                    Faylni shu yerga tashlang yoki bosib tanlang
                  </p>
                  <p className="ant-upload-hint" style={{ margin: "4px 0 0" }}>PDF, PPTX, MP4, ZIP — maksimal 64 MB</p>
                </Upload.Dragger>
                {uploadPct !== null && <Progress percent={uploadPct} size="small" style={{ marginTop: 8 }} />}
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <LessonFullScreenViewer
        lesson={preview}
        allLessons={lessons}
        mode="teacher"
        userId={-1}
        onClose={() => setPreviewId(null)}
        onSelectLesson={(l) => setPreviewId(l.id)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────
// STUDENT
// ─────────────────────────────────────────────
function StudentView() {
  const { lessons, markLessonRead, currentUser } = useAppStore();
  const { message } = App.useApp();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const userId = currentUser?.id ?? -1;

  const readCount = lessons.filter((l) => (l.readByStudents ?? []).includes(userId)).length;
  const selected = lessons.find((l) => l.id === selectedId) ?? null;

  return (
    <div className="page">
      <PageHeader title="Darslar" subtitle="O'qituvchi tayyorlagan nazariy va amaliy darslar." />

      <Row gutter={[16, 16]}>
        <Col xs={8}><StatCard label="Jami darslar" value={lessons.length} icon={<ReadOutlined />} /></Col>
        <Col xs={8}><StatCard label="O'qilgan" value={readCount} icon={<CheckOutlined />} tone="success" /></Col>
        <Col xs={8}>
          <StatCard
            label="Umumiy progress"
            value={`${lessons.length ? Math.round((readCount / lessons.length) * 100) : 0}%`}
            icon={<PieChartOutlined />}
            footer={<Progress percent={lessons.length ? Math.round((readCount / lessons.length) * 100) : 0} showInfo={false} size="small" />}
          />
        </Col>
      </Row>

      <LessonCatalog lessons={lessons} mode="student" userId={userId} onOpen={(l) => setSelectedId(l.id)} />

      <LessonFullScreenViewer
        lesson={selected}
        allLessons={lessons}
        mode="student"
        userId={userId}
        onClose={() => setSelectedId(null)}
        onSelectLesson={(l) => setSelectedId(l.id)}
        onMarkRead={async (id) => {
          const res = await markLessonRead(id);
          if (res.success) {
            message.success("Dars o'qilgan deb belgilandi");
          } else {
            message.error(res.message ?? "Xatolik");
          }
        }}
      />
    </div>
  );
}


export default function Lessons() {
  const { userRole, fetchLessons } = useAppStore();
  useEffect(() => {
    fetchLessons();
  }, [fetchLessons]);
  return userRole === "Teacher" ? <TeacherView /> : <StudentView />;
}
