"use client"

import { useState } from "react"
import { Volume2, X, Navigation } from "lucide-react"
import type { Route } from "@/lib/types"

interface RoutePanelProps {
  route: Route
  safeZoneName?: string
  onClose: () => void
}

export default function RoutePanel({ route, safeZoneName, onClose }: RoutePanelProps) {
  const [speaking, setSpeaking] = useState(false)

  const handleSpeak = () => {
    setSpeaking(true)
    const summary = `Route to safe zone. Distance: ${(route.distance * 0.000621371).toFixed(1)} miles. Duration: approximately ${Math.round(route.duration / 60)} minutes.`

    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(summary)
      utterance.onend = () => setSpeaking(false)
      window.speechSynthesis.speak(utterance)
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-400" />
          {safeZoneName ? `Route to ${safeZoneName}` : "Safe Route"}
        </h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Distance</p>
          <p className="text-2xl font-bold text-blue-400">{(route.distance * 0.000621371).toFixed(1)} mi</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Estimated Duration</p>
          <p className="text-2xl font-bold text-blue-400">{Math.round(route.duration / 60)} min</p>
        </div>

        {route.steps && route.steps.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-300">Directions</p>
            <div className="space-y-1">
              {route.steps.map((step, idx) => (
                <div key={idx} className="bg-slate-900/50 rounded p-2 text-xs text-slate-300">
                  <p className="font-medium">{step.instruction}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            onClick={handleSpeak}
            disabled={speaking}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <Volume2 className="w-4 h-4" />
            {speaking ? "Speaking..." : "Speak Route"}
          </button>
        </div>
      </div>
    </div>
  )
}
