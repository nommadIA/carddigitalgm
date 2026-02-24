
import React, { useEffect, useState, PropsWithChildren } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/ui/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import Clients from './pages/Clients';
import Market from './pages/Market';
import AIHub from './pages/AIHub';
import Financial from './pages/Financial';
import Expenses from './pages/Expenses';
import Configuracoes from './pages/Configuracoes';
import AuthCallback from './pages/AuthCallback';
import { Loader2 } from 'lucide-react';
import { fetchSettingsSupabase, applySettingsToDOM, AppSettings } from "./lib/settings";
import ThemeSync from './components/ui/ThemeSync';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, checked, isAdmin } = useAuth();

  if (!checked) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[var(--gm-bg)] text-[var(--gm-primary)]">
        <Loader2 size={40} className="animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Componente extraído para corrigir erro de tipagem "children missing" no elemento da Rota
const PrivateRoutes = () => {
  return (
    <ProtectedRoute>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/market" element={<Market />} />
          <Route path="/ai-hub" element={<AIHub />} />
          <Route path="/financial" element={<Financial />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      <Route
        path="/*"
        element={<PrivateRoutes />}
      />
    </Routes>
  );
};

function BootReady() {
  const { checked, user, tenantId } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    // 1. Inicializa Tema
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) {
      document.documentElement.setAttribute("data-theme", savedTheme);
    }

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

      // Iniciar Push Notifications
      import('./services/pushFCM').then(({ startPush }) => {
        startPush(tenantId, user.id);
      }).catch(console.error);
    }

    setTimeout(() => {
      window.__GM_APP_READY__?.();
    }, 500);
  }, [checked, user, tenantId]);

  return <ThemeSync prefs={settings || undefined} />;
}

function App() {
  return (
    <AuthProvider>
      <BootReady />
      {/* Container principal */}
      <div className="min-h-screen w-full">
        <Router>
          <AppRoutes />
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;