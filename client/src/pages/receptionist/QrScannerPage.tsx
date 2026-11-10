import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertCircle,
  Search,
  User,
  ArrowRight,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';

export const QrScannerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [manualCode, setManualCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<any>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (code: string) => {
      // Code could be an appointmentNumber, appointmentId, or JSON payload from QR
      let cleanCode = code.trim();
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.appointmentNumber) cleanCode = parsed.appointmentNumber;
        else if (parsed.appointmentId) cleanCode = parsed.appointmentId;
      } catch (e) {
        // Not JSON, use raw string
      }

      // First find appointment if code is appointmentNumber
      let appointmentId = cleanCode;
      if (cleanCode.startsWith('APT-')) {
        const res = await api.get(`/appointments?search=${cleanCode}&limit=1`);
        const found = res.data.data.items?.[0];
        if (!found) {
          throw new Error(`Appointment with code "${cleanCode}" not found`);
        }
        appointmentId = found._id;
      }

      // Check in
      const res = await api.post('/queue/check-in', {
        appointmentId,
        priority: 'normal',
      });
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['receptionist'] });
      setScannedResult(data);
      toast.success(`Check-in successful! Token: ${data.tokenNumber}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || err.message || 'Check-in failed';
      setScanError(msg);
      toast.error(msg);
    },
  });

  const startScanner = async () => {
    try {
      setScanError(null);
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopScanner();
          checkInMutation.mutate(decodedText);
        },
        (_errorMessage) => {
          // ignore frame errors
        }
      );
      setIsScanning(true);
    } catch (err: any) {
      setScanError('Camera access denied or device has no camera. Please use manual code entry.');
      setIsScanning(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          scannerRef.current?.clear();
          setIsScanning(false);
        })
        .catch(() => {
          setIsScanning(false);
        });
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    setScanError(null);
    checkInMutation.mutate(manualCode.trim());
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-black text-navy-900 dark:text-white">QR Code Check-in Scanner</h1>
        <p className="text-xs text-navy-500 dark:text-navy-400 mt-1">
          Scan the patient's appointment slip pass with the webcam or enter their reservation code manually
        </p>
      </div>

      {scanError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Camera Scanner Card */}
      <Card>
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-sm font-bold flex items-center justify-center gap-2">
            <Camera className="w-4 h-4 text-medical-600" />
            Live Camera Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            id="qr-reader"
            className="w-full max-w-sm mx-auto overflow-hidden rounded-2xl border-2 border-dashed border-teal-500/40 bg-navy-50 dark:bg-navy-950 min-h-[260px] flex items-center justify-center text-xs text-navy-400"
          >
            {!isScanning && (
              <div className="text-center p-6 space-y-2">
                <QrCode className="w-12 h-12 text-teal-600/40 mx-auto" />
                <p>Click "Start Camera Scanner" to enable webcam scanning</p>
              </div>
            )}
          </div>

          <div className="flex justify-center gap-3">
            {!isScanning ? (
              <Button variant="primary" onClick={startScanner} className="font-bold shadow-md">
                <Camera className="w-4 h-4 mr-1.5" />
                Start Camera Scanner
              </Button>
            ) : (
              <Button variant="danger" onClick={stopScanner} className="font-bold">
                Stop Camera
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Manual Code Input */}
      <Card>
        <CardHeader className="pb-3 text-center">
          <CardTitle className="text-sm font-bold flex items-center justify-center gap-2">
            <Search className="w-4 h-4 text-teal-600" />
            Manual Appointment Number Entry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <Input
              placeholder="e.g. APT-260312-8921"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="font-mono text-center text-sm font-bold uppercase tracking-wider"
            />
            <Button
              type="submit"
              variant="primary"
              className="shrink-0 font-bold"
              isLoading={checkInMutation.isPending}
            >
              Verify & Check In
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Success Modal */}
      {scannedResult && (
        <Modal
          isOpen={true}
          onClose={() => setScannedResult(null)}
          title="Patient Checked In Successfully"
        >
          <div className="text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-navy-400">Assigned Queue Token</p>
              <h2 className="text-4xl font-mono font-black text-teal-700 dark:text-teal-400 mt-1">
                {scannedResult.tokenNumber}
              </h2>
            </div>

            <div className="p-3.5 rounded-xl bg-navy-50 dark:bg-navy-800 text-left text-xs space-y-2 border border-navy-100 dark:border-navy-700">
              <div className="flex justify-between">
                <span className="text-navy-500">Queue Status:</span>
                <Badge variant="warning">{scannedResult.status.toUpperCase()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Priority:</span>
                <span className="font-bold uppercase text-navy-800 dark:text-navy-200">
                  {scannedResult.priority}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Check-In Time:</span>
                <span className="font-mono font-bold">
                  {new Date(scannedResult.checkInTime).toLocaleTimeString()}
                </span>
              </div>
            </div>

            <p className="text-xs text-navy-400">
              Token has been pushed to the doctor's live console and public waiting room screens.
            </p>

            <Button
              variant="primary"
              className="w-full font-bold shadow-md"
              onClick={() => {
                setScannedResult(null);
                setManualCode('');
              }}
            >
              Check In Next Patient
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
