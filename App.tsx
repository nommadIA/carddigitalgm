import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/ui/Layout';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { fetchSettingsSupabase, applySettingsToDOM, AppSettings } from "./lib/settings";
import { initGlobalUiSoundListener } from "./lib/audio";
import ThemeSync from './components/ui/ThemeSync';
import RouteBoundary from './RouteBoundary';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Budgets from './pages/Budgets';
import Clients from './pages/Clients';
import Market from './pages/Market';
import Financial from './pages/Financial';
import Expenses from './pages/Expenses';
import Configuracoes from './pages/Configuracoes';
import Notes from './pages/Notes';
import Bio from './pages/Bio';
import PublicBio from './pages/PublicBio';
import AuthCallback from './pages/AuthCallback';
import UpdatePassword from './pages/UpdatePassword';
import PixCopy from './pages/PixCopy';
import Plans from './pages/Plans';
import AdminLogin from './pages/AdminLogin';
import AdminUsersManager from './pages/AdminUsersManager';

import DevicePinGate from './components/auth/DevicePinGate';

const PageLoader = () => null;

const BrandedLoader = () => (
  <div className="h-screen w-full bg-[#0B0B0C] flex flex-col items-center justify-center gap-4 text-white select-none">
    <div className="w-12 h-12 rounded-lg bg-[#FE540B] flex items-center justify-center font-black text-[#0B0B0C] text-xl border border-[#FE540B]">
      GM
    </div>
    <div className="flex items-center gap-2.5 text-xs font-bold text-[#CBD5E1]">
      <Loader2 size={16} className="animate-spin text-[#FE540B]" />
      <span>Carregando CardDigital GM...</span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, checked } = useAuth();

  if (!checked) {
    return <BrandedLoader />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <DevicePinGate>{children}</DevicePinGate>;
};

const PrivateRoutes = () => {
  const location = useLocation();

  return (
    <ProtectedRoute>
      <Layout>
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0.96 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.06, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-1 w-full max-w-full gap-4 sm:gap-6 box-border will-change-[opacity]"
        >
          <Suspense fallback={<PageLoader />}>
            <Routes location={location}>
              <Route path="/" element={<RouteBoundary title="Dashboard"><Dashboard /></RouteBoundary>} />
              <Route path="/budgets" element={<RouteBoundary title="Orçamentos"><Budgets /></RouteBoundary>} />
              <Route path="/clients" element={<RouteBoundary title="Clientes"><Clients /></RouteBoundary>} />
              <Route path="/expenses" element={<RouteBoundary title="Despesas"><Expenses /></RouteBoundary>} />
              <Route path="/market" element={<RouteBoundary title="Mercado"><Market /></RouteBoundary>} />
              <Route path="/notes" element={<RouteBoundary title="Anotações"><Notes /></RouteBoundary>} />
              <Route path="/financial" element={<RouteBoundary title="Financeiro"><Financial /></RouteBoundary>} />
              <Route path="/minha-bio" element={<RouteBoundary title="Minha Bio"><Bio /></RouteBoundary>} />
              <Route path="/planos" element={<RouteBoundary title="Planos"><Plans /></RouteBoundary>} />
              <Route path="/admin/usuarios" element={<RouteBoundary title="Gestão de Usuários"><AdminUsersManager /></RouteBoundary>} />
              <Route path="/admin/users" element={<Navigate to="/admin/usuarios" replace />} />
              <Route path="/configuracoes" element={<RouteBoundary title="Configurações"><Configuracoes /></RouteBoundary>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </motion.div>
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
  const { user, checked } = useAuth();

  // Detect if the user is on a mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

  // Custom subdomain detection logic
  const getSubdomainTenantId = () => {
    const hostname = window.location.hostname;
    
    // Ignore common system/development hostnames
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.includes(".run.app") || // AI Studio previews
      hostname === "carddigitalgmapp.netlify.app" ||
      hostname === "carddigitalgm.netlify.app"
    ) {
      return null;
    }

    // If it's a Netlify subdomain (e.g., gmedificacao.netlify.app)
    if (hostname.endsWith(".netlify.app")) {
      const subdomain = hostname.split(".")[0];
      return subdomain;
    }

    // For custom domains (e.g., gmedificacao.com, www.gmedificacao.com, or gmedificacao.carddigitalgm.com.br)
    let cleanHost = hostname;
    if (cleanHost.startsWith("www.")) {
      cleanHost = cleanHost.slice(4);
    }

    const parts = cleanHost.split(".");
    if (parts.length > 0) {
      return parts[0];
    }

    return null;
  };

  const subdomainTenant = getSubdomainTenantId();

  // Wait for auth to be fully initialized before making routing decisions or redirecting
  if (!checked) {
    return <BrandedLoader />;
  }

  // If a user is not logged in and opens the root, redirect directly to the application login page
  if (!user && !subdomainTenant && (location.pathname === '/' || location.pathname === '')) {
    return <Navigate to="/login" replace />;
  }

  // Intercept direct tenant URLs (e.g., /gmedificacao) that are not reserved administrative/auth pages
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const firstSegment = pathSegments[0]?.toLowerCase();
  const reserved = [
    'pix', 'login', 'register', 'bio', 'auth', 'update-password', 
    'budgets', 'clients', 'expenses', 'market', 'notes', 'financial', 
    'minha-bio', 'configuracoes', 'dashboard', 'planos', 'admin'
  ];

  if (firstSegment && !reserved.includes(firstSegment)) {
    return (
      <AnimatePresence>
        <motion.div
          key="public-bio-direct"
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="w-full h-full"
        >
          <Suspense fallback={<PageLoader />}>
            <PublicBio />
          </Suspense>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="w-full min-h-full flex-1 flex flex-col will-change-[opacity]">
      <Suspense fallback={<PageLoader />}>
        <Routes location={location}>
          {subdomainTenant && (
            <Route path="/" element={<PublicBio />} />
          )}
          <Route path="/pix" element={<PixCopy />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/bio/:tenantId" element={<PublicBio />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/update-password" element={<UpdatePassword />} />
          
          {/* Catch-all to PrivateRoutes (matched base is "/") */}
          <Route path="/*" element={<PrivateRoutes />} />
        </Routes>
      </Suspense>
    </div>
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

      if (window.self === window.top) {
        import('./services/pushFCM')
          .then(({ startPush }) => startPush({ tenantId, userId: user.id }))
          .catch((err) => {
            console.warn("[PushFCM] Setup skipped:", err?.message || err);
          });
      }
    }

    const rafId = requestAnimationFrame(() => window.__GM_APP_READY__?.());
    return () => cancelAnimationFrame(rafId);
  }, [checked, user, tenantId]);

  return <ThemeSync prefs={settings || undefined} />;
}

export default function App() {
  useEffect(() => {
    const cleanup = initGlobalUiSoundListener();
    return () => cleanup();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <BootReady />
        <div className="min-h-screen w-full max-w-full overflow-x-hidden">
          <Router>
            <AppRoutes />
          </Router>
        </div>
      </AuthProvider>
    </MotionConfig>
  );
}