// ============================================================
// App.tsx — Кореневий компонент додатку DImarket
// Відповідає за маршрутизацію між усіма сторінками.
// ============================================================

import { Suspense, useEffect, useLayoutEffect, useState } from 'react'
import { AppProvider }         from './contexts/AppContext'
import { PwaInstallProvider }  from './contexts/PwaInstallContext'
import { PaidAdsProvider }     from './contexts/PaidAdsContext'
import { Header }              from './components/Header'
import { Footer }              from './components/Footer'
import { MobileBottomNav }     from './components/MobileBottomNav'
import { PwaInstallPrompt }    from './components/PwaInstallPrompt'
import { PageWithSideAds } from './components/PageWithSideAds'
import { PageLoading } from './components/PageLoading'
import { ErrorBoundary } from './components/ErrorBoundary'
import { lazyWithRetry } from './lib/lazyWithRetry'
import { bindPathListener, navigateTo, scrollToTop } from './lib/navigation'
import { isSeoLocale } from './lib/seoRoutes'
import {
  findServiceBySlug,
  isReservedAppPath,
  SEO_SERVICE_ALIASES,
} from './lib/serviceTaxonomy'
import { parseGeoServicePath } from './lib/geoSearch'
import { isDocumentsSubcategorySlug } from './lib/documents/subcategories'
import { AiChatWidget } from './components/AiChatWidget'

// Eager: first paint / shell
import { Home } from './pages/Home'
import { CategoryPage } from './pages/CategoryPage'
import { CostEstimator } from './pages/CostEstimator'

// Lazy: remaining routes — keeps initial JS small
const Professionals = lazyWithRetry(() =>
  import('./pages/Professionals').then((m) => ({ default: m.Professionals })),
)
const Companies = lazyWithRetry(() =>
  import('./pages/Companies').then((m) => ({ default: m.Companies })),
)
const Listings = lazyWithRetry(() =>
  import('./pages/Listings').then((m) => ({ default: m.Listings })),
)
const ListingDetail = lazyWithRetry(() =>
  import('./pages/ListingDetail').then((m) => ({ default: m.ListingDetail })),
)
const ProfessionalDetail = lazyWithRetry(() =>
  import('./pages/ProfessionalDetail').then((m) => ({ default: m.ProfessionalDetail })),
)
const Contact = lazyWithRetry(() =>
  import('./pages/Contact').then((m) => ({ default: m.Contact })),
)
const Advertising = lazyWithRetry(() =>
  import('./pages/Advertising').then((m) => ({ default: m.Advertising })),
)
const Login = lazyWithRetry(() =>
  import('./pages/Login').then((m) => ({ default: m.Login })),
)
const Register = lazyWithRetry(() =>
  import('./pages/Register').then((m) => ({ default: m.Register })),
)
const AuthCallback = lazyWithRetry(() =>
  import('./pages/AuthCallback').then((m) => ({ default: m.AuthCallback })),
)
const Dashboard = lazyWithRetry(() =>
  import('./pages/Dashboard').then((m) => ({ default: m.Dashboard })),
)
const Settings = lazyWithRetry(() =>
  import('./pages/Settings').then((m) => ({ default: m.Settings })),
)
const Profile = lazyWithRetry(() =>
  import('./pages/Profile').then((m) => ({ default: m.Profile })),
)
const MyListings = lazyWithRetry(() =>
  import('./pages/MyListings').then((m) => ({ default: m.MyListings })),
)
const Messages = lazyWithRetry(() =>
  import('./pages/Messages').then((m) => ({ default: m.Messages })),
)
const Favorites = lazyWithRetry(() =>
  import('./pages/Favorites').then((m) => ({ default: m.Favorites })),
)
const CreateAd = lazyWithRetry(() =>
  import('./pages/CreateAd').then((m) => ({ default: m.CreateAd })),
)
const JobRequestChat = lazyWithRetry(() =>
  import('./pages/JobRequestChat').then((m) => ({ default: m.JobRequestChat })),
)
const AiAdmin = lazyWithRetry(() =>
  import('./pages/AiAdmin').then((m) => ({ default: m.AiAdmin })),
)
const MarketingAgentAdmin = lazyWithRetry(() =>
  import('./pages/MarketingAgentAdmin').then((m) => ({ default: m.MarketingAgentAdmin })),
)
const OfficialSourcesAdmin = lazyWithRetry(() =>
  import('./pages/OfficialSourcesAdmin').then((m) => ({ default: m.OfficialSourcesAdmin })),
)
const LegalDocumentDetail = lazyWithRetry(() =>
  import('./pages/LegalDocumentDetail').then((m) => ({ default: m.LegalDocumentDetail })),
)
const DocumentsHub = lazyWithRetry(() =>
  import('./pages/DocumentsHub').then((m) => ({ default: m.DocumentsHub })),
)
const DocumentDetailPage = lazyWithRetry(() =>
  import('./pages/DocumentDetailPage').then((m) => ({ default: m.DocumentDetailPage })),
)
const Checkout = lazyWithRetry(() =>
  import('./pages/Checkout').then((m) => ({ default: m.Checkout })),
)
const BoostProfile = lazyWithRetry(() =>
  import('./pages/BoostProfile').then((m) => ({ default: m.BoostProfile })),
)
const Pricing = lazyWithRetry(() =>
  import('./pages/Pricing').then((m) => ({ default: m.Pricing })),
)
const Billing = lazyWithRetry(() =>
  import('./pages/Billing').then((m) => ({ default: m.Billing })),
)
const Verification = lazyWithRetry(() =>
  import('./pages/Verification').then((m) => ({ default: m.Verification })),
)
const ForProfessionals = lazyWithRetry(() =>
  import('./pages/ForProfessionals').then((m) => ({ default: m.ForProfessionals })),
)
const ForCompanies = lazyWithRetry(() =>
  import('./pages/ForCompanies').then((m) => ({ default: m.ForCompanies })),
)
const ForAdvertisers = lazyWithRetry(() =>
  import('./pages/ForAdvertisers').then((m) => ({ default: m.ForAdvertisers })),
)
const SeoMarketLanding = lazyWithRetry(() =>
  import('./pages/SeoMarketLanding').then((m) => ({ default: m.SeoMarketLanding })),
)
const CreateProject = lazyWithRetry(() =>
  import('./pages/CreateProject').then((m) => ({ default: m.CreateProject })),
)
const ProjectMatches = lazyWithRetry(() =>
  import('./pages/ProjectMatches').then((m) => ({ default: m.ProjectMatches })),
)
const ProjectOffers = lazyWithRetry(() =>
  import('./pages/ProjectOffers').then((m) => ({ default: m.ProjectOffers })),
)
const ProjectManage = lazyWithRetry(() =>
  import('./pages/ProjectManage').then((m) => ({ default: m.ProjectManage })),
)
const ProjectFeed = lazyWithRetry(() =>
  import('./pages/ProjectFeed').then((m) => ({ default: m.ProjectFeed })),
)
const QuoteBuilder = lazyWithRetry(() =>
  import('./pages/QuoteBuilder').then((m) => ({ default: m.QuoteBuilder })),
)
const MyProjects = lazyWithRetry(() =>
  import('./pages/MyProjects').then((m) => ({ default: m.MyProjects })),
)
const ProDashboard = lazyWithRetry(() =>
  import('./pages/ProDashboard').then((m) => ({ default: m.ProDashboard })),
)
const ProCalendar = lazyWithRetry(() =>
  import('./pages/ProCalendar').then((m) => ({ default: m.ProCalendar })),
)
const BookProfessional = lazyWithRetry(() =>
  import('./pages/BookProfessional').then((m) => ({ default: m.BookProfessional })),
)
const CustomerDashboard = lazyWithRetry(() =>
  import('./pages/CustomerDashboard').then((m) => ({ default: m.CustomerDashboard })),
)
const CostEstimatorHistory = lazyWithRetry(() =>
  import('./pages/CostEstimatorHistory').then((m) => ({
    default: m.CostEstimatorHistory,
  })),
)
const Notifications = lazyWithRetry(() =>
  import('./pages/Notifications').then((m) => ({ default: m.Notifications })),
)
const AiAssistant = lazyWithRetry(() =>
  import('./pages/AiAssistant').then((m) => ({ default: m.AiAssistant })),
)
const Analytics = lazyWithRetry(() =>
  import('./pages/Analytics').then((m) => ({ default: m.Analytics })),
)
const SearchPage = lazyWithRetry(() =>
  import('./pages/Search').then((m) => ({ default: m.SearchPage })),
)
const MapExplore = lazyWithRetry(() =>
  import('./pages/MapExplore').then((m) => ({ default: m.MapExplore })),
)
const Categories = lazyWithRetry(() =>
  import('./pages/Categories').then((m) => ({ default: m.Categories })),
)
const ServiceResults = lazyWithRetry(() =>
  import('./pages/ServiceResults').then((m) => ({ default: m.ServiceResults })),
)
const CommercialAgentsHome = lazyWithRetry(() =>
  import('./pages/commercialAgents/CommercialAgentsHome').then((m) => ({
    default: m.CommercialAgentsHome,
  })),
)
const CommercialAgentsDirectory = lazyWithRetry(() =>
  import('./pages/commercialAgents/CommercialAgentsDirectory').then((m) => ({
    default: m.CommercialAgentsDirectory,
  })),
)
const ManufacturerProfilePage = lazyWithRetry(() =>
  import('./pages/commercialAgents/ManufacturerProfilePage').then((m) => ({
    default: m.ManufacturerProfilePage,
  })),
)
const AgentProfilePage = lazyWithRetry(() =>
  import('./pages/commercialAgents/AgentProfilePage').then((m) => ({
    default: m.AgentProfilePage,
  })),
)
const OpportunityDetailPage = lazyWithRetry(() =>
  import('./pages/commercialAgents/OpportunityDetailPage').then((m) => ({
    default: m.OpportunityDetailPage,
  })),
)
const CommercialAgentsDashboard = lazyWithRetry(() =>
  import('./pages/commercialAgents/CommercialAgentsDashboard').then((m) => ({
    default: m.CommercialAgentsDashboard,
  })),
)

/** Old Admin Panel URLs → owner cabinet (/dashboard). */
function RedirectToOwnerCabinet() {
  useEffect(() => {
    navigateTo('/dashboard')
  }, [])
  return null
}

function App() {
  const [path, setPath] = useState(window.location.pathname)

  useLayoutEffect(() => {
    const syncPath = () => setPath(window.location.pathname)
    bindPathListener(syncPath)
    return () => bindPathListener(null)
  }, [])

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Instant top on every route change (hash targets handle their own scroll).
  useLayoutEffect(() => {
    if (window.location.hash) return
    scrollToTop()
  }, [path])

  const getPage = () => {
    const parts = path.split('/').filter(Boolean)

    if (parts[0] === 'legal-documents') {
      // Public list unified under /documents; OSM detail pages keep their keys.
      if (!parts[1]) return <DocumentsHub />
      return <LegalDocumentDetail docKey={parts[1]} />
    }

    // Documents & Procedures — public category (location-aware)
    if (parts[0] === 'documents') {
      if (!parts[1]) return <DocumentsHub />
      if (isDocumentsSubcategorySlug(parts[1])) {
        return <DocumentsHub subcategory={parts[1]} />
      }
      if (parts[1] && parts[2] && parts[3]) {
        return (
          <DocumentDetailPage countrySlug={parts[1]} cityOrSlug={parts[2]} slug={parts[3]} />
        )
      }
      if (parts[1] && parts[2]) {
        return <DocumentDetailPage countrySlug={parts[1]} cityOrSlug={parts[2]} />
      }
      return <DocumentsHub />
    }

    if (
      parts[0] === 'category' &&
      (parts[1] === 'official-documents' || parts[1] === 'documents-procedures')
    ) {
      return <DocumentsHub />
    }

    // Динамічні маршрути
    if (parts[0] === 'category' && parts[1]) return <CategoryPage slug={parts[1]} />
    if (parts[0] === 'services' && parts[1]) return <ServiceResults slug={parts[1]} />
    if (parts[0] === 'listing'      && parts[1]) return <ListingDetail listingId={parts[1]} />
    if (parts[0] === 'professional' && parts[1]) return <ProfessionalDetail profileId={parts[1]} />
    if (parts[0] === 'book' && parts[1]) return <BookProfessional profileId={parts[1]} />
    if (parts[0] === 'project' && parts[1] && parts[2] === 'matches') {
      return <ProjectMatches listingId={parts[1]} />
    }
    if (parts[0] === 'project' && parts[1] && parts[2] === 'offers') {
      return <ProjectOffers listingId={parts[1]} />
    }
    if (parts[0] === 'project' && parts[1] && parts[2] === 'manage') {
      return <ProjectManage listingId={parts[1]} />
    }
    if (parts[0] === 'leads' && parts[1] && parts[2] === 'quote') {
      return <QuoteBuilder applicationId={parts[1]} />
    }

    // Commercial Agents / Representation marketplace
    if (parts[0] === 'commercial-agents') {
      if (!parts[1]) return <CommercialAgentsHome />
      if (parts[1] === 'manufacturers' && parts[2]) {
        return <ManufacturerProfilePage slug={parts[2]} />
      }
      if (parts[1] === 'manufacturers') {
        return <CommercialAgentsDirectory mode="manufacturers" />
      }
      if (parts[1] === 'representatives' && parts[2]) {
        return <AgentProfilePage slug={parts[2]} />
      }
      if (parts[1] === 'representatives') {
        return <CommercialAgentsDirectory mode="agents" />
      }
      if (parts[1] === 'opportunities' && parts[2]) {
        return <OpportunityDetailPage id={parts[2]} />
      }
      if (parts[1] === 'opportunities') {
        return <CommercialAgentsDirectory mode="opportunities" />
      }
      if (parts[1] === 'dashboard') return <CommercialAgentsDashboard />
      return <CommercialAgentsHome />
    }

    // SEO: /de/darmstadt/elektriker
    if (
      parts.length === 3 &&
      isSeoLocale(parts[0])
    ) {
      return <SeoMarketLanding parts={parts} />
    }

    // Geo SEO: /spain/alicante/electricians or /spain/alicante/alicante/plumbers
    if (parts.length === 3 || parts.length === 4) {
      const geo = parseGeoServicePath(parts)
      if (geo && findServiceBySlug(geo.tradeSlug)) {
        return (
          <ServiceResults
            slug={geo.tradeSlug}
            initialGeo={{
              country: geo.country,
              province: geo.province,
              city: geo.city,
              radius: '25',
            }}
          />
        )
      }
    }

    // Short SEO aliases: /electrician, /plumber, /lawyer, …
    if (parts.length === 1 && !isReservedAppPath(parts[0])) {
      const aliasOrSlug = SEO_SERVICE_ALIASES[parts[0].toLowerCase()] ?? parts[0].toLowerCase()
      if (findServiceBySlug(aliasOrSlug)) {
        return <ServiceResults slug={aliasOrSlug} />
      }
    }

    switch (path) {
      case '/':              return <Home />
      case '/search':        return <SearchPage />
      case '/map':           return <MapExplore />
      case '/categories':    return <Categories />
      case '/professionals': return <Professionals />
      case '/companies':     return <Companies />
      case '/listings':      return <Listings />
      case '/vacancies':
      case '/jobs':          return <Listings fixedCategorySlug="vacancies" />
      case '/sell-rent':
      case '/buy-sell':      return <Listings fixedCategorySlug="sell-rent" />
      case '/contact':       return <Contact />
      case '/advertise':
      case '/advertising':   return <Advertising />
      case '/login':         return <Login />
      case '/register':      return <Register />
      case '/auth/callback': return <AuthCallback />
      case '/dashboard':     return <Dashboard />
      case '/admin':
      case '/admin/panel':   return <RedirectToOwnerCabinet />
      case '/pro/dashboard':
      case '/pro':           return <ProDashboard />
      case '/pro/calendar':
      case '/calendar':      return <ProCalendar />
      case '/customer/dashboard':
      case '/customer':
      case '/my':            return <CustomerDashboard />
      case '/cost-estimator':
      case '/estimate':      return <CostEstimator />
      case '/cost-estimator/history':
      case '/estimate/history': return <CostEstimatorHistory />
      case '/settings':      return <Settings />
      case '/notifications': return <Notifications />
      case '/profile':       return <Profile />
      case '/my-listings':   return <MyListings />
      case '/messages':      return <Messages />
      case '/favorites':     return <Favorites />
      case '/create-ad':     return <CreateAd />
      case '/create-project':
      case '/project/new':   return <CreateProject />
      case '/my-projects':   return <MyProjects />
      case '/projects':
      case '/leads':         return <ProjectFeed />
      case '/assistant':     return <AiAssistant />
      case '/assistant/job': return <JobRequestChat />
      case '/analytics':     return <Analytics />
      case '/admin/ai':        return <AiAdmin />
      case '/admin/marketing-agent': return <MarketingAgentAdmin />
      case '/admin/official-sources': return <OfficialSourcesAdmin />
      case '/legal-documents':
      case '/documents': return <DocumentsHub />
      case '/checkout':      return <Checkout />
      case '/boost':         return <BoostProfile />
      case '/pricing':
      case '/plans':         return <Pricing />
      case '/billing':       return <Billing />
      case '/for-professionals': return <ForProfessionals />
      case '/for-companies':     return <ForCompanies />
      case '/for-advertisers':   return <ForAdvertisers />
      case '/verification':  return <Verification />
      default:               return <Home />
    }
  }

  return (
    <AppProvider>
      <PwaInstallProvider>
      <PaidAdsProvider>
        <div className="app-shell min-h-screen flex flex-col">
          <ErrorBoundary name="Header">
            <Header />
          </ErrorBoundary>
          <main className="flex-1">
            <ErrorBoundary
              name="Page"
              resetKey={path}
              fallbackTitle="This page could not be loaded"
              fallbackMessage="Please try again or go back to the home page. Your account session is still safe."
            >
              <PageWithSideAds>
                <Suspense fallback={<PageLoading />}>{getPage()}</Suspense>
              </PageWithSideAds>
            </ErrorBoundary>
          </main>
          <ErrorBoundary name="Footer">
            <Footer />
          </ErrorBoundary>
          <ErrorBoundary name="MobileBottomNav">
            <MobileBottomNav />
          </ErrorBoundary>
          <ErrorBoundary name="AiChat">
            <AiChatWidget />
          </ErrorBoundary>
          <ErrorBoundary name="PwaInstall">
            <PwaInstallPrompt />
          </ErrorBoundary>
        </div>
      </PaidAdsProvider>
      </PwaInstallProvider>
    </AppProvider>
  )
}

export default App
