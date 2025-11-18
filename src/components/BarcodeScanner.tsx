import { useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Button } from './ui/button';
import { Camera, X } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (result: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const webcamRef = useRef<Webcam>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const codeReader = useRef(new BrowserQRCodeReader());
  const animationFrameRef = useRef<number>();

  // Handle device selection
  const handleDevices = (mediaDevices: MediaDeviceInfo[]) => {
    const videoDevices = mediaDevices.filter(({ kind }) => kind === 'videoinput');
    setDevices(videoDevices);
    if (videoDevices.length > 0) {
      setSelectedDevice(videoDevices[0].deviceId);
    }
  };

  // Setup camera and start scanning
  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then(handleDevices)
      .catch((err) => {
        console.error('Error enumerating devices:', err);
        setError('Could not access camera. Please check permissions.');
      });

    return () => {
      // Cleanup
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      codeReader.current.reset();
    };
  }, []);

  // Start/stop scanning when isScanning changes
  useEffect(() => {
    if (!isScanning || !webcamRef.current || !selectedDevice) return;

    const videoElement = webcamRef.current.video;
    if (!videoElement) return;

    const scanBarcode = async () => {
      try {
        const result = await codeReader.current.decodeFromVideoDevice(
          selectedDevice,
          videoElement,
          (result, error) => {
            if (result) {
              onScan(result.getText());
              setIsScanning(false);
            }
            if (error && !(error as any).message.includes('No barcode detected')) {
              console.error('Barcode scan error:', error);
            }
          }
        );

        return () => {
          if (result) {
            codeReader.current.reset();
          }
        };
      } catch (err) {
        console.error('Error starting barcode scanner:', err);
        setError('Failed to start barcode scanner');
        setIsScanning(false);
      }
    };

    scanBarcode();
  }, [isScanning, selectedDevice, onScan]);

  // Toggle scanning on/off
  const toggleScanning = () => {
    setIsScanning(!isScanning);
  };

  // Switch between available cameras
  const switchCamera = () => {
    if (devices.length < 2) return;
    const currentIndex = devices.findIndex(device => device.deviceId === selectedDevice);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDevice(devices[nextIndex].deviceId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-2xl">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
          {error ? (
            <div className="flex h-full flex-col items-center justify-center text-red-500">
              <p className="mb-4">{error}</p>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <Webcam
                ref={webcamRef}
                audio={false}
                videoConstraints={{
                  deviceId: selectedDevice,
                  facingMode: 'environment', // Prefer rear camera on mobile
                }}
                className="h-full w-full object-cover"
                screenshotFormat="image/jpeg"
              />
              <div className="absolute inset-0 flex flex-col">
                {/* Scanner overlay */}
                <div className="flex-1 border-b-2 border-t-2 border-dashed border-green-500">
                  <div className="h-1/4"></div>
                  <div className="relative h-1/2">
                    <div className="absolute inset-0 border-l-2 border-r-2 border-dashed border-green-500"></div>
                  </div>
                  <div className="h-1/4"></div>
                </div>
                
                {/* Status message */}
                <div className="bg-black/70 p-2 text-center text-white">
                  {isScanning ? 'Scanning for barcodes...' : 'Scan complete!'}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-center space-x-4">
          <Button
            variant={isScanning ? 'default' : 'outline'}
            onClick={toggleScanning}
            className="flex items-center gap-2"
          >
            <Camera className="h-4 w-4" />
            {isScanning ? 'Stop Scanning' : 'Start Scanning'}
          </Button>
          
          {devices.length > 1 && (
            <Button variant="outline" onClick={switchCamera}>
              Switch Camera
            </Button>
          )}
          
          <Button variant="destructive" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
