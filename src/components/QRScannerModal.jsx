import { useEffect, useRef, useState } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Camera, X, RefreshCw, AlertTriangle } from "lucide-react"

function QRScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [cameras, setCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState("")
  const [permissionError, setPermissionError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scannerRef = useRef(null)
  const isStartedRef = useRef(false)

  // Fetch available cameras when modal is open
  useEffect(() => {
    if (!isOpen) return

    const getDevices = async () => {
      setIsLoading(true)
      setPermissionError("")
      try {
        // Request camera permission first
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        // Immediately release stream so html5-qrcode can use it
        stream.getTracks().forEach(track => track.stop())

        const devices = await Html5Qrcode.getCameras()
        setCameras(devices)
        if (devices.length > 0) {
          // Default to back camera if available, otherwise first camera
          const backCam = devices.find(device => 
            device.label.toLowerCase().includes("back") || 
            device.label.toLowerCase().includes("environment")
          )
          setSelectedCameraId(backCam ? backCam.id : devices[0].id)
        }
      } catch (err) {
        console.error("Error getting cameras:", err)
        setPermissionError("Camera access denied or no cameras found. Please check permissions.")
      } finally {
        setIsLoading(false)
      }
    }

    getDevices()

    return () => {
      // Component unmount cleanup
      stopScanner()
    }
  }, [isOpen])

  // Start scanner when camera selection is set/changed
  useEffect(() => {
    if (!isOpen || !selectedCameraId || permissionError) return

    let isMounted = true

    const startScanner = async () => {
      // Stop previous instance if any
      await stopScanner()

      if (!isMounted) return

      try {
        const scanner = new Html5Qrcode("qr-reader-viewport")
        scannerRef.current = scanner

        await scanner.start(
          selectedCameraId,
          {
            fps: 15,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7
              return { width: size, height: size }
            }
          },
          (decodedText, decodedResult) => {
            // Play successful scan beep
            try {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
              const osc = audioCtx.createOscillator()
              const gain = audioCtx.createGain()
              osc.type = "sine"
              osc.frequency.value = 800
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime)
              osc.connect(gain)
              gain.connect(audioCtx.destination)
              osc.start()
              osc.stop(audioCtx.currentTime + 0.1)
            } catch (e) {
              console.log("Audio feedback not supported or blocked by user gesture.")
            }
            // Trigger success callback
            onScanSuccess(decodedText, decodedResult)
            onClose()
          },
          (errorMessage) => {
            // Scanner parsing failed, which happens constantly while looking for a code.
            // We suppress it to avoid flooding the console.
          }
        )
        isStartedRef.current = true
      } catch (err) {
        console.error("Failed to start QR scanner:", err)
      }
    }

    startScanner()

    return () => {
      isMounted = false
    }
  }, [isOpen, selectedCameraId])

  const stopScanner = async () => {
    if (scannerRef.current && isStartedRef.current) {
      try {
        isStartedRef.current = false
        await scannerRef.current.stop()
      } catch (err) {
        console.error("Error stopping scanner:", err)
      } finally {
        scannerRef.current = null
      }
    }
  }

  const handleClose = async () => {
    await stopScanner()
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0e0e0e] border border-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-900 p-5 bg-black/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-950/45 border border-red-900/40 flex items-center justify-center text-red-500">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">Live QR Check-in</h3>
              <p className="text-[11px] text-gray-500">Position the QR code inside the frame</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-850 p-2 rounded-xl transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Selector */}
        {cameras.length > 1 && (
          <div className="px-5 py-3 bg-[#111] border-b border-gray-900 flex items-center justify-between gap-3 text-xs">
            <span className="text-gray-400 font-medium flex items-center gap-1.5">
              <RefreshCw size={12} className="animate-spin-slow text-red-500" /> Active Camera:
            </span>
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="bg-black border border-gray-800 rounded-xl px-3 py-1.5 outline-none focus:border-red-600 text-white cursor-pointer max-w-[200px]"
            >
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>
                  {cam.label || `Camera ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Viewport & Scanner Body */}
        <div className="flex-1 min-h-[320px] relative bg-black flex items-center justify-center p-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-2 text-gray-500 text-xs">
              <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Accessing Camera...</span>
            </div>
          ) : permissionError ? (
            <div className="flex flex-col items-center gap-3 p-6 text-center text-xs">
              <AlertTriangle className="text-amber-500" size={32} />
              <p className="text-gray-400 font-semibold leading-relaxed max-w-xs">
                {permissionError}
              </p>
              <button 
                onClick={async () => {
                  setPermissionError("")
                  setIsLoading(true)
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                    stream.getTracks().forEach(track => track.stop())
                    const devices = await Html5Qrcode.getCameras()
                    setCameras(devices)
                    if (devices.length > 0) setSelectedCameraId(devices[0].id)
                  } catch (e) {
                    setPermissionError("Camera access denied. Please grant device permissions.")
                  } finally {
                    setIsLoading(false)
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl mt-1 transition-all cursor-pointer"
              >
                Retry Permission
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[280px] aspect-square rounded-3xl overflow-hidden border border-gray-900 shadow-inner bg-[#040404]">
              {/* Scan box viewport rendering target */}
              <div id="qr-reader-viewport" className="w-full h-full overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />
              
              {/* Overlay guides */}
              <div className="absolute inset-0 border-[24px] border-black/40 pointer-events-none" />
              
              {/* Target bracket outline */}
              <div className="absolute inset-[24px] border border-white/20 rounded-2xl pointer-events-none">
                {/* Corners */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-650 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-650 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-650 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-650 rounded-br-lg" />
                
                {/* Scanning Laser Line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-600 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-scan" />
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="bg-[#0b0b0b] border-t border-gray-950 p-4 text-center text-[10px] text-gray-500 leading-normal">
          Make sure your QR code is well-lit and fits within the guidelines.
        </div>
      </div>

      {/* Embedded CSS for custom scanning animations */}
      <style>{`
        @keyframes scan {
          0% { top: 4%; }
          50% { top: 96%; }
          100% { top: 4%; }
        }
        .animate-scan {
          animation: scan 2.5s infinite linear;
        }
        .animate-spin-slow {
          animation: spin 3s infinite linear;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default QRScannerModal
