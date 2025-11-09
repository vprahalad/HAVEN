"use client"

import { useEffect, useRef, useState } from "react"
import useSWR from "swr"
import { getIncidents, getSafeZones } from "@/lib/api"
import IncidentLegend from "./incident-legend"
import type { Incident, SafeZone, Route } from "@/lib/types"

interface MapViewProps {
  mode: "pins" | "heatmap"
  selectedIncident: Incident | null
  onIncidentSelect: (incident: Incident) => void
  route?: Route | null
  onSafeZoneSelect?: (safeZone: SafeZone) => void
  selectedSafeZone?: SafeZone | null
}

// Color helpers
const getIncidentColor = (severity: string, isVerified: boolean) => {
  if (severity === "critical") return "#ef4444"
  if (severity === "high") return "#f97316"
  if (severity === "medium") return "#f59e0b"
  return "#fbbf24"
}

// Default user location - Times Square, NYC
const DEFAULT_USER_LOCATION = {
  lat: 40.758,
  lng: -73.9855,
}

const MOCK_NYC_INCIDENTS: Incident[] = [
  {
    id: "nyc-flood-1",
    hazard_type: "Flooding",
    severity: "critical",
    status: "verified",
    impact_radius: 2,
    latitude: 40.7505,
    longitude: -73.9755,
    created_at: new Date().toISOString(),
    report_count: 12,
  },
  {
    id: "nyc-fire-1",
    hazard_type: "Fire",
    severity: "high",
    status: "verified",
    impact_radius: 1.5,
    latitude: 40.7282,
    longitude: -73.7949,
    created_at: new Date().toISOString(),
    report_count: 8,
  },
  {
    id: "nyc-gas-1",
    hazard_type: "Gas Leak",
    severity: "high",
    status: "verified",
    impact_radius: 1,
    latitude: 40.758,
    longitude: -73.9855,
    created_at: new Date().toISOString(),
    report_count: 5,
  },
  {
    id: "nyc-accident-1",
    hazard_type: "Traffic Accident",
    severity: "medium",
    status: "unverified",
    impact_radius: 0.5,
    latitude: 40.7489,
    longitude: -73.968,
    created_at: new Date().toISOString(),
    report_count: 3,
  },
]

const MOCK_NYC_SAFE_ZONES: SafeZone[] = [
  {
    id: "safe-zone-1",
    name: "Central Park North",
    address: "Central Park, New York, NY",
    latitude: 40.8002,
    longitude: -73.9662,
    accessible: true,
    active: true,
    capacity: 5000,
  },
  {
    id: "safe-zone-2",
    name: "Washington Square Park",
    address: "Washington Square Park, New York, NY",
    latitude: 40.7305,
    longitude: -73.9902,
    accessible: true,
    active: true,
    capacity: 3000,
  },
  {
    id: "safe-zone-3",
    name: "Riverside Park",
    address: "Riverside Park, New York, NY",
    latitude: 40.7769,
    longitude: -73.9776,
    accessible: true,
    active: true,
    capacity: 4000,
  },
  {
    id: "safe-zone-4",
    name: "Prospect Park",
    address: "Prospect Park, Brooklyn, NY",
    latitude: 40.6602,
    longitude: -73.9776,
    accessible: true,
    active: true,
    capacity: 6000,
  },
]

// Helper function to calculate distance between two coordinates
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Helper function to check if a point is within hazard impact radius
const isInHazardZone = (lat: number, lng: number, incidents: Incident[]): boolean => {
  return incidents.some((incident) => {
    const distance = calculateDistance(lat, lng, incident.latitude, incident.longitude)
    return distance < incident.impact_radius
  })
}

const generateEvacuationRoute = (
  userLat: number,
  userLng: number,
  safeZones: SafeZone[],
  incidents: Incident[],
): Route => {
  // Find the nearest safe zone
  let nearestZone = safeZones[0]
  let minDistance = calculateDistance(userLat, userLng, nearestZone.latitude, nearestZone.longitude)

  for (let i = 1; i < safeZones.length; i++) {
    const distance = calculateDistance(userLat, userLng, safeZones[i].latitude, safeZones[i].longitude)
    if (distance < minDistance) {
      minDistance = distance
      nearestZone = safeZones[i]
    }
  }

  // Create waypoints that avoid hazard zones
  const waypoints = [{ lat: userLat, lng: userLng }]

  // Check if direct route crosses hazard zone, if so add avoidance waypoint
  const midpointLat = (userLat + nearestZone.latitude) / 2
  const midpointLng = (userLng + nearestZone.longitude) / 2

  if (isInHazardZone(midpointLat, midpointLng, incidents)) {
    // Add an avoidance waypoint perpendicular to direct line
    const offset = 0.02 // Approx 2km offset
    waypoints.push({ lat: midpointLat + offset, lng: midpointLng + offset })
  }

  waypoints.push({ lat: nearestZone.latitude, lng: nearestZone.longitude })

  // Calculate route metrics
  let totalDistance = 0
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(waypoints[i].lat, waypoints[i].lng, waypoints[i + 1].lat, waypoints[i + 1].lng)
  }

  return {
    distance: totalDistance * 1000, // Convert to meters
    duration: Math.round(totalDistance * 60 * 60), // Approximate duration: 1 km per minute walking
    steps: [
      {
        instruction: `Head towards ${nearestZone.name}`,
        distance: totalDistance * 1000,
        duration: Math.round(totalDistance * 60 * 60),
      },
      {
        instruction: `Avoid hazard zones marked in red`,
        distance: 0,
        duration: 0,
      },
      {
        instruction: `Arrive at ${nearestZone.name}`,
        distance: 0,
        duration: 0,
      },
    ],
    polyline: encodePolyline(waypoints),
  }
}

// Simple polyline encoding
const encodePolyline = (waypoints: Array<{ lat: number; lng: number }>): string => {
  return JSON.stringify(waypoints)
}

// Decode polyline for display
const decodePolyline = (polyline: string): Array<{ lat: number; lng: number }> => {
  try {
    return JSON.parse(polyline)
  } catch {
    return []
  }
}

export default function MapView({ mode, selectedIncident, onIncidentSelect, route, onSafeZoneSelect, selectedSafeZone }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<any>(null)
  const markers = useRef<Map<string, any>>(new Map())
  const circles = useRef<Map<string, any>>(new Map())
  const safeZoneMarkers = useRef<Map<string, any>>(new Map())
  const heatmapLayer = useRef<any>(null)
  const heatmapLayers = useRef<Map<string, any>>(new Map())
  const polylineRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [mapReady, setMapReady] = useState(false)
  const [apiLoaded, setApiLoaded] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(11)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)

  // Helper function to get radius range in meters based on hazard type
  // Uses a seeded random based on incident ID to ensure consistency
  const getRadiusForHazardType = (hazardType: string, incidentId: string | number): number => {
    const normalizedType = hazardType.toLowerCase().trim()
    
    // Create a simple seeded random function based on incident ID
    const seed = String(incidentId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const seededRandom = () => {
      const x = Math.sin(seed) * 10000
      return x - Math.floor(x)
    }
    
    let minRadius = 100
    let maxRadius = 1000
    
    if (normalizedType.includes("forestfire") || normalizedType.includes("forest fire") || normalizedType.includes("fire")) {
      minRadius = 100
      maxRadius = 1000
    } else if (normalizedType.includes("earthquake")) {
      minRadius = 100
      maxRadius = 1000
    } else if (normalizedType.includes("sinkhole")) {
      minRadius = 25
      maxRadius = 100
    } else if (normalizedType.includes("flooding") || normalizedType.includes("flood")) {
      minRadius = 100
      maxRadius = 1000
    }
    
    return seededRandom() * (maxRadius - minRadius) + minRadius
  }

  const { data: incidents } = useSWR("/api/incidents", () => getIncidents(), {
    refreshInterval: 5000,
    fallbackData: MOCK_NYC_INCIDENTS,
    onError: () => {
      // Use mock data if API fails
    },
  })

  const { data: safeZones } = useSWR("/api/safe-zones", () => getSafeZones(), {
    fallbackData: MOCK_NYC_SAFE_ZONES,
    onError: () => {
      // Use mock data if API fails
    },
  })

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Geolocation error:", error)
          // Fallback to default location
          setUserLocation(DEFAULT_USER_LOCATION)
        }
      )
    } else {
      // Geolocation not supported, use default
      setUserLocation(DEFAULT_USER_LOCATION)
    }
  }, [])

  // Load Google Maps API
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      console.error("Google Maps API key not found")
      setApiLoaded(true)
      return
    }

    // Check if Google Maps is already loaded
    if ((window as any).google?.maps) {
      setApiLoaded(true)
      return
    }

    // Check if script tag already exists in DOM
    const existingScript = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]'
    )
    if (existingScript) {
      // Script is already being loaded, wait for it
      const checkGoogleMaps = setInterval(() => {
        if ((window as any).google?.maps) {
          clearInterval(checkGoogleMaps)
          setApiLoaded(true)
        }
      }, 100)
      
      // Cleanup interval on unmount
      return () => clearInterval(checkGoogleMaps)
    }

    // Create and add script tag
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization,geometry`
    script.async = true
    script.defer = true
    script.onload = () => {
      setApiLoaded(true)
    }
    script.onerror = () => {
      console.error("Failed to load Google Maps API")
      setApiLoaded(true) // Set to true to prevent infinite retries
    }
    document.head.appendChild(script)

    // Cleanup: remove script on unmount (optional, but good practice)
    return () => {
      // Don't remove the script as it might be used by other components
      // The script will remain in the DOM, which is fine
    }
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !apiLoaded || mapReady || !userLocation) return

    const google = (window as any).google
    if (!google?.maps) {
      setTimeout(() => {
        // Retry if maps not loaded yet
      }, 100)
      return
    }

    const mapOptions = {
      center: userLocation,
      zoom: 11,
      styles: [
        { elementType: "geometry", stylers: [{ color: "#1e293b" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#1e293b" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
        { featureType: "road", stylers: [{ color: "#334155" }] },
      ],
    }

    map.current = new google.maps.Map(mapContainer.current, mapOptions)
    
    // Set initial zoom level
    setZoomLevel(mapOptions.zoom)
    
    // Track zoom level changes
    google.maps.event.addListener(map.current, 'zoom_changed', () => {
      if (map.current) {
        setZoomLevel(map.current.getZoom())
      }
    })
    
    setMapReady(true)
  }, [apiLoaded, mapReady, userLocation])

  useEffect(() => {
    if (!mapReady || !map.current || !incidents || !safeZones || !userLocation) return

    const google = (window as any).google
    if (!google?.maps) return

    // Remove old user marker if exists
    if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null)
    }

    // Add user location marker (blue pulse marker)
    userMarkerRef.current = new google.maps.Marker({
      map: map.current,
      position: userLocation,
      title: "Your Location",
      icon: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
    })

    // Only generate and display automatic evacuation route if no route is provided
    // (route prop takes precedence, e.g., when user clicks on a safe zone)
    if (!route) {
      const evacuationRoute = generateEvacuationRoute(
        userLocation.lat,
        userLocation.lng,
        safeZones,
        incidents,
      )

      // Display the polyline on map
      if (polylineRef.current) {
        polylineRef.current.setMap(null)
      }

      const waypoints = decodePolyline(evacuationRoute.polyline || "")
      if (waypoints.length > 0) {
        polylineRef.current = new google.maps.Polyline({
          path: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          geodesic: true,
          strokeColor: "#22c55e", // Green color
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map.current,
        })
      }
    }
  }, [mapReady, incidents, safeZones, route, userLocation])

  // Display route when route prop is provided
  // Route should ONLY be displayed when explicitly calculated (button click), never on initial load
  useEffect(() => {
    if (!mapReady || !map.current) return

    const google = (window as any).google
    if (!google?.maps) return

    // Remove old polyline if exists
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    // Only display route if it exists and has a valid polyline
    // NEVER draw straight lines - only display routes calculated from Google Maps API
    if (route && route.polyline) {
      const waypoints = decodePolyline(route.polyline)
      if (waypoints.length > 0) {
        polylineRef.current = new google.maps.Polyline({
          path: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          geodesic: true,
          strokeColor: "#22c55e", // Green color
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map: map.current,
        })
      }
    }
  }, [route, mapReady])

  // Render incidents
  useEffect(() => {
    if (!mapReady || !map.current || !incidents) return

    const google = (window as any).google
    if (!google?.maps) return

    // Clear old markers and circles
    markers.current.forEach((marker) => marker.setMap(null))
    circles.current.forEach((circle) => circle.setMap(null))
    markers.current.clear()
    circles.current.clear()

    incidents.forEach((incident: Incident) => {
      const position = { lat: incident.latitude, lng: incident.longitude }
      const color = getIncidentColor(incident.severity, incident.status === "verified")
      const isVerified = incident.status === "verified"

      // Use the same radius calculation as heatmap (based on hazard type)
      const radiusMeters = getRadiusForHazardType(incident.hazard_type, incident.id)

      // Draw circle for impact radius
      const circle = new google.maps.Circle({
        center: position,
        radius: radiusMeters, // Radius in meters, same as heatmap
        fillColor: color,
        fillOpacity: isVerified ? 0.15 : 0.08,
        strokeColor: color,
        strokeWeight: isVerified ? 2 : 1,
        strokeOpacity: isVerified ? 0.4 : 0.2,
        map: mode === "pins" ? map.current : null,
      })

      circles.current.set(String(incident.id), circle)

      // Create marker
      const marker = new google.maps.Marker({
        map: mode === "pins" ? map.current : null,
        position,
        title: incident.hazard_type,
      })

      marker.addListener("click", () => {
        onIncidentSelect(incident)
        map.current?.panTo(position)
        map.current?.setZoom(13)
      })

      markers.current.set(String(incident.id), marker)
    })
  }, [incidents, mapReady, mode, onIncidentSelect])

  // Heatmap
  useEffect(() => {
    if (!mapReady || !map.current || !incidents) return

    const google = (window as any).google
    if (!google?.maps?.visualization) return

    if (mode === "heatmap") {
      const filteredIncidents = incidents.filter((inc: Incident) => inc.severity !== "low")
      
      // Convert meters to pixels based on zoom level and latitude
      // Formula: metersPerPixel = (156543.03392 * cos(lat)) / 2^zoom
      const centerLat = map.current.getCenter()?.lat() || userLocation?.lat || DEFAULT_USER_LOCATION.lat
      const metersPerPixel = (156543.03392 * Math.cos((centerLat * Math.PI) / 180)) / Math.pow(2, zoomLevel)

      // Custom gradient for darker colors in overlapping areas
      // Colors go from transparent blue (low) to red (high density/overlap)
      const gradient = [
        "rgba(0, 255, 255, 0)",      // Transparent cyan (no data)
        "rgba(0, 255, 255, 0.5)",    // Light cyan (low density)
        "rgba(0, 255, 0, 0.5)",      // Green (medium-low)
        "rgba(255, 255, 0, 0.7)",    // Yellow (medium)
        "rgba(255, 165, 0, 0.8)",    // Orange (medium-high)
        "rgba(255, 0, 0, 0.9)",      // Red (high density/overlap)
        "rgba(139, 0, 0, 1)",        // Dark red (very high density/overlap)
      ]

      // Group incidents by their radius (rounded to nearest 25m for better precision)
      const incidentGroups = new Map<number, Array<Incident>>()
      
      filteredIncidents.forEach((inc: Incident) => {
        const radiusMeters = getRadiusForHazardType(inc.hazard_type, inc.id)
        // Round to nearest 25m for grouping (smaller interval for better precision)
        const roundedRadius = Math.round(radiusMeters / 25) * 25
        if (!incidentGroups.has(roundedRadius)) {
          incidentGroups.set(roundedRadius, [])
        }
        incidentGroups.get(roundedRadius)!.push(inc)
      })

      // Clear old heatmap layers
      heatmapLayers.current.forEach((layer) => {
        layer.setMap(null)
      })
      heatmapLayers.current.clear()

      // Create a heatmap layer for each radius group
      incidentGroups.forEach((group, radiusMeters) => {
        // Calculate base weights and overlap weights for this group
        const heatmapData = group.map((inc: Incident) => {
          // Base weight based on severity
          const baseWeight = inc.severity === "critical" ? 1 : inc.severity === "high" ? 0.7 : 0.4
          
          // Calculate overlap weight - count nearby incidents within radius
          let overlapCount = 0
          const incidentRadius = getRadiusForHazardType(inc.hazard_type, inc.id)
          
          filteredIncidents.forEach((otherInc: Incident) => {
            if (inc.id !== otherInc.id) {
              const distance = calculateDistance(
                inc.latitude,
                inc.longitude,
                otherInc.latitude,
                otherInc.longitude
              ) * 1000 // Convert to meters
              
              // Check if other incident is within this incident's radius
              if (distance < incidentRadius) {
                overlapCount++
              }
            }
          })
          
          // Increase weight based on overlap (each overlap adds to the intensity)
          // Cap the multiplier to prevent excessive weights
          const overlapMultiplier = Math.min(1 + (overlapCount * 0.5), 3) // Max 3x weight
          const finalWeight = baseWeight * overlapMultiplier
          
          return {
            location: new google.maps.LatLng(inc.latitude, inc.longitude),
            weight: finalWeight,
          }
        })

        // Convert radius to pixels
        const radiusInPixels = radiusMeters / metersPerPixel

        // Create heatmap layer for this radius group
        const layer = new google.maps.visualization.HeatmapLayer({
          data: heatmapData,
          map: map.current,
          radius: radiusInPixels,
          gradient: gradient,
        })

        heatmapLayers.current.set(String(radiusMeters), layer)
      })

      markers.current.forEach((marker) => marker.setVisible(false))
      circles.current.forEach((circle) => circle.setVisible(false))
    } else if (mode === "pins") {
      // Clear all heatmap layers when switching to pins mode
      heatmapLayers.current.forEach((layer) => {
        layer.setMap(null)
      })
      heatmapLayers.current.clear()
      if (heatmapLayer.current) {
        heatmapLayer.current.setMap(null)
        heatmapLayer.current = null
      }
      markers.current.forEach((marker) => marker.setVisible(true))
      circles.current.forEach((circle) => circle.setVisible(true))
    }
  }, [mode, incidents, mapReady, zoomLevel, userLocation])

  // Safe zones
  useEffect(() => {
    if (!mapReady || !map.current || !safeZones) return

    const google = (window as any).google
    if (!google?.maps) return

    // Clear old safe zone markers
    safeZoneMarkers.current.forEach((marker) => marker.setMap(null))
    safeZoneMarkers.current.clear()

    safeZones.forEach((zone: SafeZone) => {
      const position = { lat: zone.latitude, lng: zone.longitude }

      const marker = new google.maps.Marker({
        map: map.current,
        position,
        title: zone.name,
        icon: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        zIndex: selectedSafeZone?.id === zone.id ? 1000 : 100, // Higher z-index for selected safe zone
      })

      // Add click listener to show safe zone name and trigger callback
      marker.addListener("click", () => {
        if (onSafeZoneSelect) {
          onSafeZoneSelect(zone)
          map.current?.panTo(position)
          map.current?.setZoom(13)
        }
      })

      safeZoneMarkers.current.set(String(zone.id), marker)
    })
  }, [safeZones, mapReady, onSafeZoneSelect, selectedSafeZone])

  // Pan to selected incident
  useEffect(() => {
    if (!mapReady || !map.current || !selectedIncident) return

    const position = {
      lat: selectedIncident.latitude,
      lng: selectedIncident.longitude,
    }
    map.current.panTo(position)
    map.current.setZoom(13)
  }, [selectedIncident, mapReady])

  return (
    <div className="relative h-full w-full">
      <div ref={mapContainer} className="w-full h-full bg-slate-900" />
      <div className="absolute top-4 right-4 z-10">
        <IncidentLegend />
      </div>
    </div>
  )
}
