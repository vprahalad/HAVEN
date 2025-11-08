"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Upload, MapPin, Loader } from "lucide-react"
import { postReport } from "@/lib/api"

interface ReportFormProps {
  onSubmit: (result: any) => void
}

export default function ReportForm({ onSubmit }: ReportFormProps) {
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [description, setDescription] = useState("")
  const [useCurrentLocation, setUseCurrentLocation] = useState(false)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [address, setAddress] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleGetLocation = () => {
    setLoading(true)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
          setUseCurrentLocation(true)
          setAddress("") // Clear address when using current location
          setLoading(false)
        },
        (error) => {
          setError("Unable to access your location")
          setLoading(false)
        },
      )
    }
  }

  const parseCoordinates = (input: string): { lat: number; lng: number } | null => {
    // Try to parse coordinates in various formats:
    // "lat, lng" or "lat,lng" or "lat, lng"
    const trimmed = input.trim()
    
    // Match patterns like: "40.7128, -74.0060" or "40.7128,-74.0060" or "40.7128 -74.0060"
    const coordPattern = /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
    const match = trimmed.match(coordPattern)
    
    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      
      // Validate coordinate ranges
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
    
    // Try to parse as coordinates
    const coords = parseCoordinates(value)
    if (coords) {
      setLocation(coords)
      setUseCurrentLocation(false)
    } else if (value.trim() === "") {
      // Clear location if address is cleared
      setLocation(null)
    }
    // If it's not coordinates, keep it as address (will be geocoded by backend)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (!image) {
        throw new Error("Please select an image")
      }

      // Validate that either location (coordinates) or address is provided
      if (!location && (!address || !address.trim())) {
        throw new Error("Please provide a location (coordinates or address)")
      }

      const formData = new FormData()
      formData.append("image", image)
      formData.append("description", description)
      
      // If location is set (from coordinates or current location), use it
      if (location) {
        formData.append("latitude", location.lat.toString())
        formData.append("longitude", location.lng.toString())
      }
      
      // If address is provided and not coordinates, send it for geocoding
      if (address && address.trim() && !parseCoordinates(address)) {
        formData.append("address", address.trim())
      }

      const result = await postReport(formData)
      onSubmit(result)
    } catch (err: any) {
      setError(err.message || "Failed to submit report")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-100">Report Incident</h2>
        <p className="text-slate-400">Upload an image and describe the hazard</p>
      </div>

      {/* Image Upload */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Image</label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 hover:bg-slate-700/20 transition-colors"
        >
          {preview ? (
            <div className="space-y-2">
              <img src={preview || "/placeholder.svg"} alt="Preview" className="max-h-64 mx-auto rounded" />
              <p className="text-sm text-slate-400">Click to change image</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-sm font-medium text-slate-300">Drop image or click to select</p>
              <p className="text-xs text-slate-500">PNG, JPG up to 10MB</p>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Description (optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what you see, damage level, people affected..."
          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          rows={4}
        />
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">Location</label>
        {location ? (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-sm font-medium text-slate-100">
                {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </p>
              {address && !parseCoordinates(address) && <p className="text-xs text-slate-400">{address}</p>}
            </div>
          </div>
        ) : address && address.trim() && !parseCoordinates(address) ? (
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-yellow-400" />
            <div>
              <p className="text-sm font-medium text-slate-100">Address: {address}</p>
              <p className="text-xs text-slate-400">Will be geocoded on submit</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400">No location selected</p>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? "Getting location..." : "Use My Current Location"}
          </button>
          <input
            type="text"
            placeholder="Or enter address or coordinates (e.g., 40.7128, -74.0060)"
            value={address}
            onChange={handleAddressChange}
            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          {location && !useCurrentLocation && (
            <p className="text-xs text-slate-400">
              Coordinates detected: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3 text-red-300 text-sm">{error}</div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !image || (!location && !address?.trim())}
        className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Report"
        )}
      </button>
    </form>
  )
}
