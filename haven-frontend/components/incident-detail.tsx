"use client"

import { useEffect, useState } from "react"
import { X, MapPin, Clock, AlertTriangle, Trash2 } from "lucide-react"
import { getIncident, deleteIncident } from "@/lib/api"
import type { Incident, HazardReport } from "@/lib/types"

interface IncidentDetailProps {
  incident: Incident
  onClose: () => void
  onDelete?: () => void
  isAdmin?: boolean
}

export default function IncidentDetail({ incident, onClose, onDelete, isAdmin = false }: IncidentDetailProps) {
  const [fullIncident, setFullIncident] = useState<Incident | null>(incident)
  const [loading, setLoading] = useState(!incident.reports)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    // Fetch full incident with reports if not already loaded
    if (!incident.reports && incident.id) {
      setLoading(true)
      getIncident(incident.id)
        .then((data) => {
          setFullIncident(data)
          setLoading(false)
        })
        .catch((error) => {
          console.error("Failed to fetch incident details:", error)
          setLoading(false)
        })
    }
  }, [incident])

  const reports = fullIncident?.reports || []
  const timeAgo = new Date(fullIncident?.created_at || incident.created_at)
  const now = new Date()
  const mins = Math.floor((now.getTime() - timeAgo.getTime()) / 60000)

  const handleDelete = async () => {
    if (!incident.id) return
    
    if (!confirm("Are you sure you want to clear this incident? This action cannot be undone.")) {
      return
    }

    setDeleting(true)
    try {
      await deleteIncident(incident.id)
      onDelete?.()
      onClose()
    } catch (error) {
      console.error("Failed to delete incident:", error)
      alert("Failed to delete incident. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-semibold text-slate-100 capitalize">
            {fullIncident?.hazard_type || incident.hazard_type}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors text-slate-400 hover:text-slate-100"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status and Severity */}
        <div className="flex gap-2 flex-wrap">
          <span
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              fullIncident?.status === "verified"
                ? "bg-green-900/50 text-green-300"
                : "bg-yellow-900/50 text-yellow-300"
            }`}
          >
            {fullIncident?.status || incident.status}
          </span>
          <span className="px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-700 text-slate-300 capitalize">
            {fullIncident?.severity || incident.severity}
          </span>
        </div>

        {/* Location */}
        {(fullIncident?.address || incident.address) && (
          <div className="flex items-start gap-2 text-sm text-slate-300">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <span>{fullIncident?.address || incident.address}</span>
          </div>
        )}

        {/* Time */}
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          <span>{mins < 1 ? "just now" : `${mins}m ago`}</span>
        </div>

        {/* Clear Incident Button - Admin Only */}
        {isAdmin && (
          <div className="border-t border-slate-700 pt-4">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-red-600/30"
            >
              <Trash2 className="w-4 h-4" />
              <span className="font-medium">
                {deleting ? "Deleting..." : "Delete Incident"}
              </span>
            </button>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Permanently delete this incident and all associated reports
            </p>
          </div>
        )}

        {/* Reports Section */}
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-semibold text-slate-200 mb-3">
            Reports ({reports.length})
          </h3>

          {loading ? (
            <div className="text-sm text-slate-400">Loading reports...</div>
          ) : reports.length === 0 ? (
            <div className="text-sm text-slate-400">No reports available</div>
          ) : (
            <div className="space-y-4">
              {reports.map((report: HazardReport) => (
                <div
                  key={report.id}
                  className="bg-slate-900/50 rounded-lg p-3 border border-slate-700"
                >
                  {/* Report Image */}
                  {report.image_url && (
                    <div className="mb-3">
                      <img
                        src={report.image_url.startsWith('/') ? `/api${report.image_url}` : report.image_url}
                        alt={`${report.hazard_type} report`}
                        className="w-full h-48 object-cover rounded-lg border border-slate-700"
                        onError={(e) => {
                          // Fallback if image fails to load - try alternative path
                          const target = e.target as HTMLImageElement
                          const currentSrc = target.src
                          if (currentSrc.includes('/api/uploads/')) {
                            // Try without /api prefix
                            target.src = currentSrc.replace('/api/uploads/', '/uploads/')
                          } else {
                            // Hide if both paths fail
                            target.style.display = "none"
                          }
                        }}
                      />
                    </div>
                  )}

                  {/* Report Details */}
                  <div className="space-y-2">
                    {report.description && (
                      <p className="text-sm text-slate-300">{report.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="capitalize">{report.source}</span>
                      {report.confidence && (
                        <>
                          <span>•</span>
                          <span>{(report.confidence * 100).toFixed(0)}% confidence</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{new Date(report.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

