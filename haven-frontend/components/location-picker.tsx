"use client"

import { useState, useEffect } from "react"
import { MapPin, Loader, X } from "lucide-react"

interface LocationPickerProps {
  location: { lat: number; lng: number } | null
  onLocationChange: (location: { lat: number; lng: number } | null) => void
  onClose?: () => void
}

export default function LocationPicker({ location, onLocationChange, onClose }: LocationPickerProps) {
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)

  // Initialize address from location if provided
  useEffect(() => {
    if (location) {
      setAddress(`${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`)
    }
  }, [location])

  const handleGetLocation = () => {
    setLoading(true)
    setError("")
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          }
          onLocationChange(newLocation)
          setAddress(`${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)}`)
          setUseCurrentLocation(true)
          setLoading(false)
        },
        (error) => {
          setError("Unable to access your location. Please enable location services.")
          setLoading(false)
        },
      )
    } else {
      setError("Geolocation is not supported by your browser.")
      setLoading(false)
    }
  }

  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    const trimmed = input.trim()
    const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
    const match = trimmed.match(coordPattern)

    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return { lat, lng }
      }
    }

    return null
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setAddress(value)
    setError("")

    const coords = parseCoordinates(value)
    if (coords) {
      onLocationChange(coords)
      setUseCurrentLocation(false)
    } else if (value.trim() === "") {
      onLocationChange(null)
    }
  }

  const handleSave = () => {
    if (!location) {
      setError("Please provide a location (coordinates or use current location)")
      return
    }
    // Location is already updated via onLocationChange, just close if handler provided
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-100">Set Starting Location</h3>
          <p className="text-sm text-slate-400">This location will be used as the starting point for all routes</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Location Display */}
      {location ? (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-100">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
            {useCurrentLocation && <p className="text-xs text-slate-400">Using current location</p>}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 text-center">
          <p className="text-sm text-slate-400">No location set</p>
        </div>
      )}

      {/* Location Input */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Getting location...
            </>
          ) : (
            <>
              <MapPin className="w-4 h-4" />
              Use My Current Location
            </>
          )}
        </button>
        <div className="text-center text-xs text-slate-500">or</div>
        <input
          type="text"
          placeholder="Enter coordinates (e.g., 40.7128, -74.0060) or address"
          value={address}
          onChange={handleAddressChange}
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        {location && !useCurrentLocation && (
          <p className="text-xs text-slate-400">
            Coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Save Button */}
      {onClose && (
        <button
          onClick={handleSave}
          disabled={!location}
          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          Save Location
        </button>
      )}
    </div>
  )
}

