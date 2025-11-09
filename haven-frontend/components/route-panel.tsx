"use client"

import { useState } from "react"
import { Volume2, X, Navigation, ChevronDown, ChevronUp, Menu } from "lucide-react"
import type { Route } from "@/lib/types"

interface RoutePanelProps {
  route: Route
  safeZoneName?: string
  onClose: () => void
  isMinimized?: boolean
  onToggleMinimize?: () => void
}

export default function RoutePanel({ route, safeZoneName, onClose, isMinimized = false, onToggleMinimize }: RoutePanelProps) {
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

  if (isMinimized) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
        <button
          onClick={onToggleMinimize}
          className="border-b border-slate-700 bg-slate-900/50 px-3 py-3 flex items-center justify-center hover:bg-slate-800/50 transition-colors"
          title="Expand route details"
        >
          <Menu className="w-5 h-5 text-slate-300" />
        </button>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Navigation className="w-6 h-6 text-blue-400 mx-auto mb-1" />
            <div className="text-xs text-slate-400 mb-1">Route</div>
            <div className="text-lg font-semibold text-blue-400">{(route.distance * 0.000621371).toFixed(1)} mi</div>
            <div className="text-xs text-slate-400">{Math.round(route.duration / 60)} min</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="border-t border-slate-700 bg-slate-900/50 px-3 py-2 flex items-center justify-center hover:bg-slate-800/50 transition-colors"
          title="Close route"
        >
          <X className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="border-b border-slate-700 bg-slate-900/50 px-4 py-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-blue-400" />
          {safeZoneName ? `Route to ${safeZoneName}` : "Safe Route"}
        </h2>
        <div className="flex items-center gap-2">
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1.5 hover:bg-slate-700/50 rounded transition-colors md:hidden"
              title="Minimize"
              aria-label="Minimize route panel"
            >
              <ChevronDown className="w-4 h-4 text-slate-300" />
            </button>
          )}
          {onToggleMinimize && (
            <button
              onClick={onToggleMinimize}
              className="p-1.5 hover:bg-slate-700/50 rounded transition-colors hidden md:block"
              title="Minimize"
              aria-label="Minimize route panel"
            >
              <ChevronUp className="w-4 h-4 text-slate-300" />
            </button>
          )}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200" title="Close route">
            <X className="w-4 h-4" />
          </button>
        </div>
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
