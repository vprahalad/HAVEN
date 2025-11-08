"use client"

import type React from "react"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Shield, Plus } from "lucide-react"
import { getSafeZones, createSafeZone } from "@/lib/api"
import type { SafeZone } from "@/lib/types"

export default function AdminSafeZonesTab() {
  const { data: safeZones } = useSWR("/api/safe-zones", () => getSafeZones())
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    accessible: true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const latitude = Number.parseFloat(formData.latitude)
    const longitude = Number.parseFloat(formData.longitude)

    if (isNaN(latitude) || isNaN(longitude)) {
      console.error("Invalid latitude or longitude")
      return
    }

    setLoading(true)

    try {
      await createSafeZone({
        name: formData.name,
        address: formData.address,
        latitude,
        longitude,
        accessible: formData.accessible,
      })
      mutate("/api/safe-zones")
      setFormData({ name: "", address: "", latitude: "", longitude: "", accessible: true })
      setShowForm(false)
    } catch (error) {
      console.error("Error creating safe zone:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add Button */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Safe Zone
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-700 bg-slate-900/30 space-y-2">
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
            required
          />
          <input
            type="text"
            placeholder="Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Latitude"
              step="0.0001"
              value={formData.latitude}
              onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
              className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
            <input
              type="number"
              placeholder="Longitude"
              step="0.0001"
              value={formData.longitude}
              onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
              className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-600"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.accessible}
              onChange={(e) => setFormData({ ...formData, accessible: e.target.checked })}
              className="rounded"
            />
            Wheelchair Accessible
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-sm font-medium transition-colors"
            >
              {loading ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {!safeZones || safeZones.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">No safe zones</div>
        ) : (
          <div className="space-y-1 p-2">
            {safeZones.map((zone: SafeZone) => (
              <div
                key={zone.id}
                className="p-2 rounded text-xs bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <Shield className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-100 truncate">{zone.name}</p>
                    <p className="text-slate-400 text-xs truncate">{zone.address}</p>
                    <div className="flex gap-1 mt-1">
                      {zone.accessible && (
                        <span className="px-1 py-0.5 rounded text-xs bg-blue-900/50 text-blue-300">Accessible</span>
                      )}
                      {zone.active ? (
                        <span className="px-1 py-0.5 rounded text-xs bg-green-900/50 text-green-300">Active</span>
                      ) : (
                        <span className="px-1 py-0.5 rounded text-xs bg-slate-700 text-slate-300">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
