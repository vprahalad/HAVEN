"use client"

import { useState } from "react"
import Link from "next/link"
import { Camera, Navigation, HeaterIcon as HeatmapIcon } from "lucide-react"
import { getRoute } from "@/lib/api"
import type { Route } from "@/lib/types"

interface FloatingActionsProps {
  onHeatmapToggle: (show: boolean) => void
  showHeatmap: boolean
  onRouteFound: (route: Route) => void
}

export default function FloatingActions({ onHeatmapToggle, showHeatmap, onRouteFound }: FloatingActionsProps) {
  const [findingRoute, setFindingRoute] = useState(false)

  const handleFindRoute = async () => {
    setFindingRoute(true)
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const route = await getRoute(position.coords.latitude, position.coords.longitude)
              onRouteFound(route)
            } catch (error) {
              console.error("Route fetch error:", error)
              // Show mock route for demo
              const mockRoute: Route = {
                distance: 2500,
                duration: 600,
                steps: [
                  { instruction: "Head north on current street", distance: 500, duration: 120 },
                  { instruction: "Turn right towards safe zone", distance: 1200, duration: 300 },
                  { instruction: "Arrive at Central Park North", distance: 800, duration: 180 },
                ],
              }
              onRouteFound(mockRoute)
            }
          },
          (error) => {
            console.error("Geolocation error:", error)
            alert("Unable to get your location. Using NYC center for demo.")
            // Use NYC center as fallback
            const mockRoute: Route = {
              distance: 3000,
              duration: 900,
              steps: [{ instruction: "Navigate towards nearest safe zone", distance: 3000, duration: 900 }],
            }
            onRouteFound(mockRoute)
          },
        )
      }
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
