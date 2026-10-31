import { useMemo, useState, type ReactNode } from "react";
import { useLocation } from "wouter";
import { Avatar, Button, Drawer, Dropdown, Grid, Layout, Menu, Progress, Tooltip } from "antd";
import type { MenuProps } from "antd";
import {
  AppstoreOutlined, BarChartOutlined, DownOutlined, ExperimentOutlined, FlagOutlined, FormOutlined,
  HomeOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, NotificationOutlined, ReadOutlined,
  RobotOutlined, SafetyCertificateOutlined, TeamOutlined, TrophyOutlined,
} from "@ant-design/icons";
import { BrandLogo } from "@/components/common";
import { useAppStore } from "@/store/useAppStore";
import { translateLevel } from "@/lib/utils";

const { Sider, Header, Content } = Layout;

const SIDER_WIDTH = 256;
const SIDER_COLLAPSED = 80;
const COLLAPSE_KEY = "cyberai-sidebar-collapsed";

type Role = "Student" | "Teacher";

interface NavItem {
  key: string;
  label: string;
  icon: ReactNode;
  roles?: Role[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    label: "Asosiy",
    items: [{ key: "/", label: "Bosh sahifa", icon: <HomeOutlined /> }],
  },
  {
    label: "Ta'lim",
    items: [
      { key: "/learning", label: "Ta'lim yo'nalishlari", icon: <AppstoreOutlined /> },
      { key: "/lessons", label: "Darslar", icon: <ReadOutlined /> },
      { key: "/ctf", label: "CTF mashqlari", icon: <FlagOutlined /> },
      { key: "/labs", label: "Laboratoriya", icon: <ExperimentOutlined />, roles: ["Student"] },
      { key: "/certificate", label: "Sertifikatlar", icon: <SafetyCertificateOutlined />, roles: ["Student"] },
    ],
  },
  {
    label: "Boshqaruv",
    items: [
      { key: "/students", label: "O'quvchilar", icon: <TeamOutlined />, roles: ["Teacher"] },
      { key: "/assignments", label: "Topshiriqlar", icon: <FormOutlined />, roles: ["Teacher"] },
    ],
  },
  {
    label: "Natijalar",
    items: [
      { key: "/analytics", label: "Analitika", icon: <BarChartOutlined /> },
      { key: "/rankings", label: "Reyting", icon: <TrophyOutlined /> },
    ],
  },
  {
    label: "Boshqa",
    items: [
      { key: "/ai-engine", label: "AI dvigateli", icon: <RobotOutlined /> },
      { key: "/news", label: "Yangiliklar", icon: <NotificationOutlined /> },
    ],
  },
];

const ALL_ITEMS = NAV.flatMap((g) => g.items);

function selectedKeyFor(location: string) {
  if (location === "/") return "/";
  const match = ALL_ITEMS.map((i) => i.key).filter((k) => k !== "/" && location.startsWith(k)).sort((a, b) => b.length - a.length)[0];
  return match ?? "/";
}

const initials = (name?: string) =>
  (name ?? "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("") || "?";

function Sidebar({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  const { userRole, currentLevel, readinessScore, hasCompletedInitialTest, logoutUser } = useAppStore();
  const [location, setLocation] = useLocation();
  const cabinet = userRole === "Teacher" ? "O'qituvchi kabineti" : "O'quvchi kabineti";

  const items: MenuProps["items"] = useMemo(() => {
    const groups = NAV.map((group) => ({ ...group, items: group.items.filter((i) => !i.roles || i.roles.includes(userRole)) })).filter((g) => g.items.length);
    // Yig'ilgan holatda guruh sarlavhalari o'rniga ajratuvchi chiziq
    const res: NonNullable<MenuProps["items"]> = [];
    groups.forEach((g, gi) => {
      if (compact) {
        if (gi > 0) res.push({ type: "divider", key: `d-${g.label}` });
        g.items.forEach((i) => res.push({ key: i.key, icon: i.icon, label: i.label }));
      } else {
        res.push({
          type: "group",
          key: g.label,
          label: g.label,
          children: g.items.map((i) => ({ key: i.key, icon: i.icon, label: i.label })),
        });
      }
    });
    return res;
  }, [userRole, compact]);

  return (
    <div className={`workspace-sidebar-inner${compact ? " is-compact" : ""}`}>
      <div className="workspace-brand">
        <BrandLogo size={36} />
        {!compact && (
          <span className="workspace-brand-copy">
            <strong>CyberAI</strong>
            <span>{cabinet}</span>
          </span>
        )}
      </div>

      <nav aria-label="Kabinet navigatsiyasi" className="workspace-navigation">
        <Menu
          theme="dark"
          mode="inline"
          inlineCollapsed={compact}
          selectedKeys={[selectedKeyFor(location)]}
          items={items}
          onClick={({ key }) => {
            setLocation(key);
            onNavigate?.();
          }}
        />
      </nav>

      {!(userRole === "Student" && compact) && (
      <div className="workspace-sidebar-bottom">
        {userRole === "Student" && (
          <div className="workspace-readiness">
            <div className="workspace-readiness-row">
              <span>Tayyorgarlik</span>
              <strong>{hasCompletedInitialTest ? translateLevel(currentLevel) : "Aniqlanmagan"}</strong>
            </div>
            <Progress percent={Math.round(readinessScore * 100)} size="small" strokeColor="#60a5fa" trailColor="#ffffff1f" format={(p) => <span style={{ color: "#dbeafe" }}>{p}%</span>} />
          </div>
        )}
        {/* O'quvchida sidebar sig'ishi uchun chiqish faqat profil menyusida (yuqori o'ng) */}
        {userRole !== "Student" && (
          <Tooltip title={compact ? "Tizimdan chiqish" : ""} placement="right">
            <button type="button" className="workspace-side-link" onClick={logoutUser}>
              <LogoutOutlined />
              {!compact && <span>Tizimdan chiqish</span>}
            </button>
          </Tooltip>
        )}
      </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { currentUser, logoutUser, userRole } = useAppStore();
  const [location] = useLocation();
  const screens = Grid.useBreakpoint();
  const isDesktop = !!screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === "true"; } catch { return false; }
  });

  const title = ALL_ITEMS.find((i) => i.key === selectedKeyFor(location))?.label ?? "Bosh sahifa";
  const roleLabel = userRole === "Teacher" ? "O'qituvchi" : "O'quvchi";
  const cabinet = userRole === "Teacher" ? "O'qituvchi kabineti" : "O'quvchi kabineti";
  const siderWidth = collapsed ? SIDER_COLLAPSED : SIDER_WIDTH;

  const toggleMenu = () => {
    if (!isDesktop) {
      setDrawerOpen(true);
      return;
    }
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* ixtiyoriy sozlama */ }
  };

  const userMenu: MenuProps = {
    items: [{ key: "logout", danger: true, icon: <LogoutOutlined />, label: "Tizimdan chiqish" }],
    onClick: ({ key }) => {
      if (key === "logout") logoutUser();
    },
  };

  return (
    <Layout className="workspace">
      {isDesktop && (
        <Sider className="workspace-sidebar" width={SIDER_WIDTH} collapsedWidth={SIDER_COLLAPSED} collapsed={collapsed} trigger={null}>
          <Sidebar compact={collapsed} />
        </Sider>
      )}

      {!isDesktop && (
        <Drawer
          className="workspace-drawer"
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={280}
          closable={false}
          styles={{ body: { padding: 0 } }}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} />
        </Drawer>
      )}

      <Layout className="workspace-main" style={{ marginLeft: isDesktop ? siderWidth : 0 }}>
        <Header className="workspace-header">
          <div className="workspace-header-left">
            <Button
              type="text"
              className="workspace-icon-button"
              onClick={toggleMenu}
              aria-label={!isDesktop ? "Menyuni ochish" : collapsed ? "Menyuni kengaytirish" : "Menyuni yig'ish"}
              icon={collapsed || !isDesktop ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <div className="workspace-breadcrumb">
              <span>{cabinet}</span>
              <span aria-hidden="true">/</span>
              <strong>{title}</strong>
            </div>
          </div>

          <Dropdown menu={userMenu} trigger={["click"]} placement="bottomRight">
            <button type="button" className="workspace-account" aria-label="Profil menyusi">
              <Avatar size={36}>{initials(currentUser?.name)}</Avatar>
              <span className="workspace-account-copy">
                <strong>{currentUser?.name}</strong>
                <span>{roleLabel}</span>
              </span>
              <DownOutlined className="workspace-account-arrow" />
            </button>
          </Dropdown>
        </Header>

        <Content className="workspace-content">
          <div key={location} className="workspace-page">
            {children}
          </div>
        </Content>

        <footer className="workspace-footer">
          <span>© {new Date().getFullYear()} · CyberAI o'quv platformasi</span>
          <span>{cabinet}</span>
        </footer>
      </Layout>
    </Layout>
  );
}
