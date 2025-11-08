"use client"

import Link from "next/link"
import { AlertTriangle, Shield, Navigation } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold tracking-tight">HAVEN</h1>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 text-balance">
              Hazard Alert & Visual Emergency Network
            </h2>
            <p className="text-xl md:text-2xl text-slate-300 text-balance max-w-3xl mx-auto mb-8">
              Real-time hazard detection through crowdsourced image intelligence and AI classification
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <AlertTriangle className="w-8 h-8 text-red-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Incident Detection</h3>
              <p className="text-slate-400">Report hazards with images and location for instant AI analysis</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <Shield className="w-8 h-8 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Safe Zones</h3>
              <p className="text-slate-400">Find verified shelters and evacuation locations in real-time</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition-colors">
              <Navigation className="w-8 h-8 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Smart Routing</h3>
              <p className="text-slate-400">Receive optimized routes away from hazards to safety</p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors text-center"
            >
              Open Citizen Map
            </Link>
            <Link
              href="/admin"
              className="px-8 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors text-center border border-slate-600"
            >
              Open Admin Dashboard
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-700 bg-slate-900/50 py-8 mt-20">
        <div className="max-w-6xl mx-auto px-4 text-center text-slate-400 text-sm">
          <p>HAVEN — Emergency Response Network | Map-based hazard coordination</p>
        </div>
      </footer>
    </div>
  )
}
