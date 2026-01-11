'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

type Props = {
  onScan: (cardId: string) => void
  isEnabled: boolean
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

export default function QRScanner({ onScan, isEnabled }: Props) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const onScanRef = useRef(onScan)
  const isStartingRef = useRef(false)

  // Keep onScan ref updated
  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  useEffect(() => {
    // Don't start if disabled or no container
    if (!isEnabled || !containerRef.current) {
      // Clean up if we were scanning
      if (scannerRef.current) {
        const scanner = scannerRef.current
        scannerRef.current = null
        setIsScanning(false)
        stopScanner(scanner)
      }
      return
    }

    // Don't start if already running or starting
    if (scannerRef.current || isStartingRef.current) return

    let cancelled = false
    isStartingRef.current = true

    async function startScanner() {
      // Small delay to handle React Strict Mode double-mount
      await new Promise(resolve => setTimeout(resolve, 100))
      if (cancelled) {
        isStartingRef.current = false
        return
      }

      const scanner = new Html5Qrcode('qr-reader')

      try {
        await scanner.start(
          { facingMode: 'environment' },
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
        stopScanner(scanner)
      }
    }
  }, [isEnabled])

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
        <div id="qr-reader" ref={containerRef} className="w-full h-full" />

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
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-64 border-4 border-white rounded-lg relative">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg" />
              </div>
            </div>
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
        <p className="mt-4 text-lg text-gray-600 text-center">
          Hold your QR code card up to the camera
        </p>
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
