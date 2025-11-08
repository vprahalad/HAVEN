"use client"

import { AlertTriangle } from "lucide-react"
import Link from "next/link"

interface TopNavProps {
  role: "Citizen" | "Admin"
}

export default function TopNav({ role }: TopNavProps) {
  return (
    <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h1 className="text-xl font-bold">HAVEN</h1>
        </Link>
        <div className="px-3 py-1 bg-slate-800 border border-slate-700 rounded text-sm font-medium">{role}</div>
      </div>
    </div>
  )
}
