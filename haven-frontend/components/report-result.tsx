"use client"

import { CheckCircle, AlertCircle } from "lucide-react"
import type { ClassificationResult } from "@/lib/types"

interface ReportResultProps {
  result: ClassificationResult
  onBack: () => void
}

export default function ReportResult({ result, onBack }: ReportResultProps) {
  const severityColor = {
    low: "text-yellow-400",
    medium: "text-amber-400",
    high: "text-orange-400",
    critical: "text-red-400",
  }

  const severityBg = {
    low: "bg-yellow-900/20",
    medium: "bg-amber-900/20",
    high: "bg-orange-900/20",
    critical: "bg-red-900/20",
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 space-y-6 max-w-md mx-auto">
      <div className="text-center">
        {result.incident_created ? (
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        ) : (
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
        )}
        <h2 className="text-2xl font-bold text-slate-100">Report Submitted</h2>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">Classification</p>
          <div className={`px-4 py-3 rounded-lg ${severityBg[result.severity as keyof typeof severityBg]}`}>
            <p className={`font-semibold capitalize ${severityColor[result.severity as keyof typeof severityColor]}`}>
              {result.hazard_type}
            </p>
            <p className={`text-sm ${severityColor[result.severity as keyof typeof severityColor]}`}>
              Severity: {result.severity}
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">Status</p>
          <p className="text-slate-300">
            {result.incident_created
              ? "New incident created and broadcasted to admin"
              : "Report added to existing incident"}
          </p>
        </div>

        {result.message && (
          <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
            <p className="text-sm text-slate-300">{result.message}</p>
          </div>
        )}
      </div>

      <button
        onClick={onBack}
        className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
      >
        Back to Map
      </button>
    </div>
  )
}
