import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";

// Public pages
import AuthPage            from "./pages/AuthPage";
import Unauthorized        from "./pages/Unauthorized";
import GoogleCallbackPage  from "./pages/auth/GoogleCallbackPage";

// Marketing
import Home from "./pages/Home";

// Dashboards
import InventorDashboard     from "./pages/dashboards/InventorDashboard";
import InvestorDashboard     from "./pages/dashboards/InvestorDashboard";
import OrganizationDashboard from "./pages/dashboards/OrganizationDashboard";
import AdminDashboard        from "./pages/dashboards/AdminDashboard";

// Startup module
import MyStartups     from "./pages/startups/MyStartups";
import CreateStartup  from "./pages/startups/CreateStartup";
import EditStartup    from "./pages/startups/EditStartup";
import StartupDetails from "./pages/startups/StartupDetails";

// Verification module
import StartupVerification  from "./pages/verification/StartupVerification";
import InvestorVerification from "./pages/verification/InvestorVerification";
import VerificationRedirect from "./pages/verification/VerificationRedirect";

// Discovery
import DiscoverStartups from "./pages/discover/DiscoverStartups";
import DiscoverPeople   from "./pages/discover/DiscoverPeople";

// Investor pages
import SavedStartups      from "./pages/investor/SavedStartups";
import FollowingStartups  from "./pages/investor/FollowingStartups";
import MyInvestments      from "./pages/investor/MyInvestments";
import InvestmentOffers   from "./pages/investor/InvestmentOffers";

// Organization pages
import OrgPrograms      from "./pages/organization/OrgPrograms";
import OrgApplications  from "./pages/organization/OrgApplications";
import OrgStartups      from "./pages/organization/OrgStartups";
import OrgReports       from "./pages/organization/OrgReports";
import FeedPage          from "./pages/feed/FeedPage";
import PostHistory       from "./pages/feed/PostHistory";
import MessagesPage      from "./pages/messages/MessagesPage";
import NotificationsPage from "./pages/notifications/NotificationsPage";

// Network
import NetworkPage from "./pages/network/NetworkPage";

// Profile
import ProfilePage     from "./pages/profile/ProfilePage";
import ProfileSettings from "./pages/profile/ProfileSettings";

// Route guard
import ProtectedRoute from "./routes/ProtectedRoute";

// Search
import SearchResultsPage from "./pages/search/SearchResultsPage";

function MarketingLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {children}
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ── */}
          <Route path="/"                    element={<AuthPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/unauthorized"         element={<Unauthorized />} />

          {/* ── Marketing ── */}
          <Route path="/home" element={<MarketingLayout><Home /></MarketingLayout>} />

          {/* ── Search results ── */}
          <Route path="/search" element={
            <ProtectedRoute><SearchResultsPage /></ProtectedRoute>
          } />

          {/* ── Startup details (any logged-in user) ── */}
          <Route path="/startups/:id" element={
            <ProtectedRoute><StartupDetails /></ProtectedRoute>
          } />

          {/* ── Discover startups (any logged-in user) ── */}
          <Route path="/discover" element={
            <ProtectedRoute><DiscoverStartups /></ProtectedRoute>
          } />

          {/* ── Social (non-admin users only) ── */}
          <Route path="/feed" element={
            <ProtectedRoute><FeedPage /></ProtectedRoute>
          } />
          <Route path="/feed/history" element={
            <ProtectedRoute roles={["inventor","investor","organization"]}><PostHistory /></ProtectedRoute>
          } />
          <Route path="/messages" element={
            <ProtectedRoute roles={["inventor","investor","organization"]}><MessagesPage /></ProtectedRoute>
          } />
          <Route path="/messages/:conversationId" element={
            <ProtectedRoute roles={["inventor","investor","organization"]}><MessagesPage /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute><NotificationsPage /></ProtectedRoute>
          } />
          <Route path="/network" element={
            <ProtectedRoute roles={["inventor","investor","organization"]}><NetworkPage /></ProtectedRoute>
          } />
          <Route path="/network/discover" element={
            <ProtectedRoute roles={["inventor","investor","organization"]}><DiscoverPeople /></ProtectedRoute>
          } />

          {/* ── Profile (any logged-in user) ── */}
          <Route path="/profile/:id" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />
          <Route path="/settings/profile" element={
            <ProtectedRoute><ProfileSettings /></ProtectedRoute>
          } />

          {/* ── Inventor / Founder ── */}
          <Route path="/inventor/dashboard" element={
            <ProtectedRoute roles={["inventor"]}>
              <InventorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/inventor/startups" element={
            <ProtectedRoute roles={["inventor"]}>
              <MyStartups />
            </ProtectedRoute>
          } />
          <Route path="/inventor/startups/new" element={
            <ProtectedRoute roles={["inventor"]}>
              <CreateStartup />
            </ProtectedRoute>
          } />
          <Route path="/inventor/startups/:id/edit" element={
            <ProtectedRoute roles={["inventor", "admin"]}>
              <EditStartup />
            </ProtectedRoute>
          } />
          {/* Founder investment offers page */}
          <Route path="/inventor/investment-offers" element={
            <ProtectedRoute roles={["inventor"]}>
              <InvestmentOffers />
            </ProtectedRoute>
          } />

          {/* ── Investor ── */}
          <Route path="/investor/dashboard" element={
            <ProtectedRoute roles={["investor"]}>
              <InvestorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/investor/saved" element={
            <ProtectedRoute roles={["investor"]}>
              <SavedStartups />
            </ProtectedRoute>
          } />
          <Route path="/investor/following" element={
            <ProtectedRoute roles={["investor"]}>
              <FollowingStartups />
            </ProtectedRoute>
          } />
          <Route path="/investor/investments" element={
            <ProtectedRoute roles={["investor"]}>
              <MyInvestments />
            </ProtectedRoute>
          } />

          {/* ── Organization ── */}
          <Route path="/organization/dashboard" element={
            <ProtectedRoute roles={["organization"]}>
              <OrganizationDashboard />
            </ProtectedRoute>
          } />
          <Route path="/organization/programs" element={
            <ProtectedRoute roles={["organization"]}><OrgPrograms /></ProtectedRoute>
          } />
          <Route path="/organization/applications" element={
            <ProtectedRoute roles={["organization"]}><OrgApplications /></ProtectedRoute>
          } />
          <Route path="/organization/startups" element={
            <ProtectedRoute roles={["organization"]}><OrgStartups /></ProtectedRoute>
          } />
          <Route path="/organization/reports" element={
            <ProtectedRoute roles={["organization"]}><OrgReports /></ProtectedRoute>
          } />

          {/* ── Admin ── */}
          <Route path="/admin/dashboard"   element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"        element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/startups"     element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/investors"    element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/verifications" element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/categories"   element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/industries"   element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/reports"      element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/posts"        element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/investments"  element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/suspended"    element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/audit-logs"   element={<ProtectedRoute roles={["admin"]}><AdminDashboard /></ProtectedRoute>} />

          {/* ── Verification ── */}
          {/* Generic sidebar link — redirects to the user's first startup verify page */}
          <Route path="/inventor/startups/verify" element={
            <ProtectedRoute roles={["inventor"]}>
              <VerificationRedirect />
            </ProtectedRoute>
          } />
          <Route path="/inventor/startups/:startupId/verify" element={
            <ProtectedRoute roles={["inventor", "admin"]}>
              <StartupVerification />
            </ProtectedRoute>
          } />
          <Route path="/investor/verification" element={
            <ProtectedRoute roles={["investor"]}>
              <InvestorVerification />
            </ProtectedRoute>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
