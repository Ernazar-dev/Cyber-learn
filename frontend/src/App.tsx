import { Suspense, lazy, useEffect, useState } from "react";
import { Redirect, Route, Switch, Router as WouterRouter, useParams } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as AntApp, Flex, Spin } from "antd";
import { useAppStore } from "@/store/useAppStore";
import { registerNotify } from "@/lib/notify";
import { directions } from "@/data/curriculum";
import { AppLayout } from "@/components/AppLayout";
import { AIAssistant } from "@/components/AIAssistant";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import NotFound from "@/pages/not-found";
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Directions = lazy(() => import("@/pages/Directions"));
const DirectionDetail = lazy(() => import("@/pages/DirectionDetail"));
const Diagnostic = lazy(() => import("@/pages/Diagnostic"));
const ModuleDetail = lazy(() => import("@/pages/ModuleDetail"));
const Lessons = lazy(() => import("@/pages/Lessons"));
const CTF = lazy(() => import("@/pages/CTF"));
const Certificate = lazy(() => import("@/pages/Certificate"));
const Assignments = lazy(() => import("@/pages/Assignments"));
const Students = lazy(() => import("@/pages/Students"));
const StudentDetail = lazy(() => import("@/pages/StudentDetail"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const Rankings = lazy(() => import("@/pages/Rankings"));
const News = lazy(() => import("@/pages/News"));
const AIEngine = lazy(() => import("@/pages/AIEngine"));
const LabsPage = lazy(() => import("@/labs/LabsPage"));
const CryptoLabPage = lazy(() => import("@/labs/CryptoLabPage"));

const queryClient = new QueryClient();
const DEFAULT_DIRECTION = `/learning/${directions[0].id}`;

function NotifyBridge() {
  const { message, notification } = AntApp.useApp();
  useEffect(() => registerNotify(message, notification), [message, notification]);
  return null;
}

function LegacyModuleRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Redirect to={`${DEFAULT_DIRECTION}/module/${id}`} replace />;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />

      {/* Ta'lim: yo'nalish → modul → nazariya / test / CTF */}
      <Route path="/learning" component={Directions} />
      <Route path="/learning/:directionId" component={DirectionDetail} />
      <Route path="/learning/:directionId/diagnostic" component={Diagnostic} />
      <Route path="/learning/:directionId/module/:moduleId" component={ModuleDetail} />

      <Route path="/lessons" component={Lessons} />
      <Route path="/ctf" component={CTF} />
      <Route path="/labs" component={LabsPage} />
      <Route path="/labs/crypto" component={CryptoLabPage} />
      <Route path="/certificate" component={Certificate} />
      <Route path="/assignments" component={Assignments} />
      <Route path="/students" component={Students} />
      <Route path="/students/:id" component={StudentDetail} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/rankings" component={Rankings} />
      <Route path="/news" component={News} />
      <Route path="/ai-engine" component={AIEngine} />

      {/* Eski manzillar */}
      <Route path="/modules"><Redirect to={DEFAULT_DIRECTION} replace /></Route>
      <Route path="/assessment"><Redirect to={`${DEFAULT_DIRECTION}/diagnostic`} replace /></Route>
      <Route path="/module/:id" component={LegacyModuleRedirect} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const { currentUser, token, verifySession } = useAppStore();
  const [verifying, setVerifying] = useState(!!token);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    if (!token) {
      setVerifying(false);
      return;
    }
    verifySession().finally(() => setVerifying(false));
    // Only re-run when the persisted token identity changes, not on every store update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <NotifyBridge />
      {verifying ? (
        <Flex align="center" justify="center" style={{ minHeight: "100dvh" }}>
          <Spin size="large" />
        </Flex>
      ) : !currentUser ? (
        showAuth ? (
          <AuthPage onBack={() => setShowAuth(false)} />
        ) : (
          <Landing onGetStarted={() => setShowAuth(true)} />
        )
      ) : (
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppLayout>
            {/* Sahifalar alohida bo'laklarda yuklanadi (lazy) — birinchi ochilish tezroq */}
            <Suspense fallback={<Flex justify="center" style={{ padding: 80 }}><Spin /></Flex>}>
              <Routes />
            </Suspense>
          </AppLayout>
          <AIAssistant />
        </WouterRouter>
      )}
    </QueryClientProvider>
  );
}
