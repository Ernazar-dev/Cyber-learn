import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Col, Empty, Flex, Input, Result, Row, Segmented, Select, Skeleton, Tag, Typography } from "antd";
import { ClockCircleOutlined, ExportOutlined, NotificationOutlined } from "@ant-design/icons";
import api from "@/lib/api";
import { PageHeader } from "@/components/common";

const { Text, Paragraph, Title } = Typography;

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  source: string;
  publishedAt: string;
  category: string;
  language?: "uz" | "en";
};

type LangFilter = "Barchasi" | "O'zbekcha" | "Xalqaro";

const CATEGORIES = ["Ransomware", "Data Breach", "Phishing", "Malware", "Hacking", "Umumiy"];
const categoryColor: Record<string, string> = {
  Ransomware: "red", "Data Breach": "purple", Phishing: "orange", Malware: "volcano", Hacking: "blue", Umumiy: "default",
};

type TimeRange = "Barchasi" | "Bugun" | "Shu hafta";

function timeAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "hozirgina";
  if (mins < 60) return `${mins} daqiqa oldin`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} soat oldin`;
  return `${Math.floor(hours / 24)} kun oldin`;
}

function Cover({ src, alt, height }: { src: string; alt: string; height: number }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <Flex align="center" justify="center" style={{ height, background: "#f1f5fb", color: "#9fb1cc", fontSize: 32 }}>
        <NotificationOutlined />
      </Flex>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      style={{ width: "100%", height, objectFit: "cover", display: "block", background: "#f1f5fb" }}
    />
  );
}

function Meta({ a }: { a: NewsArticle }) {
  return (
    <Flex justify="space-between" align="center" gap={8} wrap>
      <Flex gap={6}>
        <Tag bordered={false} color={categoryColor[a.category] ?? "default"} style={{ marginInlineEnd: 0 }}>{a.category}</Tag>
        {a.language === "uz" && <Tag bordered={false} color="cyan" style={{ marginInlineEnd: 0 }}>UZ</Tag>}
      </Flex>
      <Text type="secondary" style={{ fontSize: 12 }}><ClockCircleOutlined /> {timeAgo(a.publishedAt)}</Text>
    </Flex>
  );
}

export default function News() {
  const [category, setCategory] = useState("all");
  const [time, setTime] = useState<TimeRange>("Barchasi");
  const [search, setSearch] = useState("");
  const [lang, setLang] = useState<LangFilter>("Barchasi");
  const [source, setSource] = useState("all");
  // "Bugun / Shu hafta" filtri uchun vaqt nuqtasi — sahifa ochilgan payt
  const [now] = useState(() => Date.now());

  const { data, isLoading, isError } = useQuery({
    queryKey: ["news"],
    queryFn: () => api.get<NewsArticle[]>("/api/news"),
    staleTime: 15 * 60 * 1000,
  });

  const sources = useMemo(() => Array.from(new Set((data ?? []).map((a) => a.source))).sort(), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((a) => {
      const age = now - new Date(a.publishedAt).getTime();
      return (
        (lang === "Barchasi" || (lang === "O'zbekcha" ? a.language === "uz" : a.language !== "uz")) &&
        (source === "all" || a.source === source) &&
        (category === "all" || a.category === category) &&
        (time === "Barchasi" || (time === "Bugun" ? age <= 864e5 : age <= 7 * 864e5)) &&
        (!q || a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q))
      );
    });
  }, [data, category, time, search, lang, source, now]);

  const [featured, ...rest] = filtered;

  return (
    <div className="page">
      <PageHeader title="Yangiliklar" subtitle="Kiberxavfsizlik sohasidagi so'nggi voqealar va tahdidlar." />

      <Card styles={{ body: { padding: 14 } }}>
        <Flex gap={12} wrap align="center">
          <Segmented<LangFilter> options={["Barchasi", "O'zbekcha", "Xalqaro"]} value={lang} onChange={setLang} />
          <Select
            value={source}
            onChange={setSource}
            style={{ minWidth: 180 }}
            options={[{ value: "all", label: "Barcha manbalar" }, ...sources.map((s) => ({ value: s, label: s }))]}
          />
          <Select
            value={category}
            onChange={setCategory}
            style={{ minWidth: 170 }}
            options={[{ value: "all", label: "Barcha turlar" }, ...CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <Segmented<TimeRange> options={["Barchasi", "Bugun", "Shu hafta"]} value={time} onChange={setTime} />
          <Input.Search allowClear placeholder="Yangiliklardan qidirish" onChange={(e) => setSearch(e.target.value)} style={{ flex: "1 1 220px", maxWidth: 320, marginLeft: "auto" }} />
        </Flex>
      </Card>

      {isLoading ? (
        <Row gutter={[16, 16]} className="stagger">
          {[0, 1, 2, 3, 4, 5].map((i) => <Col key={i} xs={24} md={12} xl={8}><Card><Skeleton active /></Card></Col>)}
        </Row>
      ) : isError || !data || data.length === 0 ? (
        <Card><Result status="warning" title="Yangiliklarni yuklab bo'lmadi" subTitle="Birozdan so'ng qayta urinib ko'ring." /></Card>
      ) : filtered.length === 0 ? (
        <Card><Empty description="Filtr bo'yicha yangilik topilmadi" /></Card>
      ) : (
        <>
          <a href={featured.url} target="_blank" rel="noopener noreferrer">
            <Card className="hover-card" styles={{ body: { padding: 0 } }} style={{ overflow: "hidden" }}>
              <Row>
                <Col xs={24} md={12}><Cover src={featured.imageUrl} alt={featured.title} height={280} /></Col>
                <Col xs={24} md={12}>
                  <Flex vertical gap={12} justify="center" style={{ padding: 24, height: "100%" }}>
                    <Meta a={featured} />
                    <Title level={4} style={{ fontWeight: 600 }}>{featured.title}</Title>
                    {featured.description && <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ marginBottom: 0 }}>{featured.description}</Paragraph>}
                    <Flex justify="space-between" align="center">
                      <Text type="secondary" style={{ fontSize: 12 }}>{featured.source}</Text>
                      <Text style={{ color: "#2563eb" }}>To'liq o'qish <ExportOutlined /></Text>
                    </Flex>
                  </Flex>
                </Col>
              </Row>
            </Card>
          </a>

          <Row gutter={[16, 16]} className="stagger">
            {rest.map((a, i) => (
              <Col key={a.url + i} xs={24} md={12} xl={8}>
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", height: "100%" }}>
                  <Card className="hover-card" cover={<Cover src={a.imageUrl} alt={a.title} height={160} />} styles={{ body: { padding: 16 } }}>
                    <Flex vertical gap={8}>
                      <Meta a={a} />
                      <Paragraph strong ellipsis={{ rows: 2 }} style={{ marginBottom: 0, fontSize: 15 }}>{a.title}</Paragraph>
                      {a.description && <Paragraph type="secondary" ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>{a.description}</Paragraph>}
                      <Text type="secondary" style={{ fontSize: 12 }}>{a.source}</Text>
                    </Flex>
                  </Card>
                </a>
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}
