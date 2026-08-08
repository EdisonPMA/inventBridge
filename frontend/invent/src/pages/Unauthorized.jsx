import { Link, useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import Button from "../components/common/Button";
import { useAuth } from "../hooks/useAuth";
import { getDashboardRoute } from "../services/dashboardApi";

export default function Unauthorized() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleGoToDashboard = () => {
    if (isAuthenticated && user?.role) {
      navigate(getDashboardRoute(user.role));
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-red-100">
          <ShieldAlert className="h-10 w-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Access Denied</h1>
        <p className="mt-3 text-slate-500">
          You don&apos;t have permission to access this page. This area is restricted to specific roles.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={handleGoToDashboard}>
            Go to My Dashboard
          </Button>
          <Button variant="secondary" as={Link} to="/">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
