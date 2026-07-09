import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, AppShell, Text, Group, Drawer, Burger, Box } from '@mantine/core'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { theme } from './theme'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardView } from './components/DashboardView'
import { StaffDirectoryPage } from './components/StaffDirectoryPage'
import { StaffProfilePage } from './components/StaffProfilePage'
import { TopHeader } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CoursesPage } from './components/CoursesPage'
import { SettingsPage } from './components/SettingsPage'
import { ApiTokensPage } from './components/ApiTokensPage'
import { ForgotPasswordPage } from './components/ForgotPasswordPage'
import { PageWrapper } from './components/PageWrapper'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute, StrictAdminRoute, AuditViewRoute } from './components/RoleRoute'
import { PoliciesPage } from './components/PoliciesPage'
import { PolicyReportsPage } from './components/PolicyReportsPage'
import { PoliciesManagePage } from './components/PoliciesManagePage'
import { PolicyAnalytics } from './components/PolicyAnalytics'
import { HrReportsPage } from './components/HrReportsPage'
import { AuditLogPage } from './components/AuditLogPage'
import { ReferenceSubmissionPage } from './components/ReferenceSubmissionPage'
import { ReferenceAnalyticsPage } from './components/ReferenceAnalyticsPage'
import { HrAnalyticsPage } from './components/HrAnalyticsPage'
import { useState, useEffect } from 'react'
import { Linkedin } from 'lucide-react'
import { Notifications } from '@mantine/notifications'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

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
        overflow: visible;
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

      .mantine-AppShell-main {
        background-color: #F5F5F5 !important;
        overflow: visible !important;
      }

      .mantine-AppShell-footer {
        background-color: transparent !important;
        border-top: none !important;
        box-shadow: none !important;
      }

      .app-footer .linkedin-link {
        color: #0A66C2 !important;
        display: inline-flex;
        align-items: center;
        line-height: 1;
        transition: opacity 0.15s ease;
      }

      .app-footer .linkedin-link:hover {
        color: #0A66C2 !important;
        opacity: 0.75;
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
        color: #fff !important;
      }

      .mantine-Button-root[data-variant="filled"]:hover {
        background: rgba(19, 150, 57, 0.7) !important;
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
  
  return (
    <>
      <AppShell
        header={{ height: 80 }}
        footer={{ height: 56 }}
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
            borderRight: '1px solid #dee2e6',
            overflowX: 'hidden',
            overflowY: 'auto',
          },
          main: {
            backgroundColor: '#F5F5F5',
          },
          footer: {
            backgroundColor: 'transparent',
            borderTop: 'none',
            boxShadow: 'none',
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
        style={{
          backgroundColor: 'transparent',
          borderTop: 'none',
          boxShadow: 'none',
        }}
      >
        <Group
          justify="space-between"
          align="center"
          h={56}
          px={24}
          py={12}
          wrap="wrap"
          gap="sm"
          style={{ maxWidth: '100%' }}
        >
          <Text size="sm" fw={400} style={{ color: '#6B7280' }}>
            © {new Date().getFullYear()} Lets Care All Ltd. All rights reserved.
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Text size="sm" fw={400} style={{ color: '#6B7280' }}>
              Developer
            </Text>
            <a
              className="linkedin-link"
              href="https://pk.linkedin.com/in/syeda-atiqa-kanwal-838490390?trk=people-guest_people_search-card"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Developer LinkedIn profile"
            >
              <Linkedin size={20} strokeWidth={2} color="#0A66C2" />
            </a>
          </Group>
        </Group>
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
  if (pathname === '/dashboard/reports/analytics') return `HR Analytics | ${SITE_NAME}`;
  if (pathname === '/settings') return `Settings | ${SITE_NAME}`;
  if (pathname === '/settings/api-tokens') return `API Tokens | ${SITE_NAME}`;
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
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <GlobalStyles />
      <Notifications position="top-right" zIndex={2000} />
      <BrowserRouter>
        <PageTitleUpdater />
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

