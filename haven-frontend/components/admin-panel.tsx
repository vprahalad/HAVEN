"use client"
import useSWR from "swr"
import { getIncidents } from "@/lib/api"
import AdminIncidentsTab from "./admin-incidents-tab"
import AdminSafeZonesTab from "./admin-safe-zones-tab"
import type { Incident } from "@/lib/types"

interface AdminPanelProps {
  tab: "incidents" | "safe-zones"
  onTabChange: (tab: "incidents" | "safe-zones") => void
  selectedIncident: Incident | null
}

export default function AdminPanel({ tab, onTabChange, selectedIncident }: AdminPanelProps) {
  const { data: incidents } = useSWR("/api/incidents", () => getIncidents(), {
    refreshInterval: 5000,
  })

  const verifiedCount = incidents?.filter((i: Incident) => i.status === "verified").length || 0
  const unverifiedCount = incidents?.filter((i: Incident) => i.status === "unverified").length || 0

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div className="border-b border-slate-700 bg-slate-900/50 flex">
        <button
          onClick={() => onTabChange("incidents")}
          className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
            tab === "incidents" ? "border-b-2 border-blue-600 text-blue-400" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Incidents
        </button>
        <button
          onClick={() => onTabChange("safe-zones")}
          className={`flex-1 px-4 py-3 font-medium text-sm transition-colors ${
            tab === "safe-zones" ? "border-b-2 border-blue-600 text-blue-400" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Safe Zones
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {tab === "incidents" && (
          <AdminIncidentsTab
            verifiedCount={verifiedCount}
            unverifiedCount={unverifiedCount}
            selectedIncident={selectedIncident}
          />
        )}
        {tab === "safe-zones" && <AdminSafeZonesTab />}
      </div>
    </div>
  )
}
