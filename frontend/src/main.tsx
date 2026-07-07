import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider, AppShell, Text, Group, Container, Drawer, Burger, Box } from '@mantine/core'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { theme } from './theme'
import { LandingPage } from './components/LandingPage'
import { LoginPage } from './components/LoginPage'
import { SignupPage } from './components/SignupPage'
import { DashboardView } from './components/DashboardView'
import { StaffProfilePage } from './components/StaffProfilePage'
import { TopHeader } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { CoursesPage } from './components/CoursesPage'
import { SettingsPage } from './components/SettingsPage'
import { ApiTokensPage } from './components/ApiTokensPage'
import { ForgotPasswordPage } from './components/ForgotPasswordPage'
import { PageWrapper } from './components/PageWrapper'
import { ProtectedRoute } from './components/ProtectedRoute'
import { PoliciesPage } from './components/PoliciesPage'
import { PolicyReportsPage } from './components/PolicyReportsPage'
import { PoliciesManagePage } from './components/PoliciesManagePage'
import { PolicyAnalytics } from './components/PolicyAnalytics'
import { ReferenceSubmissionPage } from './components/ReferenceSubmissionPage'
import { ReferenceAnalyticsPage } from './components/ReferenceAnalyticsPage'
import { useState, useEffect } from 'react'
import { Notifications } from '@mantine/notifications'
import { SidebarProvider, useSidebar } from './contexts/SidebarContext'
import '@mantine/core/styles.css'
import '@mantine/notifications/styles.css'

// Global Safeguard CSS to force interactivity
const GlobalStyles = () => (
  <style>
    {`
      /* GLOBAL NUCLEAR FIX FOR INTERACTIVITY & VISIBILITY */
      html, body, #root {
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
        --ilc-primary: #1EBAF2;
        --ilc-secondary: #E51690;
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
        color: rgba(30, 186, 242, 0.7);
      }

      .mantine-AppShell-main,
      .mantine-Card-root,
      .mantine-Paper-root {
        background-color: #E2E1E8;
      }

      .mantine-Card-root,
      .mantine-Paper-root {
        position: relative;
      }

      .mantine-Button-root[data-variant="filled"] {
        background: #1EBAF2 !important;
        color: #fff !important;
      }

      .mantine-Button-root[data-variant="filled"]:hover {
        background: rgba(30, 186, 242, 0.7) !important;
      }

      .mantine-Button-root[data-variant="outline"] {
        color: #E51690 !important;
        border-color: #E51690 !important;
      }

      .mantine-Button-root[data-variant="outline"]:hover {
        background: rgba(229, 22, 144, 0.2) !important;
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
        background: rgba(229, 22, 144, 0.35);
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
        background: rgba(30, 186, 242, 0.2);
        clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
        pointer-events: none;
      }

      .ilc-triangle-accent::before {
        content: "";
        position: absolute;
        inset: 10px auto auto 10px;
        width: 12px;
        height: 12px;
        background: rgba(229, 22, 144, 0.35);
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        pointer-events: none;
      }

      .ilc-hex-accent::after {
        content: "";
        position: absolute;
        inset: auto 10px 10px auto;
        width: 14px;
        height: 14px;
        background: rgba(30, 186, 242, 0.2);
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
        navbar={{
          width: { base: 0, sm: collapsed ? 72 : 272 },
          breakpoint: 'sm',
          collapsed: { mobile: true },
        }}
        padding="md"
        styles={{
          header: {
            background: 'rgba(30, 186, 242, 0.2)',
            borderBottom: '1px solid rgba(30, 186, 242, 0.35)',
            boxShadow: '0 4px 15px rgba(30, 186, 242, 0.2)',
          },
          navbar: {
            backgroundColor: '#ffffff',
            borderRight: '1px solid #dee2e6',
            // Allow sidebar content to scroll instead of being cut off
            overflowX: 'hidden',
            overflowY: 'auto',
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

      <AppShell.Main
        style={{
          backgroundColor: '#F5F5F5',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 'calc(100dvh - 80px)',
        }}
      >
        <Box style={{ flex: 1, width: '100%', minHeight: 0 }}>
          <PageWrapper>
            {children}
          </PageWrapper>
        </Box>
        <Box
          component="footer"
          px="sm"
          py={8}
          style={{
            flexShrink: 0,
            background: '#E2E1E8',
            borderTop: '1px solid rgba(30, 186, 242, 0.35)',
          }}
        >
          <Container size="xl">
            <Group justify="space-between" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: '8px' }}>
              <Text size="xs" c="#333333" fw={600} style={{ opacity: 0.9 }}>
                © {new Date().getFullYear()} Lets Care All Ltd. All rights reserved.
              </Text>
            </Group>
          </Container>
        </Box>
      </AppShell.Main>
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

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const role = localStorage.getItem('role');
  if (role !== 'admin') {
    return <Navigate to="/dashboard/me" replace />;
  }
  return <>{children}</>;
};

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
                  <DashboardView searchQuery={searchQuery} />
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

            <Route path="/settings" element={
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            } />

            <Route path="/settings/api-tokens" element={
              <AppLayout>
                <ApiTokensPage />
              </AppLayout>
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

