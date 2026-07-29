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
const RequestPage = lazyNamed(
  () => import("./pages/RequestPage.jsx"),
  "RequestPage",
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

export function App() {
  return (
    <AppRouter>
      <AppErrorBoundary>
        <Suspense fallback={<RouteLoadingState />}>
          <Routes>
            <Route element={<SiteLayout />}>
              <Route index element={<HomePage />} />
              <Route path="services" element={<ServicesOverviewPage />} />
              <Route path="services/:slug" element={<ServiceDetailPage />} />
              <Route path="planner" element={<PlannerPage />} />
              <Route path="request" element={<RequestPage />} />
              <Route path="pay-invoice" element={<InvoicePage />} />
              <Route path="resources" element={<ResourcesPage />} />
              <Route
                path="resources/:slug"
                element={<ResourceArticlePage />}
              />
              <Route path="about" element={<AboutPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </AppRouter>
  );
}
