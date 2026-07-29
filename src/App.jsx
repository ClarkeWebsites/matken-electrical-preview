import { lazy, Suspense } from "react";
import {
  BrowserRouter,
  HashRouter,
  Route,
  Routes,
} from "react-router";
import {
  AppErrorBoundary,
  RouteLoadingState,
} from "./components/AppStates.jsx";
import { SiteLayout } from "./components/Layout.jsx";
import { HomePage } from "./pages/HomePage.jsx";

const lazyNamed = (loadModule, exportName) =>
  lazy(() =>
    loadModule().then((module) => ({
      default: module[exportName],
    })),
  );

const InvoicePage = lazyNamed(
  () => import("./pages/InvoicePage.jsx"),
  "InvoicePage",
);
const PlannerPage = lazyNamed(
  () => import("./pages/PlannerPage.jsx"),
  "PlannerPage",
);
const ProjectPackPage = lazyNamed(
  () => import("./pages/ProjectPackPage.jsx"),
  "ProjectPackPage",
);
const RequestPage = lazyNamed(
  () => import("./pages/RequestPage.jsx"),
  "RequestPage",
);
const StatusPage = lazyNamed(
  () => import("./pages/StatusPage.jsx"),
  "StatusPage",
);
const AboutPage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "AboutPage",
);
const NotFoundPage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "NotFoundPage",
);
const PrivacyPage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "PrivacyPage",
);
const ResourceArticlePage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "ResourceArticlePage",
);
const ResourcesPage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "ResourcesPage",
);
const TermsPage = lazyNamed(
  () => import("./pages/ContentPages.jsx"),
  "TermsPage",
);
const ServiceDetailPage = lazyNamed(
  () => import("./pages/ServicesPage.jsx"),
  "ServiceDetailPage",
);
const ServicesOverviewPage = lazyNamed(
  () => import("./pages/ServicesPage.jsx"),
  "ServicesOverviewPage",
);

const AppRouter =
  import.meta.env.VITE_GITHUB_PAGES === "true" ? HashRouter : BrowserRouter;

function DeferredRoute({ children }) {
  return <Suspense fallback={<RouteLoadingState />}>{children}</Suspense>;
}

export function App() {
  return (
    <AppRouter>
      <AppErrorBoundary>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route
              path="services"
              element={
                <DeferredRoute>
                  <ServicesOverviewPage />
                </DeferredRoute>
              }
            />
            <Route
              path="services/:slug"
              element={
                <DeferredRoute>
                  <ServiceDetailPage />
                </DeferredRoute>
              }
            />
            <Route
              path="planner"
              element={
                <DeferredRoute>
                  <PlannerPage />
                </DeferredRoute>
              }
            />
            <Route
              path="request"
              element={
                <DeferredRoute>
                  <RequestPage />
                </DeferredRoute>
              }
            />
            <Route
              path="project-pack"
              element={
                <DeferredRoute>
                  <ProjectPackPage />
                </DeferredRoute>
              }
            />
            <Route
              path="pay-invoice"
              element={
                <DeferredRoute>
                  <InvoicePage />
                </DeferredRoute>
              }
            />
            <Route
              path="project-status"
              element={
                <DeferredRoute>
                  <StatusPage />
                </DeferredRoute>
              }
            />
            <Route
              path="resources"
              element={
                <DeferredRoute>
                  <ResourcesPage />
                </DeferredRoute>
              }
            />
            <Route
              path="resources/:slug"
              element={
                <DeferredRoute>
                  <ResourceArticlePage />
                </DeferredRoute>
              }
            />
            <Route
              path="about"
              element={
                <DeferredRoute>
                  <AboutPage />
                </DeferredRoute>
              }
            />
            <Route
              path="privacy"
              element={
                <DeferredRoute>
                  <PrivacyPage />
                </DeferredRoute>
              }
            />
            <Route
              path="terms"
              element={
                <DeferredRoute>
                  <TermsPage />
                </DeferredRoute>
              }
            />
            <Route
              path="*"
              element={
                <DeferredRoute>
                  <NotFoundPage />
                </DeferredRoute>
              }
            />
          </Route>
        </Routes>
      </AppErrorBoundary>
    </AppRouter>
  );
}
