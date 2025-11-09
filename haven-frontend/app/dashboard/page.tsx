"use client"

import { useState, useCallback, useEffect } from "react"
import MapView from "@/components/map-view"
import IncidentList from "@/components/incident-list"
import IncidentDetail from "@/components/incident-detail"
import TopNav from "@/components/top-nav"
import FloatingActions from "@/components/floating-actions"
import RoutePanel from "@/components/route-panel"
import LocationPicker from "@/components/location-picker"
import { getRoute } from "@/lib/api"
import type { Incident, Route, SafeZone } from "@/lib/types"

// Default user location - Times Square, NYC
const DEFAULT_USER_LOCATION = {
  lat: 40.758,
  lng: -73.9855,
}

const STORAGE_KEY = "haven_user_starting_location"

export default function DashboardPage() {
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [selectedSafeZone, setSelectedSafeZone] = useState<SafeZone | null>(null)
  const [routeLoading, setRouteLoading] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [isIncidentsMinimized, setIsIncidentsMinimized] = useState(false)
  const [isRouteMinimized, setIsRouteMinimized] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number }>(DEFAULT_USER_LOCATION)

  // Load saved location from localStorage on mount
  useEffect(() => {
    // Check if we're in the browser (not SSR)
    if (typeof window === 'undefined') return

    const savedLocation = localStorage.getItem(STORAGE_KEY)
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation)
        if (parsed.lat && parsed.lng) {
          setUserLocation(parsed)
          return // Don't use geolocation if we have a saved location
        }
      } catch (e) {
        console.error("Failed to parse saved location:", e)
      }
    }

    // If no saved location, try to get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          setUserLocation(location)
          // Save to localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
          }
        },
        (error) => {
          console.error("Geolocation error:", error)
          // Keep default location if geolocation fails
        }
      )
    }
  }, [])

  // Save location to localStorage whenever it changes
  const handleLocationChange = useCallback((location: { lat: number; lng: number } | null) => {
    if (location) {
      setUserLocation(location)
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(location))
      }
    } else {
      setUserLocation(DEFAULT_USER_LOCATION)
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

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
    setRoute(null) // Clear previous route
    
    try {
      // Use the stored user location
      const userLat = userLocation.lat
      const userLng = userLocation.lng
      
      // Calculate route to the selected safe zone
      const response = await getRoute(userLat, userLng, safeZone.id)
      
      // Use polyline from API response
      setRoute(response.route)
      
      // Update selected safe zone from response
      if (response.safe_zone) {
        setSelectedSafeZone(response.safe_zone)
      }
      
      // Check if route passes through danger zones and notify user
      if (response.route.passes_through_danger) {
        alert("⚠️ Warning: This route passes through danger zones. Consider using the 'Find Safe Route' button to find an alternative path.")
      }
    } catch (error) {
      console.error("Error fetching route:", error)
      alert("Unable to calculate route. Please try again or select a different safe zone.")
      setRoute(null)
    } finally {
      setRouteLoading(false)
    }
  }, [userLocation])

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
            userLocation={userLocation}
          />
          <FloatingActions 
            onHeatmapToggle={setShowHeatmap} 
            showHeatmap={showHeatmap}
            userLocation={userLocation}
            onRouteFound={(route, safeZone) => {
              setRoute(route)
              if (safeZone) {
                setSelectedSafeZone(safeZone)
              }
            }}
            onLocationClick={() => setShowLocationPicker(true)}
          />
          {showLocationPicker && (
            <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-30">
              <LocationPicker
                location={userLocation}
                onLocationChange={handleLocationChange}
                onClose={() => setShowLocationPicker(false)}
              />
            </div>
          )}
        </div>

        {/* Side Panel */}
        <div className={`${(isIncidentsMinimized || isRouteMinimized) ? 'w-auto md:w-12' : 'w-full md:w-80'} flex flex-col gap-4 order-1 md:order-2 transition-all duration-300`}>
          {routeLoading ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 flex items-center justify-center">
              <p className="text-slate-300">Loading route...</p>
            </div>
          ) : route ? (
            <RoutePanel 
              route={route} 
              safeZoneName={selectedSafeZone?.name}
              isMinimized={isRouteMinimized}
              onToggleMinimize={() => setIsRouteMinimized(!isRouteMinimized)}
              onClose={() => {
                setRoute(null)
                setSelectedSafeZone(null)
                setIsRouteMinimized(false)
              }} 
            />
          ) : selectedIncident ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
              <IncidentDetail incident={selectedIncident} onClose={handleCloseIncident} isAdmin={false} />
            </div>
          ) : (
            <IncidentList 
              selectedIncident={selectedIncident} 
              onSelectIncident={handleIncidentSelect}
              isMinimized={isIncidentsMinimized}
              onToggleMinimize={() => setIsIncidentsMinimized(!isIncidentsMinimized)}
            />
          )}
        </div>
      </div>
    </div>
  )
}
