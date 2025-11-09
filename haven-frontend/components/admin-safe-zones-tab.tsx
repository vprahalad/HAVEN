"use client"

import type React from "react"

import { useState } from "react"
import useSWR, { mutate } from "swr"
import { Shield, Plus, Edit2, Trash2, X } from "lucide-react"
import { getSafeZones, createSafeZone, updateSafeZone, deleteSafeZone } from "@/lib/api"
import type { SafeZone } from "@/lib/types"

export default function AdminSafeZonesTab() {
  const { data: safeZones } = useSWR("/api/safe-zones?active=false", () => getSafeZones(false))
  const [showForm, setShowForm] = useState(false)
  const [editingZone, setEditingZone] = useState<SafeZone | null>(null)
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState<number | string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    accessible: true,
    active: true,
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
      if (editingZone) {
        // Update existing safe zone
        await updateSafeZone(editingZone.id, {
          name: formData.name,
          address: formData.address,
          latitude,
          longitude,
          accessible: formData.accessible,
          active: formData.active,
        })
      } else {
        // Create new safe zone
        await createSafeZone({
          name: formData.name,
          address: formData.address,
          latitude,
          longitude,
          accessible: formData.accessible,
        })
      }
      mutate("/api/safe-zones")
      setFormData({ name: "", address: "", latitude: "", longitude: "", accessible: true, active: true })
      setShowForm(false)
      setEditingZone(null)
    } catch (error) {
      console.error(`Error ${editingZone ? "updating" : "creating"} safe zone:`, error)
      alert(`Failed to ${editingZone ? "update" : "create"} safe zone. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (zone: SafeZone) => {
    setEditingZone(zone)
    setFormData({
      name: zone.name,
      address: zone.address,
      latitude: zone.latitude.toString(),
      longitude: zone.longitude.toString(),
      accessible: zone.accessible,
      active: zone.active,
    })
    setShowForm(true)
  }

  const handleDelete = async (zone: SafeZone) => {
    if (!confirm(`Are you sure you want to delete "${zone.name}"? This action cannot be undone.`)) {
      return
    }

    setProcessing(zone.id)
    try {
      await deleteSafeZone(zone.id)
      // Refresh the safe zones list
      mutate("/api/safe-zones?active=false")
      mutate("/api/safe-zones")
    } catch (error) {
      console.error("Error deleting safe zone:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      if (errorMessage.includes("not found")) {
        // Safe zone was already deleted, refresh the list
        mutate("/api/safe-zones?active=false")
        mutate("/api/safe-zones")
        alert("Safe zone was not found. It may have already been deleted. The list has been refreshed.")
      } else {
        alert(`Failed to delete safe zone: ${errorMessage}`)
      }
    } finally {
      setProcessing(null)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingZone(null)
    setFormData({ name: "", address: "", latitude: "", longitude: "", accessible: true, active: true })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Add Button */}
      <div className="p-4 border-b border-slate-700 bg-slate-900/50">
        <button
          onClick={() => {
            if (showForm) {
              handleCancel()
            } else {
              setShowForm(true)
              setEditingZone(null)
            }
          }}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {editingZone ? "Cancel Edit" : "Add Safe Zone"}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-700 bg-slate-900/30 space-y-2">
          {editingZone && (
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-200">Editing: {editingZone.name}</h3>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
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
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.accessible}
                onChange={(e) => setFormData({ ...formData, accessible: e.target.checked })}
                className="rounded"
              />
              Wheelchair Accessible
            </label>
            {editingZone && (
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                Active
              </label>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white rounded text-sm font-medium transition-colors"
            >
              {loading ? (editingZone ? "Updating..." : "Creating...") : (editingZone ? "Update" : "Create")}
            </button>
            <button
              type="button"
              onClick={handleCancel}
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
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(zone)}
                      disabled={processing === zone.id}
                      className="p-1 rounded hover:bg-slate-700 text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(zone)}
                      disabled={processing === zone.id}
                      className="p-1 rounded hover:bg-slate-700 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
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
