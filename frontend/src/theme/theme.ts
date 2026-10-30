import type { ThemeConfig } from "antd";

/**
 * Dizayn tokenlari — yagona manba. Konsepsiya: minimalistik va tartibli —
 * oq yuzalar, tinch ko'k aksent, och kulrang-ko'k fon. Landing bilan bir xil palitra.
 */
export const colors = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primarySoft: "#eff6ff",
  primaryBorder: "#dbeafe",
  success: "#16a34a",
  warning: "#d97706",
  error: "#dc2626",
  text: "#0f172a",
  textSecondary: "#64748b",
  border: "#dfe8f6",
  navy: "#0a2253",
  bg: "#f3f7fd",
  white: "#ffffff",
};

export const fonts = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  display: "'Manrope', 'Inter', system-ui, sans-serif",
};

export const shadows = {
  card: "0 1px 2px rgba(15, 23, 42, 0.04)",
  lift: "0 8px 24px -12px rgba(15, 23, 42, 0.18)",
};

export const theme: ThemeConfig = {
  token: {
    colorPrimary: colors.primary,
    colorInfo: colors.primary,
    colorLink: colors.primary,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorBorder: "#d5e0f0",
    colorBorderSecondary: colors.border,
    colorBgLayout: colors.bg,
    borderRadius: 10,
    borderRadiusLG: 14,
    borderRadiusSM: 6,
    fontFamily: fonts.sans,
    fontSize: 14,
    controlHeight: 40,
    controlHeightLG: 46,
    boxShadow: shadows.card,
    boxShadowSecondary: shadows.lift,
    motionDurationMid: "0.2s",
    motionEaseInOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  },
  components: {
    Layout: {
      siderBg: colors.navy,
      headerBg: colors.white,
      headerHeight: 76,
      headerPadding: "0 32px",
      bodyBg: colors.bg,
    },
    Menu: {
      darkItemBg: "transparent",
      darkSubMenuItemBg: "transparent",
      darkPopupBg: colors.navy,
      darkItemColor: "#c1cedd",
      darkItemHoverColor: "#ffffff",
      darkItemHoverBg: "#ffffff12",
      darkItemSelectedBg: colors.primary,
      darkItemSelectedColor: "#ffffff",
      darkGroupTitleColor: "#92b1e0",
      itemBorderRadius: 8,
      itemMarginInline: 8,
      itemHeight: 40,
      groupTitleFontSize: 10,
      iconSize: 16,
      activeBarBorderWidth: 0,
    },
    Card: { headerFontSize: 16, paddingLG: 22 },
    Typography: { titleMarginTop: 0, titleMarginBottom: 0 },
    Button: { fontWeight: 600, primaryShadow: "none", defaultShadow: "none", dangerShadow: "none" },
    Table: { headerBg: "#f8fafc", headerColor: colors.textSecondary, rowHoverBg: "#f8fafc" },
    Modal: { borderRadiusLG: 16 },
    Input: { activeShadow: "0 0 0 3px rgba(37, 99, 235, 0.12)" },
    Select: { optionSelectedBg: colors.primarySoft },
    Tabs: { titleFontSize: 14, inkBarColor: colors.primary },
    Statistic: { contentFontSize: 28 },
    Segmented: { itemSelectedColor: colors.primary },
  },
};
