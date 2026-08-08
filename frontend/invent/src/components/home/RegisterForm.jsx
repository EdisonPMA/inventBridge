import { useState } from "react";
import { Eye, EyeOff, Lightbulb, TrendingUp, Building2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";
import AccountTypeCard from "./AccountTypeCard";
import { registerUser } from "../../services/authApi";
import { getDashboardRoute } from "../../services/dashboardApi";
import GoogleAuthButton from "../auth/GoogleAuthButton";

const ACCOUNT_TYPES = [
  { value: "inventor", icon: Lightbulb, title: "Inventor / Startup", description: "Create a startup profile and find investors to fund your idea." },
  { value: "investor", icon: TrendingUp, title: "Investor", description: "Discover startups and emerging investment opportunities." },
  { value: "organization", icon: Building2, title: "Organization", description: "Support innovation, mentor startups, and drive startup growth." },
];

export default function RegisterForm({ onSwitchToLogin }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("inventor");
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required.";
    if (!form.email.trim()) e.email = "Email is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email.";
    if (!form.password) e.password = "Password is required.";
    else if (form.password.length < 8) e.password = "Minimum 8 characters.";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setErrors({});
    setLoading(true);
    try {
      const nameParts = form.fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || nameParts[0];
      const { token, user } = await registerUser({
        firstName, lastName,
        email: form.email.trim(),
        password: form.password,
        phone: form.phone || undefined,
        role: accountType,
      });
      login(user, token);
      // Investors must complete verification before accessing the platform
      if (user.role === "investor") {
        navigate("/investor/verification");
      } else {
        navigate(getDashboardRoute(user.role));
      }
    } catch (err) {
      setErrors({ general: err.message || "Registration failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError) =>
    `w-full rounded-xl border ${hasError ? "border-red-300 focus:ring-red-100" : "border-slate-200 focus:border-primary focus:ring-primary/20"} bg-white/80 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-2`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {errors.general && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errors.general}</div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-slate-700">I want to join as</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {ACCOUNT_TYPES.map((type) => (
            <AccountTypeCard key={type.value} icon={type.icon} title={type.title} description={type.description}
              selected={accountType === type.value} onClick={() => setAccountType(type.value)} />
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="reg-fullname" className="mb-1.5 block text-sm font-medium text-slate-700">Full name</label>
        <input id="reg-fullname" type="text" autoComplete="name" required value={form.fullName}
          onChange={update("fullName")} placeholder="Jane Doe" className={inputClass(errors.fullName)} />
        {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
      </div>

      <div>
        <label htmlFor="reg-email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
        <input id="reg-email" type="email" autoComplete="email" required value={form.email}
          onChange={update("email")} placeholder="you@example.com" className={inputClass(errors.email)} />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="reg-phone" className="mb-1.5 block text-sm font-medium text-slate-700">
          Phone <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input id="reg-phone" type="tel" autoComplete="tel" value={form.phone}
          onChange={update("phone")} placeholder="+1 555 000 0000" className={inputClass(false)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
          <div className="relative">
            <input id="reg-password" type={showPassword ? "text" : "password"} autoComplete="new-password"
              required value={form.password} onChange={update("password")} placeholder="Min. 8 characters"
              className={`${inputClass(errors.password)} pr-11`} />
            <button type="button" onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide" : "Show"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
        </div>
        <div>
          <label htmlFor="reg-confirm" className="mb-1.5 block text-sm font-medium text-slate-700">Confirm password</label>
          <div className="relative">
            <input id="reg-confirm" type={showConfirm ? "text" : "password"} autoComplete="new-password"
              required value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="Repeat password"
              className={`${inputClass(errors.confirmPassword)} pr-11`} />
            <button type="button" onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              aria-label={showConfirm ? "Hide" : "Show"}>
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            Creating account…
          </span>
        ) : (
          <><UserPlus className="h-4 w-4" /> Create Account</>
        )}
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs text-slate-400">or sign up with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleAuthButton
        label="Sign up with Google"
        onError={msg => setErrors(prev => ({ ...prev, general: msg }))}
      />

      <p className="text-center text-xs text-slate-400">
        By joining, you agree to our{" "}
        <button type="button" className="font-medium text-primary hover:underline">Terms of Service</button>{" "}
        and <button type="button" className="font-medium text-primary hover:underline">Privacy Policy</button>.
      </p>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <button type="button" onClick={onSwitchToLogin} className="font-semibold text-primary hover:underline">Sign in</button>
      </p>
    </form>
  );
}
