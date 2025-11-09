"use client"

import useSWR from "swr"
import { AlertTriangle, Clock, ChevronDown, ChevronUp, Menu } from "lucide-react"
import { getIncidents } from "@/lib/api"
import type { Incident } from "@/lib/types"

interface IncidentListProps {
  selectedIncident: Incident | null
  onSelectIncident: (incident: Incident) => void
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

export default function IncidentList({ selectedIncident, onSelectIncident, isMinimized = false, onToggleMinimize }: IncidentListProps) {
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

  if (isMinimized) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
        <button
          onClick={onToggleMinimize}
          className="border-b border-slate-700 bg-slate-900/50 px-3 py-3 flex items-center justify-center hover:bg-slate-800/50 transition-colors"
          title="Expand incidents list"
        >
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xs text-slate-400 mb-1">Incidents</div>
            <div className="text-lg font-semibold text-slate-200">{sorted.length}</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100">Recent Incidents</h2>
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors md:hidden"
            title="Minimize"
            aria-label="Minimize incidents list"
          >
            <ChevronDown className="w-4 h-4 text-slate-300" />
          </button>
        )}
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="p-1.5 hover:bg-slate-700/50 rounded transition-colors hidden md:block"
            title="Minimize"
            aria-label="Minimize incidents list"
          >
            <ChevronUp className="w-4 h-4 text-slate-300" />
          </button>
        )}
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
