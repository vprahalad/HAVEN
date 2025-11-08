"use client"

import useSWR from "swr"
import { AlertTriangle } from "lucide-react"
import { getIncidents } from "@/lib/api"
import type { Incident } from "@/lib/types"

interface AdminIncidentsTabProps {
  verifiedCount: number
  unverifiedCount: number
  selectedIncident: Incident | null
}

export default function AdminIncidentsTab({
  verifiedCount,
  unverifiedCount,
  selectedIncident,
}: AdminIncidentsTabProps) {
  const { data: incidents } = useSWR("/api/incidents", () => getIncidents(), {
    refreshInterval: 5000,
  })

  const sorted = [...(incidents || [])].sort(
    (a: Incident, b: Incident) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-xs text-slate-400">Verified</p>
          <p className="text-lg font-bold text-green-400">{verifiedCount}</p>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <p className="text-xs text-slate-400">Unverified</p>
          <p className="text-lg font-bold text-yellow-400">{unverifiedCount}</p>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">No incidents</div>
        ) : (
          <div className="space-y-1 p-2">
            {sorted.map((incident: Incident) => {
              const isSelected = selectedIncident?.id === incident.id
              const timeAgo = new Date(incident.created_at)
              const now = new Date()
              const mins = Math.floor((now.getTime() - timeAgo.getTime()) / 60000)

              return (
                <div
                  key={incident.id}
                  className={`p-2 rounded text-xs cursor-pointer transition-colors hover:bg-slate-700/30 ${
                    isSelected ? "bg-slate-700/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-100 capitalize truncate">{incident.hazard_type}</p>
                      <div className="flex gap-1 mt-0.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs ${
                            incident.status === "verified"
                              ? "bg-green-900/50 text-green-300"
                              : "bg-yellow-900/50 text-yellow-300"
                          }`}
                        >
                          {incident.status}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs bg-slate-700 text-slate-300">
                          {incident.severity}
                        </span>
                      </div>
                      <p className="text-slate-500 mt-0.5">{mins}m ago</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
