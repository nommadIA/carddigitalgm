import React, { useEffect, useState, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/ui/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { fetchSettingsSupabase, applySettingsToDOM, AppSettings } from "./lib/settings";
import ThemeSync from './components/ui/ThemeSync';

// Lazy load pages for better performance
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Clients = lazy(() => import('./pages/Clients'));
const Market = lazy(() => import('./pages/Market'));
const Financial = lazy(() => import('./pages/Financial'));
const Expenses = lazy(() => import('./pages/Expenses'));
const Configuracoes = lazy(() => import('./pages/Configuracoes'));
const Notes = lazy(() => import('./pages/Notes'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const PixCopy = lazy(() => import('./pages/PixCopy'));

const PageLoader = () => (
  <div className="w-full h-full flex items-center justify-center min-h-[50vh]">
    <Loader2 size={32} className="animate-spin text-[var(--gm-primary)] opacity-50" />
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, checked } = useAuth();

  if (!checked) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--gm-bg)] text-[var(--gm-primary)]">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PrivateRoutes = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <Layout>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full"
          >
            <Suspense fallback={<PageLoader />}>
              <Routes location={location}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/budgets" element={<Budgets />} />
                <Route path="/clients" element={<Clients />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/market" element={<Market />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/financial" element={<Financial />} />
                <Route path="/configuracoes" element={<Configuracoes />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  );
};

const getRouteKey = (pathname: string) => {
  const base = pathname.split('/')[1];
  if (['login', 'register', 'auth', 'update-password'].includes(base)) {
    return base;
  }
  return 'private';
};

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={getRouteKey(location.pathname)}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full h-full"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            <Route path="/pix" element={<PixCopy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/*" element={<PrivateRoutes />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
};

function BootReady() {
  const { checked, user, tenantId } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    if (!checked) return;

    if (user && tenantId) {
      window.__GM_SPLASH_STATUS__?.("Carregando preferências...");
      fetchSettingsSupabase(tenantId)
        .then((s) => {
          if (s) {
            applySettingsToDOM(s);
            setSettings(s);
          }
        })
        .catch(() => {});

      import('./services/pushFCM')
        .then(({ startPush }) => startPush({ tenantId, userId: user.id }))
        .catch(console.error);
    }

    setTimeout(() => window.__GM_APP_READY__?.(), 500);
  }, [checked, user, tenantId]);

  return <ThemeSync prefs={settings || undefined} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BootReady />
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="min-h-screen w-full"
      >
        <Router>
          <AppRoutes />
        </Router>
      </motion.div>
    </AuthProvider>
  );
}