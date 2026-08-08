import { DollarSign, Percent, TrendingUp } from "lucide-react";

export default function FundingSummary({ fundingRequired = 0, equityOffered = 0, funded = 0 }) {
  const progress = fundingRequired > 0
    ? Math.min(100, Math.round((funded / fundingRequired) * 100))
    : 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
      <h3 className="font-semibold text-slate-800">Funding</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-light">
            <DollarSign className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Seeking</p>
            <p className="font-bold text-slate-900">${Number(fundingRequired).toLocaleString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
            <Percent className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Equity offered</p>
            <p className="font-bold text-slate-900">{equityOffered}%</p>
          </div>
        </div>
      </div>

      {funded > 0 && (
        <div>
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Funded
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">${Number(funded).toLocaleString()} raised of ${Number(fundingRequired).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
}
