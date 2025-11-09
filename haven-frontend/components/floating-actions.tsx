"use client"

import { useState } from "react"
import Link from "next/link"
import { Camera, Navigation, HeaterIcon as HeatmapIcon, MapPin } from "lucide-react"
import { getRoute } from "@/lib/api"
import type { Route, SafeZone } from "@/lib/types"

interface FloatingActionsProps {
  onHeatmapToggle: (show: boolean) => void
  showHeatmap: boolean
  userLocation: { lat: number; lng: number }
  onRouteFound: (route: Route, safeZone?: SafeZone) => void
  onLocationClick: () => void
}

export default function FloatingActions({ onHeatmapToggle, showHeatmap, userLocation, onRouteFound, onLocationClick }: FloatingActionsProps) {
  const [findingRoute, setFindingRoute] = useState(false)

  const handleFindRoute = async () => {
    setFindingRoute(true)
    try {
      // Use the set user location instead of geolocation
      const response = await getRoute(userLocation.lat, userLocation.lng)
      // Display the route and safe zone - route will be shown on the map
      onRouteFound(response.route, response.safe_zone)
    } catch (error) {
      console.error("Route fetch error:", error)
      alert("Unable to calculate a safe route. Please try again or ensure there are active safe zones available.")
    } finally {
      setFindingRoute(false)
    }
  }

  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-3 z-20">
      <div className="relative group">
        <button
          onClick={handleFindRoute}
          disabled={findingRoute}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-full p-4 shadow-lg transition-all flex items-center gap-2 hover:shadow-xl hover:scale-110 disabled:scale-100"
          title="Find safe route"
        >
          <Navigation className="w-5 h-5" />
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Find Safe Route
        </div>
      </div>

      <div className="relative group">
        <button
          onClick={onLocationClick}
          className="bg-green-600 hover:bg-green-700 text-white rounded-full p-4 shadow-lg transition-all flex items-center gap-2 hover:shadow-xl hover:scale-110"
          title="Set starting location"
        >
          <MapPin className="w-5 h-5" />
        </button>
        <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Set Starting Location
        </div>
      </div>

      <button
        onClick={() => onHeatmapToggle(!showHeatmap)}
        className={`rounded-full p-4 shadow-lg transition-all flex items-center gap-2 hover:shadow-xl hover:scale-110 ${
          showHeatmap ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-slate-700 hover:bg-slate-600 text-slate-100"
        }`}
        title="Toggle heatmap view"
      >
        <HeatmapIcon className="w-5 h-5" />
      </button>

      <Link
        href="/report"
        className="bg-red-600 hover:bg-red-700 text-white rounded-full p-4 shadow-lg transition-all flex items-center gap-2 hover:shadow-xl hover:scale-110"
        title="Report incident"
      >
        <Camera className="w-5 h-5" />
      </Link>
    </div>
  )
}
