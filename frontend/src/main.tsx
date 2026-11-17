import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, AppShell, Group, Drawer, Burger, Box, Center, Loader } from '@mantine/core'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { theme } from './theme'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardView } from './components/DashboardView'
import { TopHeader } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { ForgotPasswordPage } from './components/ForgotPasswordPage'
import { PageWrapper } from './components/PageWrapper'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute, StrictAdminRoute, AuditViewRoute } from './components/RoleRoute'
import { PoliciesPage } from './components/PoliciesPage'
import { PolicyReportsPage } from './components/PolicyReportsPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useState, useEffect } from 'react'
import { Linkedin } from 'lucide-react'
import { Notifications } from '@mantine/notifications'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import { limitDateYearInput } from './utils/dateInputLimit'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'
import './index.css'

// Heavy pages are lazy-loaded so the initial bundle stays small.
const StaffDirectoryPage = lazy(() => import('./components/StaffDirectoryPage').then((m) => ({ default: m.StaffDirectoryPage })))
const StaffProfilePage = lazy(() => import('./components/StaffProfilePage').then((m) => ({ default: m.StaffProfilePage })))
const CoursesPage = lazy(() => import('./components/CoursesPage').then((m) => ({ default: m.CoursesPage })))
const SettingsPage = lazy(() => import('./components/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ApiTokensPage = lazy(() => import('./components/ApiTokensPage').then((m) => ({ default: m.ApiTokensPage })))
const BackupPage = lazy(() => import('./components/BackupPage').then((m) => ({ default: m.BackupPage })))
const PoliciesManagePage = lazy(() => import('./components/PoliciesManagePage').then((m) => ({ default: m.PoliciesManagePage })))
const PolicyAnalytics = lazy(() => import('./components/PolicyAnalytics').then((m) => ({ default: m.PolicyAnalytics })))
const HrReportsPage = lazy(() => import('./components/HrReportsPage').then((m) => ({ default: m.HrReportsPage })))
const AuditLogPage = lazy(() => import('./components/AuditLogPage').then((m) => ({ default: m.AuditLogPage })))
const ReferenceSubmissionPage = lazy(() => import('./components/ReferenceSubmissionPage').then((m) => ({ default: m.ReferenceSubmissionPage })))
const ReferenceAnalyticsPage = lazy(() => import('./components/ReferenceAnalyticsPage').then((m) => ({ default: m.ReferenceAnalyticsPage })))
const HrAnalyticsPage = lazy(() => import('./components/HrAnalyticsPage').then((m) => ({ default: m.HrAnalyticsPage })))
const DbsAnalyticsPage = lazy(() => import('./components/DbsAnalyticsPage'))
const RtwAnalyticsPage = lazy(() => import('./components/RtwAnalyticsPage'))
const ScheduledFormsPage = lazy(() => import('./components/ScheduledFormsPage'))

const PageLoadingFallback = () => (
    <Center h="60vh">
        <Loader color="brandGreen.6" />
    </Center>
)

// Global Safeguard CSS to force interactivity
const GlobalStyles = () => (
  <style>
    {`
      /* GLOBAL NUCLEAR FIX FOR INTERACTIVITY & VISIBILITY */
      html, body {
        overflow-x: hidden;
        height: 100%;
        margin: 0;
        pointer-events: auto !important;
        background-color: #F5F5F5 !important;
      }

      #root {
        height: 100%;
        min-height: 100%;
        pointer-events: auto !important;
        background-color: #F5F5F5 !important;
      }

      /* Disable ALL backdrop blurs globally - can cause rendering 'blackouts' */
      * {
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      /* Force all interactive elements to be clickable, but don't disrupt layout */
      button, a, input, select, textarea, [role="button"], .mantine-UnstyledButton-root, .mantine-Button-root, .mantine-Tabs-tab {
        pointer-events: auto !important;
        cursor: pointer !important;
      }

      /* --- DELETED THE MODAL KILLER CODE HERE --- */
      /* The lines that set display:none !important on .mantine-Modal-root were removed */
      /* This allows your "Add Course" popup to finally show up! */

      /* Ensure the main content is visible and interactive */
      main, .mantine-AppShell-main {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }

      :root {
        --ilc-primary: #139639;
        --ilc-secondary: #267FBA;
        --ilc-neutral: #E2E1E8;
      }

      body {
        font-family: system-ui, -apple-system, sans-serif !important;
      }

      h1, h2, h3, .heading, .title, [class*="heading"], [class*="title"] {
        font-family: Roboto, sans-serif !important;
      }

      h4, h5, h6, .subheading, .card-title, [class*="subheading"] {
        font-family: Lato, sans-serif !important;
      }

      a {
        color: var(--ilc-primary);
      }

      a:hover {
        color: rgba(19, 150, 57, 0.7);
      }

      /* Lock chrome to viewport; main scrolls with reserved header/footer space */
      .mantine-AppShell-root {
        height: 100dvh !important;
        max-height: 100dvh !important;
        overflow: hidden !important;
      }

      .mantine-AppShell-main {
        background-color: #F5F5F5 !important;
        box-sizing: border-box !important;
        height: 100dvh !important;
        max-height: 100dvh !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
        overscroll-behavior: contain;
        display: block !important;
        padding-top: calc(80px + 1rem) !important;
        padding-bottom: calc(64px + 2rem) !important;
      }

      .mantine-AppShell-header {
        position: fixed !important;
        top: 0 !important;
        z-index: 120 !important;
      }

      .mantine-AppShell-navbar {
        position: fixed !important;
        z-index: 110 !important;
      }

      .mantine-AppShell-footer,
      .app-footer {
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        height: 64px !important;
        max-height: 64px !important;
        min-height: 64px !important;
        z-index: 120 !important;
        background: #ffffff !important;
        border-top: 1px solid #139639 !important;
        box-shadow: none !important;
        overflow: hidden !important;
      }

      .app-footer .footer-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        height: 100%;
        width: 100%;
        padding: 0 20px;
        box-sizing: border-box;
      }

      .app-footer .footer-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
      }

      .app-footer .footer-badge {
        flex-shrink: 0;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: linear-gradient(145deg, #139639 0%, #0e7a2d 100%);
        color: #ffffff;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(19, 150, 57, 0.28);
      }

      .app-footer .footer-brand-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }

      .app-footer .footer-company {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        line-height: 1.2;
        color: #1f2937;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .app-footer .footer-copy {
        margin: 0;
        font-size: 12px;
        font-weight: 400;
        line-height: 1.2;
        color: #9ca3af;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      @media (max-width: 48em) {
        .app-footer .footer-inner {
          padding: 0 12px;
          gap: 8px;
        }
        .app-footer .footer-dev-label {
          display: none;
        }
      }

      .app-footer .footer-dev {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px 6px 12px;
        border-radius: 999px;
        background: rgba(38, 127, 186, 0.06);
        border: 1px solid rgba(38, 127, 186, 0.12);
        text-decoration: none;
        transition: background 0.2s ease, border-color 0.2s ease;
        flex-shrink: 0;
      }

      .app-footer .footer-dev:hover {
        background: rgba(38, 127, 186, 0.1);
        border-color: rgba(38, 127, 186, 0.22);
      }

      .app-footer .footer-dev-label {
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #64748b;
      }

      .app-footer .linkedin-link {
        color: #0A66C2 !important;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: #ffffff;
        border: 1px solid rgba(10, 102, 194, 0.18);
        line-height: 1;
        transition: background 0.15s ease, border-color 0.15s ease;
      }

      .app-footer .footer-dev:hover .linkedin-link {
        color: #ffffff !important;
        background: #0A66C2;
        border-color: #0A66C2;
      }

      .app-footer .footer-dev:hover .linkedin-link svg {
        color: #ffffff !important;
        stroke: #ffffff !important;
      }

      .mantine-Card-root,
      .mantine-Paper-root {
        background-color: #E2E1E8;
      }

      .mantine-Card-root,
      .mantine-Paper-root {
        position: relative;
      }

      .mantine-Button-root[data-variant="filled"] {
        background: #139639 !important;
        background-color: #139639 !important;
        color: #fff !important;
      }

      .mantine-Button-root[data-variant="filled"]:hover {
        background: #0e7a2d !important;
        background-color: #0e7a2d !important;
      }

      /* Ensure primary action labels stay readable even if a theme color is missing */
      .mantine-Button-root[data-variant="filled"] .mantine-Button-label {
        color: #fff !important;
      }

      .mantine-Button-root[data-variant="outline"] {
        color: #267FBA !important;
        border-color: #267FBA !important;
      }

      .mantine-Button-root[data-variant="outline"]:hover {
        background: rgba(38, 127, 186, 0.2) !important;
      }

      .mantine-Button-root[data-disabled="true"] {
        opacity: 0.35;
      }

      .mantine-Card-root::before, .mantine-Paper-root::before {
        content: "";
        position: absolute;
        top: 8px;
        right: 8px;
        width: 10px;
        height: 10px;
        background: rgba(38, 127, 186, 0.35);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        pointer-events: none;
      }

      .mantine-Card-root::after, .mantine-Paper-root::after {
        content: "";
        position: absolute;
        bottom: 8px;
        left: 8px;
        width: 12px;
        height: 12px;
        background: rgba(19, 150, 57, 0.2);
        clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
        pointer-events: none;
      }

      .ilc-triangle-accent::before {
        content: "";
        position: absolute;
        inset: 10px auto auto 10px;
        width: 12px;
        height: 12px;
        background: rgba(38, 127, 186, 0.35);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        pointer-events: none;
      }

      .ilc-hex-accent::after {
        content: "";
        position: absolute;
        inset: auto 10px 10px auto;
        width: 14px;
        height: 14px;
        background: rgba(19, 150, 57, 0.2);
        clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
        pointer-events: none;
      }
    `}
  </style>
);

function AppLayoutInner({ children, searchQuery, onSearch }: { children: React.ReactNode, searchQuery?: string, onSearch?: (val: string) => void }) {
  const { collapsed, toggle } = useSidebar();
  const [mobileOpened, setMobileOpened] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  
  return (
    <>
      <AppShell
        header={{ height: 80 }}
        footer={{ height: 64 }}
        navbar={{
          width: { base: 0, sm: collapsed ? 72 : 272 },
          breakpoint: 'sm',
          collapsed: { mobile: true },
        }}
        padding="md"
        styles={{
          header: {
            background: 'rgba(19, 150, 57, 0.2)',
            borderBottom: '1px solid rgba(19, 150, 57, 0.35)',
            boxShadow: '0 4px 15px rgba(19, 150, 57, 0.2)',
          },
          navbar: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid #E5E7EB',
            boxShadow: '4px 0 18px rgba(15, 23, 42, 0.04)',
            overflowX: 'hidden',
            overflowY: 'auto',
          },
          main: {
            backgroundColor: '#F5F5F5',
            overflowX: 'hidden',
            overflowY: 'auto',
            paddingTop: 'calc(80px + 1rem)',
            paddingBottom: 'calc(64px + 2rem)',
          },
          footer: {
            backgroundColor: '#ffffff',
            borderTop: '1px solid #139639',
            boxShadow: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            top: 'auto',
            height: 64,
            maxHeight: 64,
            zIndex: 120,
          },
        }}
      >
        <AppShell.Header>
          <Group h="100%" px={0} gap={0} style={{ width: '100%' }}>
            <Burger
              opened={mobileOpened}
              onClick={() => setMobileOpened(!mobileOpened)}
              hiddenFrom="sm"
              size="sm"
              color="white"
              ml="sm"
              style={{ flexShrink: 0 }}
            />
            <Box style={{ flex: 1, width: '100%' }}>
              <TopHeader searchQuery={searchQuery} onSearch={onSearch} />
            </Box>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar hiddenFrom="sm">
          {/* Mobile navbar is hidden, we use Drawer instead */}
        </AppShell.Navbar>

        <AppShell.Navbar visibleFrom="sm">
          <Sidebar />
        </AppShell.Navbar>

      <AppShell.Main>
        <PageWrapper>
          {children}
        </PageWrapper>
      </AppShell.Main>

      <AppShell.Footer
        className="app-footer"
        p={0}
      >
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-badge" aria-hidden="true">LC</span>
            <div className="footer-brand-text">
              <p className="footer-company">Lets Care All Ltd</p>
              <p className="footer-copy">© {new Date().getFullYear()} All rights reserved</p>
            </div>
          </div>
          <a
            className="footer-dev"
            href="https://pk.linkedin.com/in/syeda-atiqa-kanwal-838490390?trk=people-guest_people_search-card"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Developer LinkedIn profile"
          >
            <span className="footer-dev-label">Developer</span>
            <span className="linkedin-link" aria-hidden="true">
              <Linkedin size={14} strokeWidth={2.25} color="#0A66C2" />
            </span>
          </a>
        </div>
      </AppShell.Footer>
      </AppShell>

      {/* Mobile Drawer */}
      <Drawer
        opened={mobileOpened}
        onClose={() => setMobileOpened(false)}
        title="Menu"
        padding="md"
        size="280"
        styles={{
          body: {
            padding: 0,
          },
          content: {
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Sidebar onLinkClick={() => setMobileOpened(false)} hideHeader />
        </Box>
      </Drawer>
    </>
  )
}

function AppLayout({ children, searchQuery, onSearch }: { children: React.ReactNode, searchQuery?: string, onSearch?: (val: string) => void }) {
  return (
    <SidebarProvider>
      <AppLayoutInner searchQuery={searchQuery} onSearch={onSearch}>
        {children}
      </AppLayoutInner>
    </SidebarProvider>
  )
}

const SITE_NAME = 'Lets Care All';

function getPageTitle(pathname: string): string {
  if (pathname === '/') return SITE_NAME;
  if (pathname === '/login') return `Login | ${SITE_NAME}`;
  if (pathname === '/register') return `Register | ${SITE_NAME}`;
  if (pathname === '/forgot-password') return `Forgot Password | ${SITE_NAME}`;
  if (pathname.startsWith('/reference/submit')) return `Reference Submission | ${SITE_NAME}`;
  if (pathname === '/dashboard' || pathname === '/dashboard/') return `Dashboard | ${SITE_NAME}`;
  if (pathname === '/dashboard/staff') return `Staff Directory | ${SITE_NAME}`;
  if (pathname.startsWith('/dashboard/staff/')) return `Staff Profile | ${SITE_NAME}`;
  if (pathname === '/dashboard/me') return `My Profile | ${SITE_NAME}`;
  if (pathname === '/courses') return `Courses | ${SITE_NAME}`;
  if (pathname === '/dashboard/policies') return `Policies | ${SITE_NAME}`;
  if (pathname === '/dashboard/policies/reports') return `Policy Reports | ${SITE_NAME}`;
  if (pathname === '/dashboard/policies/manage') return `Manage Policies | ${SITE_NAME}`;
  if (pathname === '/dashboard/policies/analytics') return `Policy Analytics | ${SITE_NAME}`;
  if (pathname === '/dashboard/references/analytics') return `Reference Analytics | ${SITE_NAME}`;
  if (pathname === '/dashboard/dbs/analytics') return `DBS Analytics | ${SITE_NAME}`;
  if (pathname === '/dashboard/rtw/analytics') return `Right to Work | ${SITE_NAME}`;
  if (pathname === '/dashboard/schedules') return `Schedules | ${SITE_NAME}`;
  if (pathname === '/dashboard/reports/analytics') return `HR Analytics | ${SITE_NAME}`;
  if (pathname === '/settings') return `Settings | ${SITE_NAME}`;
  if (pathname === '/settings/api-tokens') return `API Tokens | ${SITE_NAME}`;
  if (pathname === '/dashboard/backup') return `Database Backup | ${SITE_NAME}`;
  return SITE_NAME;
}

function PageTitleUpdater() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = getPageTitle(pathname);
  }, [pathname]);
  return null;
}

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  // Force interactivity on mount
  useEffect(() => {
    document.body.style.pointerEvents = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    limitDateYearInput();
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <GlobalStyles />
      <Notifications position="top-right" zIndex={2000} />
      <BrowserRouter>
        <PageTitleUpdater />
        <ErrorBoundary>
        <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Public route for reference submission */}
          <Route path="/reference/submit/:token" element={<ReferenceSubmissionPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <DashboardView />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/staff" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <StaffDirectoryPage searchQuery={searchQuery} />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/staff/:id" element={
              <AdminRoute>
                <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                  <StaffProfilePage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/me" element={
              <AppLayout searchQuery={searchQuery} onSearch={setSearchQuery}>
                <StaffProfilePage />
              </AppLayout>
            } />

            <Route path="/courses" element={
              <AppLayout>
                <CoursesPage />
              </AppLayout>
            } />

            <Route path="/dashboard/policies" element={
              <AppLayout>
                <PoliciesPage />
              </AppLayout>
            } />

            <Route path="/dashboard/policies/reports" element={
              <AdminRoute>
                <AppLayout>
                  <PolicyReportsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/policies/manage" element={
              <AdminRoute>
                <AppLayout>
                  <PoliciesManagePage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/policies/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <PolicyAnalytics />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/references/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <ReferenceAnalyticsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/dbs/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <DbsAnalyticsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/rtw/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <RtwAnalyticsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/schedules" element={
              <AdminRoute>
                <AppLayout>
                  <ScheduledFormsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/reports" element={
              <AdminRoute>
                <AppLayout>
                  <HrReportsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/reports/analytics" element={
              <AdminRoute>
                <AppLayout>
                  <HrAnalyticsPage />
                </AppLayout>
              </AdminRoute>
            } />

            <Route path="/dashboard/audit-logs" element={
              <AuditViewRoute>
                <AppLayout>
                  <AuditLogPage />
                </AppLayout>
              </AuditViewRoute>
            } />

            <Route path="/settings" element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            } />

            <Route path="/settings/api-tokens" element={
              <StrictAdminRoute>
                <AppLayout>
                  <ApiTokensPage />
                </AppLayout>
              </StrictAdminRoute>
            } />

            <Route path="/dashboard/backup" element={
              <StrictAdminRoute>
                <AppLayout>
                  <BackupPage />
                </AppLayout>
              </StrictAdminRoute>
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </MantineProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

