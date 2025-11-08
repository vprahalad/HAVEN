"use client"

import useSWR from "swr"
import { AlertTriangle, Clock } from "lucide-react"
import { getIncidents } from "@/lib/api"
import type { Incident } from "@/lib/types"

interface IncidentListProps {
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident) => void
}

export default function IncidentList({ selectedIncident, onSelectIncident }: IncidentListProps) {
  const { data: incidents } = useSWR("/api/incidents", () => getIncidents(), {
    refreshInterval: 5000,
  })

  if (!incidents) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-slate-400">Loading incidents...</div>
    )
  }

  const sorted = [...(incidents || [])].sort(
    (a: Incident, b: Incident) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3">
        <h2 className="font-semibold text-slate-100">Recent Incidents</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">No incidents reported yet</div>
        ) : (
          sorted.map((incident: Incident) => {
            const isSelected = selectedIncident?.id === incident.id
            const timeAgo = new Date(incident.created_at)
            const now = new Date()
            const mins = Math.floor((now.getTime() - timeAgo.getTime()) / 60000)

            return (
              <button
                key={incident.id}
                onClick={() => onSelectIncident(incident)}
                className={`w-full px-4 py-3 text-left border-b border-slate-700 hover:bg-slate-700/30 transition-colors ${
                  isSelected ? "bg-slate-700/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-slate-100 capitalize">{incident.hazard_type}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                      <Clock className="w-3 h-3" />
                      {mins < 1 ? "just now" : `${mins}m ago`}
                    </div>
                    <div className="text-xs mt-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded ${
                          incident.status === "verified"
                            ? "bg-green-900/50 text-green-300"
                            : "bg-yellow-900/50 text-yellow-300"
                        }`}
                      >
                        {incident.status}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
