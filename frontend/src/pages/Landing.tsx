import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Col, Drawer, Flex, Grid, Progress, Row, Tag, Typography } from "antd";
import {
  ArrowRightOutlined, BarChartOutlined, BookOutlined, CheckCircleFilled, CheckCircleOutlined, ClockCircleOutlined,
  CloseCircleOutlined, ExperimentOutlined, FlagOutlined, FormOutlined, LockOutlined, MenuOutlined, NotificationOutlined,
  PlayCircleFilled, ReadOutlined, SafetyCertificateOutlined, TeamOutlined, TrophyOutlined,
  UnlockOutlined, UserOutlined,
} from "@ant-design/icons";
import { BrandLogo, IconTile } from "@/components/common";
import { Reveal } from "@/components/motion";
import { directions, modules } from "@/data/curriculum";
import heroBg from "@/images/hero-bg.jpg";

const { Title, Text, Paragraph } = Typography;

interface LandingProps {
  onGetStarted: () => void;
}

const features = [
  { icon: <ExperimentOutlined />, title: "Daraja diagnostikasi", text: "Bilim, xato va tezlik ko'rsatkichlaringiz tahlil qilinib, darajangiz aniqlanadi." },
  { icon: <BookOutlined />, title: "Bosqichli modullar", text: "Har bir modul avvalgisi yakunlanganda ochiladi — o'z sur'atingizda o'rganasiz." },
  { icon: <FlagOutlined />, title: "CTF mashqlari", text: "Amaliy flag topish topshiriqlari orqali ko'nikmalaringizni sinab ko'ring." },
  { icon: <FormOutlined />, title: "Topshiriqlar", text: "O'qituvchi yuborgan nazariy va amaliy topshiriqlarni bajaring." },
  { icon: <TrophyOutlined />, title: "Reyting", text: "Boshqa o'quvchilar orasidagi o'rningizni kuzatib boring." },
  { icon: <SafetyCertificateOutlined />, title: "Sertifikatlar", text: "Har bir modulni tugatgach, shaxsiy sertifikatni yuklab oling." },
  { icon: <BarChartOutlined />, title: "O'qituvchi analitikasi", text: "Guruh va har bir o'quvchining rivojlanishini real vaqtda kuzatish." },
  { icon: <NotificationOutlined />, title: "Kiber yangiliklar", text: "Sohadagi so'nggi voqealar va tahdidlar lentasi." },
];

const steps = [
  { n: "01", title: "Yo'nalishni tanlang", text: "Ta'lim yo'nalishiga kiring — modullar va ularning tarkibi bilan tanishing." },
  { n: "02", title: "Darajangizni aniqlang", text: "Xohlasangiz diagnostika testini topshiring: tizim sizga mos modullarni ochadi." },
  { n: "03", title: "O'rganing va sertifikat oling", text: "Nazariya, o'qituvchi topshiriqlari va CTF mashqlarini bosqichma-bosqich yakunlang." },
];

const scenarios = [
  { name: "Sardor Y.", knowledge: 28, errors: 62, speed: 71, score: 0.31, level: "Boshlang'ich", color: "#d97706" },
  { name: "Madina K.", knowledge: 58, errors: 34, speed: 46, score: 0.63, level: "O'rta", color: "#2563eb" },
  { name: "Jasur N.", knowledge: 87, errors: 9, speed: 21, score: 0.89, level: "Yuqori", color: "#16a34a" },
];

const terminalLines = [
  { kind: "cmd", text: "nmap -sV 10.10.14.7" },
  { kind: "out", text: "22/tcp open  ssh   OpenSSH 8.9" },
  { kind: "out", text: "80/tcp open  http  nginx 1.18" },
  { kind: "cmd", text: "curl http://10.10.14.7/robots.txt" },
  { kind: "out", text: "Disallow: /secret-backup/" },
  { kind: "cmd", text: "cat secret-backup/flag.txt" },
  { kind: "flag", text: "flag{d4raj4ngizni_s1nang}" },
] as const;

const NAV = [
  { href: "#imkoniyatlar", label: "Imkoniyatlar" },
  { href: "#qanday-ishlaydi", label: "Qanday ishlaydi" },
  { href: "#modullar", label: "Modullar" },
];

const LIGHT_BG = "#f5f9ff";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function SectionHead({ eyebrow, title, text, align = "center" }: { eyebrow: string; title: string; text: string; align?: "center" | "left" }) {
  const centered = align === "center";
  return (
    <Reveal>
      <Flex vertical align={centered ? "center" : "flex-start"} gap={12} style={{ textAlign: align, maxWidth: 640, margin: centered ? "0 auto 48px" : "0 0 32px" }}>
        <Text style={{ color: "#2563eb", fontWeight: 600, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase" }}>{eyebrow}</Text>
        <Title level={2} style={{ margin: 0, fontWeight: 800, fontSize: "clamp(28px, 3.2vw, 38px)", lineHeight: 1.2, color: "#0f172a" }}>{title}</Title>
        <Text style={{ fontSize: 17, lineHeight: 1.65, color: "#64748b" }}>{text}</Text>
      </Flex>
    </Reveal>
  );
}

/** Hero'dan keyingi bo'limlar: bir xil vertikal bo'shliq va o'qishga qulay kenglik (1200px) */
function Section({ id, bg = "#fff", children }: { id?: string; bg?: string; children: ReactNode }) {
  return (
    <section id={id} className="landing-block" style={{ background: bg }}>
      <div className="landing-section">
        <div className="landing-inner">{children}</div>
      </div>
    </section>
  );
}

function FuzzyDemoCard() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % scenarios.length), 3400);
    return () => clearInterval(id);
  }, []);
  const s = scenarios[i];

  return (
    <Card style={{ width: "100%", maxWidth: 440, boxShadow: "0 24px 48px -28px rgba(37, 99, 235, 0.35)" }} styles={{ body: { padding: 24 } }}>
      <Flex vertical gap={16}>
        <Flex justify="space-between" align="center">
          <Text type="secondary" style={{ fontSize: 13 }}>Diagnostika natijasi</Text>
          <Tag bordered={false} color="blue" style={{ marginInlineEnd: 0 }}>{s.name}</Tag>
        </Flex>
        {[
          { label: "Bilim darajasi", value: s.knowledge },
          { label: "Xatolar", value: s.errors },
          { label: "Bajarish tezligi", value: s.speed },
        ].map((m) => (
          <div key={m.label}>
            <Flex justify="space-between"><Text style={{ fontSize: 13 }}>{m.label}</Text><Text type="secondary" style={{ fontSize: 13 }}>{m.value}%</Text></Flex>
            <Progress percent={m.value} showInfo={false} size="small" strokeColor={s.color} />
          </div>
        ))}
        <Flex justify="space-between" align="center" style={{ background: LIGHT_BG, border: "1px solid #e3ecff", borderRadius: 12, padding: "12px 14px" }}>
          <Flex vertical>
            <Text type="secondary" style={{ fontSize: 12 }}>Tizim xulosasi</Text>
            <Text strong style={{ color: s.color, transition: "color .3s" }}>Daraja: {s.level}</Text>
          </Flex>
          <Text strong style={{ fontSize: 26, color: s.color, transition: "color .3s" }}>{s.score.toFixed(2)}</Text>
        </Flex>
        <Flex justify="center" gap={6}>
          {scenarios.map((x, idx) => (
            <span key={x.name} style={{ width: idx === i ? 18 : 6, height: 6, borderRadius: 3, background: idx === i ? "#2563eb" : "#cbd5e1", transition: "width .3s" }} />
          ))}
        </Flex>
      </Flex>
    </Card>
  );
}

function TerminalDemo() {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const done = shown >= terminalLines.length;
    const id = setTimeout(() => setShown(done ? 0 : shown + 1), done ? 3200 : 750);
    return () => clearTimeout(id);
  }, [shown]);

  return (
    <div style={{ width: "100%", maxWidth: 520, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 24px 48px -28px rgba(15, 23, 42, 0.25)", overflow: "hidden" }}>
      <Flex align="center" gap={8} style={{ padding: "12px 16px", borderBottom: "1px solid #eef2f7", background: "#f8fafc" }}>
        {["#f87171", "#fbbf24", "#34d399"].map((c) => <span key={c} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />)}
        <Text type="secondary" style={{ marginLeft: 8, fontSize: 12, fontFamily: MONO }}>ctf — web-01</Text>
      </Flex>
      <div style={{ padding: "18px 20px", minHeight: 236, fontFamily: MONO, fontSize: 13.5, lineHeight: 1.9 }}>
        {terminalLines.slice(0, shown).map((l, idx) => (
          <div key={idx} className="animate-fade-up" style={{ animationDuration: ".35s" }}>
            {l.kind === "cmd" && <><span style={{ color: "#2563eb" }}>$ </span><span style={{ color: "#0f172a" }}>{l.text}</span></>}
            {l.kind === "out" && <span style={{ color: "#64748b" }}>{l.text}</span>}
            {l.kind === "flag" && (
              <span style={{ color: "#16a34a", fontWeight: 600, background: "#ecfdf3", borderRadius: 6, padding: "2px 8px" }}>
                <CheckCircleFilled style={{ marginRight: 6 }} />{l.text}
              </span>
            )}
          </div>
        ))}
        {shown < terminalLines.length && <span className="terminal-caret" style={{ color: "#2563eb" }}>▍</span>}
      </div>
    </div>
  );
}

export default function Landing({ onGetStarted }: LandingProps) {
  const screens = Grid.useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);
  const direction = directions[0];

  return (
    <div style={{ minHeight: "100dvh", background: "#fff" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #eef1f6" }}>
        <Flex className="landing-section landing-nav" justify="space-between" align="center" style={{ height: 64 }}>
          <Flex align="center" gap={10}>
            <BrandLogo size={36} />
            <Text strong style={{ fontSize: 17 }}>CyberAI</Text>
          </Flex>
          {screens.md ? (
            <Flex align="center" gap={28}>
              {NAV.map((n) => <a key={n.href} href={n.href} className="link-underline" style={{ color: "#475569" }}>{n.label}</a>)}
              <Button type="primary" onClick={() => onGetStarted()}>Kirish</Button>
            </Flex>
          ) : (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setMenuOpen(true)} aria-label="Menyu" />
          )}
        </Flex>
      </header>

      <Drawer open={menuOpen} onClose={() => setMenuOpen(false)} placement="right" width={280} title="CyberAI">
        <Flex vertical gap={16}>
          {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} style={{ color: "#334155", fontSize: 16 }}>{n.label}</a>)}
          <Button block type="primary" onClick={() => onGetStarted()}>Kirish</Button>
        </Flex>
      </Drawer>

      {/* Hero — fon rasmi kontent chegarasi ichida, ikki chetdagi bo'sh joy teng */}
      <section style={{ minHeight: screens.md ? "calc(100dvh - 64px)" : undefined, display: "flex", alignItems: "center", background: "#fff", padding: screens.md ? "32px 0" : "40px 0 48px" }}>
        <div className="landing-section" style={{ position: "relative" }}>
          {screens.md && (
            <div
              aria-hidden
              className="animate-scale-in"
              style={{
                position: "absolute", top: 0, bottom: 0, right: "var(--landing-gutter)", width: "58%", borderRadius: 28, overflow: "hidden",
                backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "right center",
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.75) 14%, rgba(255,255,255,0) 42%)" }} />
            </div>
          )}
          <Flex vertical gap={24} style={{ position: "relative", maxWidth: 560, padding: screens.md ? "clamp(40px, 8vh, 96px) 0" : 0 }}>
            <span
              className="animate-fade-up"
              style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 999, padding: "6px 14px", background: "#eaf2ff", color: "#2563eb", fontSize: 14, fontWeight: 500 }}
            >
              <SafetyCertificateOutlined /> Har bir o'quvchi uchun
            </span>
            <Title className="animate-fade-up" style={{ margin: 0, fontSize: "clamp(38px, 4.6vw, 62px)", lineHeight: 1.05, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", animationDelay: "100ms" }}>
              Kiberxavfsizlikni o'z darajangizdan boshlang
            </Title>
            <Paragraph className="animate-fade-up" style={{ margin: 0, fontSize: 18, lineHeight: 1.6, color: "#475569", maxWidth: 460, animationDelay: "200ms" }}>
              Tizim bilimingiz, xatolaringiz va tezligingizni tahlil qilib, sizga mos modullarni ochadi.
            </Paragraph>
            <Flex gap={16} wrap className="animate-fade-up" style={{ animationDelay: "300ms" }}>
              <Button type="primary" size="large" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => onGetStarted()} style={{ height: 56, paddingInline: 32, fontSize: 16 }}>
                Bepul boshlash
              </Button>
              <Button size="large" href="#qanday-ishlaydi" icon={<PlayCircleFilled />} style={{ height: 56, paddingInline: 32, fontSize: 16, color: "#2563eb", borderColor: "#2563eb", background: "#fff" }}>
                Qanday ishlaydi
              </Button>
            </Flex>
            <Text className="animate-fade-up" style={{ color: "#64748b", fontSize: 14, animationDelay: "400ms" }}>
              Ro'yxatdan o'tish 1 daqiqa &nbsp;•&nbsp; Har modul uchun sertifikat
            </Text>
          </Flex>
          {!screens.md && (
            <div aria-hidden style={{ marginTop: 36, aspectRatio: "981 / 666", borderRadius: 20, backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center", boxShadow: "0 20px 40px -24px rgba(15,23,42,.35)" }} />
          )}
        </div>
      </section>

      {/* Imkoniyatlar */}
      <Section id="imkoniyatlar" bg={LIGHT_BG}>
        <SectionHead eyebrow="Imkoniyatlar" title="Platformaning to'liq funksionalligi" text="O'quvchilar va o'qituvchilar uchun barcha vositalar bitta joyda." />
        <Row gutter={[20, 20]}>
          {features.map((f, i) => (
            <Col key={f.title} xs={24} sm={12} lg={6}>
              <Reveal delay={i * 60} style={{ height: "100%" }}>
                <Card className="lift" style={{ height: "100%" }} styles={{ body: { padding: 24 } }}>
                  <Flex vertical gap={14}>
                    <IconTile icon={f.icon} size={44} />
                    <Text strong style={{ fontSize: 16, color: "#0f172a" }}>{f.title}</Text>
                    <Text style={{ fontSize: 14, lineHeight: 1.6, color: "#64748b" }}>{f.text}</Text>
                  </Flex>
                </Card>
              </Reveal>
            </Col>
          ))}
        </Row>
      </Section>

      {/* Diagnostika demosi */}
      <Section>
        <Row gutter={[64, 40]} align="middle">
          <Col xs={24} lg={12}>
            <SectionHead align="left" eyebrow="Daraja diagnostikasi" title="Tizim sizni qanday baholaydi" text="Diagnostika testidan so'ng uchta ko'rsatkich birgalikda tahlil qilinadi va sizga mos daraja aniqlanadi." />
            <Flex vertical gap={20}>
              {[
                { icon: <ReadOutlined />, title: "Bilim", text: "To'g'ri javoblar ulushi — mavzularni qanchalik bilishingiz." },
                { icon: <CloseCircleOutlined />, title: "Xatolar", text: "Qayerda adashayotganingiz — qaysi mavzuga ko'proq e'tibor kerak." },
                { icon: <ClockCircleOutlined />, title: "Tezlik", text: "Savollarga qanchalik ishonch bilan va tez javob berishingiz." },
              ].map((m, i) => (
                <Reveal key={m.title} delay={i * 80}>
                  <Flex gap={16} align="flex-start">
                    <IconTile icon={m.icon} size={44} />
                    <Flex vertical gap={4}>
                      <Text strong style={{ fontSize: 16, color: "#0f172a" }}>{m.title}</Text>
                      <Text style={{ fontSize: 15, lineHeight: 1.6, color: "#64748b" }}>{m.text}</Text>
                    </Flex>
                  </Flex>
                </Reveal>
              ))}
            </Flex>
          </Col>
          <Col xs={24} lg={12}>
            <Flex justify="center"><FuzzyDemoCard /></Flex>
          </Col>
        </Row>
      </Section>

      {/* Qanday ishlaydi */}
      <Section id="qanday-ishlaydi" bg={LIGHT_BG}>
        <SectionHead eyebrow="Jarayon" title="Qanday ishlaydi" text="Uchta aniq bosqich — yo'nalishdan sertifikatgacha." />
        <Row gutter={[24, 40]} style={{ position: "relative" }}>
          {screens.md && <div aria-hidden style={{ position: "absolute", top: 28, left: "17%", right: "17%", borderTop: "2px dashed #c7d7f5" }} />}
          {steps.map((s, i) => (
            <Col key={s.n} xs={24} md={8}>
              <Reveal delay={i * 100}>
                <Flex vertical align="center" gap={14} style={{ textAlign: "center", position: "relative" }}>
                  <span style={{ width: 56, height: 56, borderRadius: 999, background: "#fff", border: "2px solid #2563eb", color: "#2563eb", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
                    {s.n}
                  </span>
                  <Text strong style={{ fontSize: 18, color: "#0f172a" }}>{s.title}</Text>
                  <Text style={{ maxWidth: 300, fontSize: 15, lineHeight: 1.6, color: "#64748b" }}>{s.text}</Text>
                </Flex>
              </Reveal>
            </Col>
          ))}
        </Row>
      </Section>

      {/* Modullar — yo'l xaritasi */}
      <Section id="modullar">
        <SectionHead eyebrow={direction.title} title="O'quv yo'l xaritasi" text="Har bir modulda nazariya, o'qituvchi topshiriqlari va CTF mashqlari bor. Keyingi modul oldingisi tugagach ochiladi." />
        <Flex vertical style={{ maxWidth: 780, margin: "0 auto" }}>
          {direction.moduleIds.map((id, idx) => {
            const open = idx === 0;
            const last = idx === direction.moduleIds.length - 1;
            return (
              <Reveal key={id} delay={idx * 90}>
                <Flex gap={20} align="stretch">
                  <Flex vertical align="center" style={{ width: 44, flexShrink: 0 }}>
                    <span style={{ width: 44, height: 44, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, background: open ? "#2563eb" : "#fff", color: open ? "#fff" : "#94a3b8", border: open ? "none" : "2px solid #dbe4f3" }}>
                      {idx + 1}
                    </span>
                    {!last && <span style={{ flex: 1, width: 2, background: "#dbe4f3", margin: "6px 0" }} />}
                  </Flex>
                  <Card style={{ flex: 1, marginBottom: last ? 0 : 16 }} styles={{ body: { padding: "20px 24px" } }}>
                    <Flex justify="space-between" align="flex-start" gap={12} wrap>
                      <Flex vertical gap={6} style={{ flex: 1, minWidth: 220 }}>
                        <Text strong style={{ fontSize: 16, color: "#0f172a" }}>{modules[id].title}</Text>
                        <Text style={{ fontSize: 14, lineHeight: 1.6, color: "#64748b" }}>{modules[id].summary}</Text>
                      </Flex>
                      {open ? (
                        <Tag bordered={false} color="success" icon={<UnlockOutlined />} style={{ marginInlineEnd: 0 }}>Ochiq</Tag>
                      ) : (
                        <Tag bordered={false} icon={<LockOutlined />} style={{ marginInlineEnd: 0, color: "#64748b" }}>Yopiq</Tag>
                      )}
                    </Flex>
                  </Card>
                </Flex>
              </Reveal>
            );
          })}
        </Flex>
      </Section>

      {/* CTF */}
      <Section bg={LIGHT_BG}>
        <Row gutter={[64, 40]} align="middle">
          <Col xs={24} lg={12}>
            <SectionHead align="left" eyebrow="CTF mashqlari" title="Bilimingizni amalda sinang" text="Nazariyani o'qish yetarli emas. CTF topshiriqlarida tizimdagi zaiflikni topib, yashirin flagni qo'lga kiritasiz." />
            <Flex vertical gap={12} style={{ marginBottom: 28 }}>
              {["Har bir modul uchun alohida mashqlar", "Flag topilgach ball va reytingga qo'shiladi", "Qiyinchilik darajangizga mos topshiriqlar"].map((t) => (
                <Text key={t} style={{ fontSize: 15, color: "#334155" }}><CheckCircleOutlined style={{ color: "#16a34a", marginRight: 10 }} />{t}</Text>
              ))}
            </Flex>
            <Button type="primary" size="large" icon={<FlagOutlined />} onClick={() => onGetStarted()} style={{ height: 48, paddingInline: 24 }}>Mashqlarni boshlash</Button>
          </Col>
          <Col xs={24} lg={12}>
            <Flex justify="center"><TerminalDemo /></Flex>
          </Col>
        </Row>
      </Section>

      {/* Kimlar uchun */}
      <Section>
        <SectionHead eyebrow="Kimlar uchun" title="O'quvchi va o'qituvchi uchun bitta platforma" text="Har bir rol uchun kerakli vositalar tayyor." />
        <Row gutter={[24, 24]}>
          {[
            { key: "student", icon: <UserOutlined />, title: "O'quvchilar uchun", cta: "O'quvchi sifatida boshlash", items: ["Ixtiyoriy diagnostika va shaxsiy tahlil", "Bosqichma-bosqich ochiladigan modullar", "CTF mashqlari va AI yordamchi", "Reyting va sertifikatlar"] },
            { key: "teacher", icon: <TeamOutlined />, title: "O'qituvchilar uchun", cta: "O'qituvchi sifatida kirish", items: ["Guruh bo'yicha real vaqtli analitika", "Har bir o'quvchi rivojlanish grafigi", "Nazariy va amaliy topshiriqlar", "Diagnostika parametrlarini sozlash"] },
          ].map((a, i) => (
            <Col key={a.key} xs={24} md={12}>
              <Reveal delay={i * 100} style={{ height: "100%" }}>
                <Card className="lift" style={{ height: "100%", background: LIGHT_BG, borderColor: "#e3ecff" }} styles={{ body: { padding: 32 } }}>
                  <Flex vertical gap={18}>
                    <Flex align="center" gap={14}>
                      <IconTile icon={a.icon} size={48} />
                      <Title level={4} style={{ fontWeight: 700, margin: 0, color: "#0f172a" }}>{a.title}</Title>
                    </Flex>
                    <Flex vertical gap={12}>
                      {a.items.map((t) => <Text key={t} style={{ fontSize: 15, color: "#334155" }}><CheckCircleOutlined style={{ color: "#16a34a", marginRight: 10 }} />{t}</Text>)}
                    </Flex>
                    <Button type="link" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => onGetStarted()} style={{ alignSelf: "flex-start", paddingInline: 0, fontWeight: 600 }}>
                      {a.cta}
                    </Button>
                  </Flex>
                </Card>
              </Reveal>
            </Col>
          ))}
        </Row>
      </Section>

      {/* Footer */}
      <footer style={{ background: "#fff", borderTop: "1px solid #e8eef8" }}>
        <div className="landing-section">
          <div className="landing-inner">
            <Row gutter={[40, 36]} style={{ padding: "56px 0 40px" }}>
              <Col xs={24} lg={9}>
                <Flex vertical gap={16} align="flex-start">
                  <Flex align="center" gap={10}>
                    <BrandLogo size={36} />
                    <Text strong style={{ fontSize: 17 }}>CyberAI</Text>
                  </Flex>
                  <Text style={{ maxWidth: 320, fontSize: 14, lineHeight: 1.65, color: "#64748b" }}>
                    Har bir o'quvchiga moslashadigan kiberxavfsizlik o'quv platformasi.
                  </Text>
                  <Button type="primary" icon={<ArrowRightOutlined />} iconPosition="end" onClick={() => onGetStarted()}>Bepul boshlash</Button>
                </Flex>
              </Col>
              {[
                { title: "Platforma", links: NAV.map((n) => ({ label: n.label, href: n.href })) },
                { title: "Modullar", links: direction.moduleIds.map((id) => ({ label: modules[id].title, href: "#modullar" })) },
                { title: "Imkoniyatlar", links: ["Diagnostika", "CTF mashqlari", "Reyting", "Sertifikatlar"].map((label) => ({ label, href: "#imkoniyatlar" })) },
              ].map((col) => (
                <Col key={col.title} xs={12} sm={8} lg={5}>
                  <Flex vertical gap={12}>
                    <Text style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "#0f172a" }}>{col.title}</Text>
                    {col.links.map((l) => (
                      <a key={l.label} href={l.href} className="link-underline" style={{ color: "#64748b", fontSize: 14, alignSelf: "flex-start" }}>{l.label}</a>
                    ))}
                  </Flex>
                </Col>
              ))}
            </Row>
            <Flex justify="space-between" align="center" wrap gap={8} style={{ borderTop: "1px solid #eef1f6", padding: "20px 0 28px" }}>
              <Text style={{ fontSize: 13, color: "#94a3b8" }}>© 2026 CyberAI. Barcha huquqlar himoyalangan.</Text>
              <a href="#" style={{ color: "#64748b", fontSize: 13 }}>Yuqoriga ↑</a>
            </Flex>
          </div>
        </div>
      </footer>
    </div>
  );
}
