import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/ui/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import Clients from './pages/Clients';
import Market from './pages/Market';
import Financial from './pages/Financial';
import Expenses from './pages/Expenses';
import Configuracoes from './pages/Configuracoes';
import AuthCallback from './pages/AuthCallback';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { fetchSettingsSupabase, applySettingsToDOM, AppSettings } from "./lib/settings";
import ThemeSync from './components/ui/ThemeSync';

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="w-full h-full"
          >
            <Routes location={location}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/budgets" element={<Budgets />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/market" element={<Market />} />
              <Route path="/financial" element={<Financial />} />
              <Route path="/configuracoes" element={<Configuracoes />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </Layout>
    </ProtectedRoute>
  );
};

const AppRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname.split('/')[1]}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full h-full"
      >
        <Routes location={location}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/*" element={<PrivateRoutes />} />
        </Routes>
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
      fetchSettingsSupabase()
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