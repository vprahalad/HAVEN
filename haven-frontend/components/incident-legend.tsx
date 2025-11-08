"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

export default function IncidentLegend() {
  const [isMinimized, setIsMinimized] = useState(false)

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-lg overflow-hidden shadow-lg">
      {/* Header with minimize button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="w-full px-3 py-2 md:px-4 md:py-3 flex items-center justify-between bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
      >
        <h3 className="font-semibold text-sm md:text-base text-slate-100">Legend</h3>
        {isMinimized ? (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {/* Legend content - collapsible */}
      {!isMinimized && (
        <div className="p-3 md:p-4 text-xs md:text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-red-500 border border-red-700 flex-shrink-0"></div>
              <span className="text-slate-300">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-orange-500 border border-orange-700 flex-shrink-0"></div>
              <span className="text-slate-300">High</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-amber-400 border border-amber-600 flex-shrink-0"></div>
              <span className="text-slate-300">Medium/Low</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 flex-shrink-0"></div>
              <span className="text-slate-300">Safe Zone</span>
            </div>
          </div>

          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-slate-700">
            <p className="text-xs text-slate-400">Solid: Verified. Faded: Unverified.</p>
          </div>
        </div>
      )}
    </div>
  )
}
