import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { Suspense, lazy, useEffect } from "react";
import Home from "./pages/Home";
import { updateCanonicalTag, updateHrefLangTags, addNoIndexTag, removeNoIndexTag } from "./lib/seoHelpers";
import { AdvancedSearchFAB } from "./components/AdvancedSearchFAB";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import { PWAUpdateNotification } from "./components/PWAUpdateNotification";

// Lazy load pages for better performance (Code Splitting)
const Favorites = lazy(() => import("./pages/Favorites"));
const DrugDetail = lazy(() => import("./pages/DrugDetail"));
const CodeDetail = lazy(() => import("./pages/CodeDetail"));
const ConditionDetail = lazy(() => import("./pages/ConditionDetail"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Database = lazy(() => import("./pages/Database"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const ContactUs = lazy(() => import("./pages/ContactUs"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const FAQ = lazy(() => import("./pages/FAQ"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ImageToPDF = lazy(() => import("./pages/ImageToPDF"));
const MergePDF = lazy(() => import("./pages/MergePDF"));
const Tools = lazy(() => import("./pages/Tools"));
const BrowseByScientificName = lazy(() => import("./pages/BrowseByScientificName"));
const AnalyticsDashboard = lazy(() => import("./pages/AnalyticsDashboard"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
  </div>
);

function Router() {
  const [location] = useLocation();
  
  // Update SEO tags on route change
  useEffect(() => {
    updateCanonicalTag(location);
    updateHrefLangTags(location);
    
    // Add noindex to admin page
    if (location === '/admin') {
      addNoIndexTag();
    } else {
      removeNoIndexTag();
    }
    
    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location]);
  
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/?"} component={Home} />
      <Route path={"metrics"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <AnalyticsDashboard />
        </Suspense>
      )} />
      <Route path={"/about"} component={() => (        <Suspense fallback={<PageLoader />}>
          <AboutUs />
        </Suspense>
      )} />
      <Route path={"/contact"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <ContactUs />
        </Suspense>
      )} />
      <Route path={"/privacy"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <PrivacyPolicy />
        </Suspense>
      )} />
      <Route path={"/terms"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <TermsOfService />
        </Suspense>
      )} />
      <Route path={"/faq"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <FAQ />
        </Suspense>
      )} />
       <Route path={"analytics"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <AnalyticsDashboard />
        </Suspense>
      )} />
      <Route path={"/tools"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <Tools />
        </Suspense>
      )} />
      <Route path={"/tools/image-to-pdf"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <ImageToPDF />
        </Suspense>
      )} />
      <Route path={"/tools/merge-pdf"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <MergePDF />
        </Suspense>
      )} />
      <Route path={"/browse/scientific-name/:scientificName"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <BrowseByScientificName />
        </Suspense>
      )} />
      <Route path={"/favorites"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <Favorites />
        </Suspense>
      )} />
      <Route path={"/database"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <Database />
        </Suspense>
      )} />
      <Route path={"/drug/:name"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <DrugDetail />
        </Suspense>
      )} />
      <Route path={"/code/:code"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <CodeDetail />
        </Suspense>
      )} />
      <Route path={"/condition/:condition"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <ConditionDetail />
        </Suspense>
      )} />
      <Route path={"/admin"} component={() => (
        <Suspense fallback={<PageLoader />}>
          <AdminPanel />
        </Suspense>
      )} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        switchable
      >
        <FavoritesProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
            <AdvancedSearchFAB />
            <PWAInstallPrompt />
            <PWAUpdateNotification />
          </TooltipProvider>
        </FavoritesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
