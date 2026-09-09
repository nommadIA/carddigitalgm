import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import Layout from './components/ui/Layout';
import { motion, AnimatePresence } from 'framer-motion';
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

const PageLoader = () => null;

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, checked } = useAuth();

  if (!checked) {
    return <div className="h-screen w-full bg-[var(--gm-bg)]" />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const PrivateRoutes = () => {
  const location = useLocation();
  return (
    <ProtectedRoute>
      <Layout>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={{ duration: 0.16, ease: [0.32, 0.72, 0, 1] }}
            className="w-full min-h-full flex-1 flex flex-col"
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
                <Route path="/configuracoes" element={<RouteBoundary title="Configurações"><Configuracoes /></RouteBoundary>} />
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
    return <div className="h-screen w-full bg-[#050507]" />;
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
    'minha-bio', 'configuracoes', 'dashboard'
  ];

  if (firstSegment && !reserved.includes(firstSegment)) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="public-bio-direct"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
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
    <AnimatePresence mode="wait">
      <motion.div
        key={getRouteKey(location.pathname)}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="w-full min-h-full flex-1 flex flex-col"
      >
        <Suspense fallback={<PageLoader />}>
          <Routes location={location}>
            {subdomainTenant && (
              <Route path="/" element={<PublicBio />} />
            )}
            <Route path="/pix" element={<PixCopy />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/bio/:tenantId" element={<PublicBio />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/update-password" element={<UpdatePassword />} />
            
            {/* Catch-all to PrivateRoutes (matched base is "/") */}
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

      if (window.self === window.top) {
        import('./services/pushFCM')
          .then(({ startPush }) => startPush({ tenantId, userId: user.id }))
          .catch(console.error);
      }
    }

    setTimeout(() => window.__GM_APP_READY__?.(), 500);
  }, [checked, user, tenantId]);

  return <ThemeSync prefs={settings || undefined} />;
}

export default function App() {
  useEffect(() => {
    const cleanup = initGlobalUiSoundListener();
    return () => cleanup();
  }, []);

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