import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupWizard from "../../components/startups/StartupWizard";
import { createStartup } from "../../services/startupApi";

export default function CreateStartup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const handleSubmit = async (data) => {
    setLoading(true);
    setError("");
    try {
      const res = await createStartup(data);
      // Redirect to the new startup's edit page so they can add team/files
      navigate(`/inventor/startups/${res.startup.id}/edit`, {
        state: { justCreated: true },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Create Startup</h1>
          <p className="mt-1 text-slate-500">Complete each step to set up your startup profile.</p>
        </div>
        <StartupWizard onSubmit={handleSubmit} loading={loading} submitError={error} />
      </div>
    </DashboardLayout>
  );
}
