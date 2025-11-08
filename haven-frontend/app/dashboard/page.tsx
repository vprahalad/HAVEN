"use client"

import { useState, useCallback } from "react"
import MapView from "@/components/map-view"
import IncidentList from "@/components/incident-list"
import IncidentDetail from "@/components/incident-detail"
import TopNav from "@/components/top-nav"
import FloatingActions from "@/components/floating-actions"
import RoutePanel from "@/components/route-panel"
import { getRoute } from "@/lib/api"
import type { Incident, Route, SafeZone } from "@/lib/types"

// Default user location - Times Square, NYC
const DEFAULT_USER_LOCATION = {
  lat: 40.758,
  lng: -73.9855,
}

export default function DashboardPage() {
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [selectedSafeZone, setSelectedSafeZone] = useState<SafeZone | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)

  const handleIncidentSelect = useCallback((incident: Incident) => {
    setSelectedIncident(incident)
    setSelectedSafeZone(null) // Clear safe zone selection when incident is selected
    setRoute(null) // Clear route when incident is selected
  }, [])

  const handleCloseIncident = useCallback(() => {
    setSelectedIncident(null)
  }, [])

  const handleSafeZoneSelect = useCallback(async (safeZone: SafeZone) => {
    setSelectedSafeZone(safeZone)
    setSelectedIncident(null) // Clear incident selection when safe zone is selected
    setRouteLoading(true)
    
    try {
      // Get user's current location or use default
      let userLat = DEFAULT_USER_LOCATION.lat
      let userLng = DEFAULT_USER_LOCATION.lng
      
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            userLat = position.coords.latitude
            userLng = position.coords.longitude
            
            try {
              const response = await getRoute(userLat, userLng, safeZone.id)
              // Add polyline to route for map display
              const routeWithPolyline: Route = {
                ...response.route,
                polyline: JSON.stringify([
                  { lat: userLat, lng: userLng },
                  { lat: safeZone.latitude, lng: safeZone.longitude },
                ]),
              }
              setRoute(routeWithPolyline)
            } catch (error) {
              console.error("Error fetching route:", error)
              // Fallback: create a simple route
              const distance = Math.sqrt(
                Math.pow((userLat - safeZone.latitude) * 111, 2) +
                Math.pow((userLng - safeZone.longitude) * 111 * Math.cos(userLat * Math.PI / 180), 2)
              ) * 1000 // Convert to meters
              const routeWithPolyline: Route = {
                distance,
                duration: Math.round((distance / 1000 / 5) * 3600), // 5 km/h walking speed
                steps: [
                  {
                    instruction: `Head towards ${safeZone.name}`,
                    distance,
                    duration: Math.round((distance / 1000 / 5) * 3600),
                  },
                  {
                    instruction: `Arrive at ${safeZone.name}`,
                    distance: 0,
                    duration: 0,
                  },
                ],
                polyline: JSON.stringify([
                  { lat: userLat, lng: userLng },
                  { lat: safeZone.latitude, lng: safeZone.longitude },
                ]),
              }
              setRoute(routeWithPolyline)
            } finally {
              setRouteLoading(false)
            }
          },
          async (error) => {
            console.error("Geolocation error:", error)
            // Use default location
            try {
              const response = await getRoute(DEFAULT_USER_LOCATION.lat, DEFAULT_USER_LOCATION.lng, safeZone.id)
              const routeWithPolyline: Route = {
                ...response.route,
                polyline: JSON.stringify([
                  { lat: DEFAULT_USER_LOCATION.lat, lng: DEFAULT_USER_LOCATION.lng },
                  { lat: safeZone.latitude, lng: safeZone.longitude },
                ]),
              }
              setRoute(routeWithPolyline)
            } catch (err) {
              console.error("Error fetching route:", err)
            } finally {
              setRouteLoading(false)
            }
          }
        )
      } else {
        // No geolocation, use default
        try {
          const response = await getRoute(DEFAULT_USER_LOCATION.lat, DEFAULT_USER_LOCATION.lng, safeZone.id)
          const routeWithPolyline: Route = {
            ...response.route,
            polyline: JSON.stringify([
              { lat: DEFAULT_USER_LOCATION.lat, lng: DEFAULT_USER_LOCATION.lng },
              { lat: safeZone.latitude, lng: safeZone.longitude },
            ]),
          }
          setRoute(routeWithPolyline)
        } catch (error) {
          console.error("Error fetching route:", error)
        } finally {
          setRouteLoading(false)
        }
      }
    } catch (error) {
      console.error("Error in safe zone selection:", error)
      setRouteLoading(false)
    }
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
            onSafeZoneSelect={handleSafeZoneSelect}
            selectedSafeZone={selectedSafeZone}
          />
          <FloatingActions onHeatmapToggle={setShowHeatmap} showHeatmap={showHeatmap} onRouteFound={setRoute} />
        </div>

        {/* Side Panel */}
        <div className="w-full md:w-80 flex flex-col gap-4 order-1 md:order-2">
          {routeLoading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 flex items-center justify-center">
              <p className="text-slate-300">Loading route...</p>
            </div>
          ) : route ? (
            <RoutePanel 
              route={route} 
              safeZoneName={selectedSafeZone?.name}
              onClose={() => {
                setRoute(null)
                setSelectedSafeZone(null)
              }} 
            />
          ) : selectedIncident ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
              <IncidentDetail incident={selectedIncident} onClose={handleCloseIncident} isAdmin={false} />
            </div>
          ) : (
            <IncidentList selectedIncident={selectedIncident} onSelectIncident={handleIncidentSelect} />
          )}
        </div>
      </div>
    </div>
  )
}
