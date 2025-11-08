"use client"

import { useState, useCallback } from "react"
import { mutate } from "swr"
import MapView from "@/components/map-view"
import TopNav from "@/components/top-nav"
import AdminPanel from "@/components/admin-panel"
import IncidentDetail from "@/components/incident-detail"
import type { Incident } from "@/lib/types"

export default function AdminPage() {
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [tab, setTab] = useState<"incidents" | "safe-zones">("incidents")

  const handleIncidentSelect = useCallback((incident: Incident | null) => {
    setSelectedIncident(incident)
  }, [])

  const handleCloseIncident = useCallback(() => {
    setSelectedIncident(null)
  }, [])

  const handleIncidentDelete = useCallback(() => {
    // Refresh the incidents list after deletion
    mutate("/api/incidents")
  }, [])

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <TopNav role="Admin" />

      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-lg border border-slate-700 order-2 md:order-1 min-h-64 md:min-h-0">
          <MapView selectedIncident={selectedIncident} onIncidentSelect={handleIncidentSelect} mode="pins" />
        </div>

        {/* Admin Panel */}
        <div className="w-full md:w-96 rounded-lg border border-slate-700 bg-slate-800/50 backdrop-blur-sm overflow-hidden flex flex-col order-1 md:order-2">
          {selectedIncident ? (
            <IncidentDetail 
              incident={selectedIncident} 
              onClose={handleCloseIncident}
              onDelete={handleIncidentDelete}
              isAdmin={true}
            />
          ) : (
            <AdminPanel 
              tab={tab} 
              onTabChange={setTab} 
              selectedIncident={selectedIncident}
              onSelectIncident={handleIncidentSelect}
            />
          )}
        </div>
      </div>
    </div>
  )
}
