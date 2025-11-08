"use client"

import { useState, useCallback } from "react"
import MapView from "@/components/map-view"
import IncidentList from "@/components/incident-list"
import TopNav from "@/components/top-nav"
import FloatingActions from "@/components/floating-actions"
import RoutePanel from "@/components/route-panel"
import type { Incident, Route } from "@/lib/types"

export default function DashboardPage() {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [route, setRoute] = useState<Route | null>(null)

  const handleIncidentSelect = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
  }, [])

  return (
    <div className="h-screen bg-slate-900 flex flex-col">
      <TopNav role="Citizen" />

      <div className="flex-1 flex flex-col md:flex-row gap-3 md:gap-4 p-3 md:p-4 overflow-hidden">
        {/* Map */}
        <div className="flex-1 rounded-lg overflow-hidden shadow-lg border border-slate-700 relative order-2 md:order-1 min-h-64 md:min-h-0">
          <MapView
            mode={showHeatmap ? "heatmap" : "pins"}
            selectedIncident={selectedIncident}
            onIncidentSelect={handleIncidentSelect}
            route={route}
          />
          <FloatingActions onHeatmapToggle={setShowHeatmap} showHeatmap={showHeatmap} onRouteFound={setRoute} />
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-80 flex flex-col gap-4 order-1 md:order-2">
          {route ? (
            <RoutePanel route={route} onClose={() => setRoute(null)} />
          ) : (
            <IncidentList selectedIncident={selectedIncident} onSelectIncident={handleIncidentSelect} />
          )}
        </div>
      </div>
    </div>
  )
}
