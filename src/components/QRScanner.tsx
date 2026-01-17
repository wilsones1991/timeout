'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (cardId: string) => void
  isEnabled: boolean
  hideControls?: boolean
  onCamerasDetected?: (cameras: CameraDevice[], selectionMode: SelectionMode) => void
  selectedCamera?: { facingMode?: FacingMode; deviceId?: string }
  scannerId?: string
}

export type FacingMode = 'user' | 'environment'
export type CameraDevice = { id: string; label: string }
export type SelectionMode = 'flip' | 'dropdown' | 'none'

const STORAGE_KEY = 'qr-scanner-camera-preference'

type StoredPreference = {
  facingMode?: FacingMode
  deviceId?: string
}

function loadStoredPreference(): StoredPreference | null {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as StoredPreference
    }
  } catch (err) {
    console.debug('Failed to load camera preference:', err)
  }
  return null
}

function savePreference(pref: StoredPreference): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
  } catch (err) {
    console.debug('Failed to save camera preference:', err)
  }
}

function isMobileDevice(cameras: CameraDevice[]): boolean {
  // Only use flip mode if cameras explicitly have front/back labels
  // This avoids false positives on laptops with multiple webcams or touchscreens
  if (cameras.length !== 2) return false
  const labels = cameras.map(c => c.label.toLowerCase())
  return labels.some(l =>
    l.includes('front') || l.includes('back') || l.includes('facing')
  )
}

// Helper to safely stop and clear scanner
async function stopScanner(scanner: Html5Qrcode | null): Promise<void> {
  if (!scanner) return

  try {
    const state = scanner.getState()
    // State 2 = SCANNING, State 3 = PAUSED
    if (state === 2 || state === 3) {
      await scanner.stop()
    }
    scanner.clear()
  } catch (err) {
    // Ignore errors during cleanup - scanner may already be stopped
    console.debug('Scanner cleanup:', err)
  }
}

export default function QRScanner({ onScan, isEnabled, hideControls, onCamerasDetected, selectedCamera, scannerId = 'qr-reader' }: Props) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('user') // Default to front camera
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('none')
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null)
  const [camerasDetected, setCamerasDetected] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  const isStartingRef = useRef(false)
  const isCleaningUpRef = useRef(false)

  // Use external camera selection if provided
  const effectiveFacingMode = selectedCamera?.facingMode ?? facingMode
  const effectiveDeviceId = selectedCamera?.deviceId ?? selectedCameraId

  // Keep onScan ref updated to avoid stale closures in scanner callback
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  // Detect available cameras on mount and determine selection mode
  useEffect(() => {
    async function detectCameras() {
      try {
        const devices = await Html5Qrcode.getCameras()
        const cameraList: CameraDevice[] = devices.map(d => ({
          id: d.id,
          label: d.label || `Camera ${d.id.slice(0, 8)}`
        }))
        setCameras(cameraList)

        // Determine selection mode
        let mode: SelectionMode = 'none'
        if (cameraList.length <= 1) {
          mode = 'none'
        } else if (isMobileDevice(cameraList)) {
          mode = 'flip'
          // Load stored facingMode preference for mobile
          const stored = loadStoredPreference()
          if (stored?.facingMode) {
            setFacingMode(stored.facingMode)
          }
        } else {
          mode = 'dropdown'
          // Load stored deviceId preference for desktop
          const stored = loadStoredPreference()
          if (stored?.deviceId && cameraList.some(c => c.id === stored.deviceId)) {
            setSelectedCameraId(stored.deviceId)
          } else {
            // Default to first camera
            setSelectedCameraId(cameraList[0].id)
          }
        }
        setSelectionMode(mode)
        setCamerasDetected(true)

        // Notify parent of detected cameras
        onCamerasDetected?.(cameraList, mode)
      } catch (err) {
        console.debug('Could not detect cameras:', err)
        setSelectionMode('none')
        setCamerasDetected(true)
        onCamerasDetected?.([], 'none')
      }
    }
    detectCameras()
  }, [onCamerasDetected])

  useEffect(() => {
    // Don't start until camera detection is complete
    if (!camerasDetected) return

    // Don't start if disabled or no container
    if (!isEnabled || !containerRef.current) {
      // Clean up if we were scanning
      if (scannerRef.current) {
        const scanner = scannerRef.current
        scannerRef.current = null
        setIsScanning(false)
        isCleaningUpRef.current = true
        stopScanner(scanner).finally(() => {
          isCleaningUpRef.current = false
        })
      }
      return
    }

    // Don't start if already running or starting (cleanup is handled by waiting inside startScanner)
    if (scannerRef.current || isStartingRef.current) return

    let cancelled = false
    isStartingRef.current = true

    async function startScanner() {
      // Wait for any ongoing cleanup to complete (e.g., during camera switch)
      while (isCleaningUpRef.current) {
        await new Promise(resolve => setTimeout(resolve, 50))
        if (cancelled) {
          isStartingRef.current = false
          return
        }
      }

      const scanner = new Html5Qrcode(scannerId)

      try {
        // Determine camera constraint based on selection mode
        // Use effective values that prefer external selection if provided
        const cameraIdOrConfig = selectionMode === 'dropdown' && effectiveDeviceId
          ? effectiveDeviceId
          : { facingMode: effectiveFacingMode }

        await scanner.start(
          cameraIdOrConfig,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 }
          },
          (decodedText) => {
            onScanRef.current(decodedText)
          },
          () => {
            // Ignore scan failures (no QR code in frame)
          }
        )

        if (!cancelled) {
          scannerRef.current = scanner
          setIsScanning(true)
          setError(null)
        } else {
          // Cleanup if cancelled during start
          await stopScanner(scanner)
        }
      } catch (err) {
        // Clean up the scanner instance on error
        await stopScanner(scanner)

        if (cancelled) return

        // Ignore AbortError - happens during cleanup/strict mode
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        console.error('Failed to start scanner:', err)
        if (err instanceof Error) {
          if (err.message.includes('Permission')) {
            setError('Camera permission denied. Please allow camera access or use manual entry.')
          } else if (err.message.includes('NotFoundError') || err.message.includes('No camera')) {
            setError('No camera found. Please use manual entry.')
          } else {
            setError(`Camera error: ${err.message}`)
          }
        } else {
          setError('Failed to start camera. Please use manual entry.')
        }
        setShowManualEntry(true)
      } finally {
        isStartingRef.current = false
      }
    }

    startScanner()

    return () => {
      cancelled = true
      isStartingRef.current = false
      if (scannerRef.current) {
        const scanner = scannerRef.current
        scannerRef.current = null
        setIsScanning(false)
        isCleaningUpRef.current = true
        stopScanner(scanner).finally(() => {
          isCleaningUpRef.current = false
        })
      }
    }
  }, [isEnabled, effectiveFacingMode, effectiveDeviceId, selectionMode, camerasDetected, scannerId])

  const switchCamera = useCallback(() => {
    setFacingMode(prev => {
      const newMode = prev === 'user' ? 'environment' : 'user'
      savePreference({ facingMode: newMode })
      return newMode
    })
  }, [])

  const handleCameraSelect = useCallback((deviceId: string) => {
    setSelectedCameraId(deviceId)
    savePreference({ deviceId })
  }, [])

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = manualEntry.trim()
    if (trimmed) {
      onScan(trimmed)
      setManualEntry('')
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* Scanner Container */}
      <div className="relative w-full max-w-md aspect-square bg-black rounded-2xl overflow-hidden">
        <div
          id={scannerId}
          ref={containerRef}
          className="w-full h-full [&_video]:w-full! [&_video]:h-full! [&_video]:object-cover! [&>div]:w-full! [&>div]:h-full! [&>div]:border-none!"
        />

        {!isScanning && !error && isEnabled && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <svg className="animate-spin h-10 w-10 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-lg">Starting camera...</p>
            </div>
          </div>
        )}

        {!isEnabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <div className="text-center text-white">
              <svg className="h-16 w-16 mx-auto mb-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400">Scanner paused</p>
            </div>
          </div>
        )}

        {/* Scanning Frame Overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Shadow/vignette effect outside scanning area */}
            <div className="absolute inset-0" style={{ boxShadow: 'inset 0 0 0 9999px rgba(0, 0, 0, 0.5)' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-lg" style={{ boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)' }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-white/80 rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
              </div>
            </div>
          </div>
        )}

        {/* Camera Switch Button (Mobile - flip mode) */}
        {!hideControls && isScanning && selectionMode === 'flip' && (
          <button
            onClick={switchCamera}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            aria-label={`Switch to ${effectiveFacingMode === 'user' ? 'rear' : 'front'} camera`}
            title={`Switch to ${effectiveFacingMode === 'user' ? 'rear' : 'front'} camera`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}

        {/* Camera Dropdown (Desktop - dropdown mode) */}
        {!hideControls && isScanning && selectionMode === 'dropdown' && cameras.length > 1 && (
          <div className="absolute top-3 right-3">
            <select
              value={effectiveDeviceId || ''}
              onChange={(e) => handleCameraSelect(e.target.value)}
              className="px-3 py-2 bg-black/50 hover:bg-black/70 text-white text-sm rounded-lg border-none outline-none cursor-pointer appearance-none pr-8"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px' }}
              aria-label="Select camera"
            >
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id} className="bg-gray-800">
                  {cam.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-center max-w-md">
          {error}
        </div>
      )}

      {/* Instructions */}
      {isScanning && (
        <div className="mt-4 text-center">
          <p className="text-lg text-gray-600">
            Hold your QR code card up to the camera
          </p>
          {selectionMode === 'flip' && (
            <p className="text-sm text-gray-500 mt-1">
              Using {effectiveFacingMode === 'user' ? 'front' : 'rear'} camera
            </p>
          )}
          {selectionMode === 'dropdown' && effectiveDeviceId && (
            <p className="text-sm text-gray-500 mt-1">
              {cameras.find(c => c.id === effectiveDeviceId)?.label || 'Camera'}
            </p>
          )}
        </div>
      )}

      {/* Manual Entry Toggle */}
      <button
        onClick={() => setShowManualEntry(!showManualEntry)}
        className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        {showManualEntry ? 'Hide manual entry' : 'Enter card ID manually'}
      </button>

      {/* Manual Entry Form */}
      {showManualEntry && (
        <form onSubmit={handleManualSubmit} className="mt-4 w-full max-w-md">
          <div className="flex gap-2">
            <input
              type="text"
              value={manualEntry}
              onChange={(e) => setManualEntry(e.target.value)}
              placeholder="Enter card ID"
              className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!manualEntry.trim()}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Submit
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
