import React, { useEffect, useState, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
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
const Bio = lazy(() => import('./pages/Bio'));
const PublicBio = lazy(() => import('./pages/PublicBio'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const UpdatePassword = lazy(() => import('./pages/UpdatePassword'));
const PixCopy = lazy(() => import('./pages/PixCopy'));

const PageLoader = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-transparent z-[99999]">
    <Loader2 className="w-8 h-8 animate-spin text-[var(--gm-primary)]" />
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
                <Route path="/minha-bio" element={<Bio />} />
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
    const isLight = localStorage.getItem("theme") === "light";
    return (
      <div className={`h-screen w-full flex items-center justify-center ${isLight ? "bg-[#F8FAFC] text-slate-800" : "bg-[#050507] text-white"}`}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--gm-primary)]" />
          <span className={`text-xs font-medium ${isLight ? "text-slate-500" : "text-zinc-500"}`}>Carregando...</span>
        </div>
      </div>
    );
  }

  // If a mobile user is not logged in and opens the root, redirect directly to the public bio page
  if (isMobile && !user && !subdomainTenant && (location.pathname === '/' || location.pathname === '')) {
    return <Navigate to="/gmedificacao" replace />;
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
        className="w-full h-full"
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