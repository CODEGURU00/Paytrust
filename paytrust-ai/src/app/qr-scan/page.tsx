'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BrowserQRCodeReader } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getErrorMessage } from '@/lib/errors';
import {
  parseQRCode,
  validateQRCode,
  type ParsedQR,
} from '@/lib/qr';
import {
  AlertCircle,
  Camera,
  CheckCircle,
  FileText,
  Play,
  Shield,
  Square,
} from 'lucide-react';

type FlowStep = 'decode' | 'validate' | 'preview' | 'confirm' | 'capture';

interface FlowState {
  step: FlowStep;
  decoded: string | null;
  parsed: ParsedQR | null;
  isValid: boolean;
  validationMessage: string | null;
  error: string | null;
  isScanning: boolean;
  cameraError: string | null;
  isSaving: boolean;
}

const INITIAL_STATE: FlowState = {
  step: 'decode',
  decoded: null,
  parsed: null,
  isValid: false,
  validationMessage: null,
  error: null,
  isScanning: false,
  cameraError: null,
  isSaving: false,
};

const STEP_LABELS: Record<FlowStep, string> = {
  decode: 'Step 1: Decode',
  validate: 'Step 2: Validate',
  preview: 'Step 3: Preview Intent',
  confirm: 'Step 4: Confirm',
  capture: 'Step 5: Capture',
};

const STEP_DESCRIPTIONS: Record<FlowStep, string> = {
  decode: 'Scan or enter a QR code to read its contents',
  validate: 'Check the QR format and validate the payment intent',
  preview: 'Review what will happen before authorizing',
  confirm: 'Explicitly confirm the payment action',
  capture: 'The QR payload has been recorded',
};

const STEP_ORDER: FlowStep[] = [
  'decode',
  'validate',
  'preview',
  'confirm',
  'capture',
];

export default function QRScanPage() {
  const [state, setState] = useState<FlowState>(INITIAL_STATE);
  const [manualData, setManualData] = useState('');
  const [generatorData, setGeneratorData] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);

  const cleanupScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current) {
      BrowserQRCodeReader.cleanVideoSource(videoRef.current);
    }
  }, []);

  useEffect(() => cleanupScanner, [cleanupScanner]);

  const handleDecoded = useCallback(
    (text: string) => {
      const parsed = parseQRCode(text);
      setState((previous) => ({
        ...previous,
        step: 'validate',
        decoded: text,
        parsed,
        isValid: false,
        validationMessage: null,
        error: null,
        isScanning: false,
      }));
    },
    []
  );

  const handleManualDecode = useCallback(() => {
    const value = manualData.trim();
    if (!value) {
      setState((previous) => ({
        ...previous,
        error: 'Enter QR data to decode',
      }));
      return;
    }
    handleDecoded(value);
  }, [handleDecoded, manualData]);

  const startScanning = useCallback(async () => {
    if (state.step !== 'decode') return;

    setState((previous) => ({
      ...previous,
      isScanning: true,
      cameraError: null,
      error: null,
    }));

    try {
      const reader = new BrowserQRCodeReader();
      const videoElement = videoRef.current;
      if (!videoElement) throw new Error('Camera preview is not available');

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;

      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoElement,
        (result, error) => {
          if (result) {
            cleanupScanner();
            handleDecoded(result.getText());
            return;
          }

          const name = (error as { name?: string } | undefined)?.name || '';
          if (error && !name.includes('NotFoundException')) {
            // Transient decode warnings are expected while the camera warms
            // up. Keep scanning instead of failing the whole flow.
            console.warn('QR scan warning:', error);
          }
        }
      );

      controlsRef.current = controls;
    } catch (error) {
      cleanupScanner();
      setState((previous) => ({
        ...previous,
        isScanning: false,
        cameraError: getErrorMessage(error, 'Camera access failed'),
      }));
    }
  }, [cleanupScanner, handleDecoded, state.step]);

  const stopScanning = useCallback(() => {
    cleanupScanner();
    setState((previous) => ({ ...previous, isScanning: false }));
  }, [cleanupScanner]);

  const handleValidate = useCallback(() => {
    if (!state.parsed) return;
    const validation = validateQRCode(state.parsed);
    setState((previous) => ({
      ...previous,
      step: 'preview',
      isValid: validation.isValid,
      validationMessage: validation.message,
    }));
  }, [state.parsed]);

  const handleConfirm = useCallback(() => {
    if (!state.isValid) return;
    setState((previous) => ({ ...previous, step: 'confirm', error: null }));
  }, [state.isValid]);

  const resetFlow = useCallback(() => {
    cleanupScanner();
    setState(INITIAL_STATE);
    setManualData('');
  }, [cleanupScanner]);

  const handleCapture = useCallback(async () => {
    if (!state.parsed || !state.decoded || state.isSaving) return;

    setState((previous) => ({
      ...previous,
      isSaving: true,
      error: null,
    }));

    try {
      const response = await fetch('/api/qr-payloads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: state.parsed.type,
          raw: state.decoded,
          parsed: {
            provider: state.parsed.provider,
            recipient: state.parsed.recipient,
            amount: state.parsed.amount,
            currency: state.parsed.currency,
            reference: state.parsed.reference,
            url: state.parsed.url,
            transaction_id: state.parsed.transaction_id,
          },
          is_valid: state.isValid,
          validation_message: state.validationMessage,
        }),
      });
      const result = await response.json();

      if (!response.ok) {
        setState((previous) => ({
          ...previous,
          isSaving: false,
          error: result.error || 'Could not save QR payload',
        }));
        return;
      }

      setState((previous) => ({
        ...previous,
        step: 'capture',
        isSaving: false,
        error: null,
      }));
    } catch (error) {
      setState((previous) => ({
        ...previous,
        isSaving: false,
        error: getErrorMessage(error, 'Could not save QR payload'),
      }));
    }
  }, [state.decoded, state.isSaving, state.isValid, state.parsed, state.validationMessage]);

  const handleGenerateQR = useCallback(async () => {
    const data = generatorData.trim();
    if (!data) return;

    setGeneratorError(null);

    try {
      const response = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      const result = await response.json();

      if (!response.ok) {
        setGeneratorError(result.error || 'Could not generate QR code');
        return;
      }

      setQrDataUrl(result.data as string);
    } catch (error) {
      setGeneratorError(getErrorMessage(error, 'Could not generate QR code'));
    }
  }, [generatorData]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-gray-600 hover:text-blue-600"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-gray-900">
          QR Scanner &mdash; Safe Payment Flow
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Decode, validate, preview, and confirm before anything is recorded.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {STEP_ORDER.map((step, index) => (
          <span
            key={step}
            className={`flex items-center gap-1 ${
              state.step === step ? 'font-medium text-blue-600' : ''
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                state.step === step ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            />
            {step.charAt(0).toUpperCase() + step.slice(1)}
            {index < STEP_ORDER.length - 1 && (
              <span className="text-gray-400">&rsaquo;</span>
            )}
          </span>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR Scanner</CardTitle>
            <CardDescription>
              Decode QR codes via camera or manual entry
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={
                  state.isScanning
                    ? 'h-full w-full rounded-lg object-cover'
                    : 'hidden'
                }
              />
              {!state.isScanning && (
                <div className="flex h-full flex-col items-center justify-center text-gray-400">
                  <Camera className="mb-2 h-12 w-12" />
                  <p>Camera preview</p>
                </div>
              )}
              {state.cameraError && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-red-500/90 p-4 text-sm text-white">
                  {state.cameraError}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              {!state.isScanning ? (
                <Button
                  onClick={startScanning}
                  className="flex-1"
                  disabled={state.step !== 'decode'}
                >
                  <Play className="h-4 w-4" /> Start Camera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={stopScanning}
                  className="flex-1"
                >
                  <Square className="h-4 w-4" /> Stop
                </Button>
              )}
            </div>

            <div className="border-t pt-4">
              <p className="mb-3 text-xs text-gray-500">
                Or enter QR data manually:
              </p>
              <div className="flex flex-wrap gap-2">
                <div className="min-w-[200px] flex-1">
                  <Input
                    value={manualData}
                    onChange={(event) => setManualData(event.target.value)}
                    placeholder="paytrust://pay?tx=... or https://paytrust.ai/t/..."
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={handleManualDecode}
                  disabled={!manualData.trim() || state.step !== 'decode'}
                >
                  Decode
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{STEP_LABELS[state.step]}</CardTitle>
            <CardDescription>{STEP_DESCRIPTIONS[state.step]}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {state.step === 'decode' && (
              <div className="py-8 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Scan a QR code or enter data manually to begin.
                </p>
              </div>
            )}

            {state.step === 'validate' && state.decoded && (
              <div className="space-y-3">
                <div className="rounded border border-gray-200 bg-gray-50 p-3">
                  <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
                    Raw Data
                  </p>
                  <p className="break-all font-mono text-sm">
                    {state.decoded}
                  </p>
                </div>
                <Button onClick={handleValidate} variant="outline" className="w-full">
                  Run Validation
                </Button>
                <Button variant="ghost" onClick={resetFlow} className="w-full">
                  Start Over
                </Button>
              </div>
            )}

            {state.step === 'preview' && state.parsed && (
              <div className="space-y-3">
                <Badge variant={state.isValid ? 'success' : 'destructive'}>
                  {state.isValid ? 'VALID' : 'INVALID'}
                </Badge>
                <p className="text-sm text-gray-600">
                  {state.validationMessage}
                </p>

                <div className="space-y-2 rounded border border-gray-100 bg-gray-50 p-3">
                  {[
                    ['Type', state.parsed.type.toUpperCase()],
                    ['Provider', state.parsed.provider || '—'],
                    ['Recipient', state.parsed.recipient || '—'],
                    [
                      'Amount',
                      state.parsed.amount
                        ? `${state.parsed.amount} ${state.parsed.currency || ''}`
                        : '—',
                    ],
                    ['Reference', state.parsed.reference || '—'],
                    ['Transaction ID', state.parsed.transaction_id || '—'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3 text-sm">
                      <span className="text-gray-500">{label}</span>
                      <span className="break-all text-right font-mono text-xs">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>

                {state.error && (
                  <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    className="flex-1"
                  >
                    Rescan
                  </Button>
                  <Button
                    onClick={handleConfirm}
                    disabled={!state.isValid}
                    className="flex-1"
                  >
                    Confirm Intent
                  </Button>
                </div>
              </div>
            )}

            {state.step === 'confirm' && state.parsed && (
              <div className="space-y-3">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
                <p className="text-sm text-gray-700">
                  You are about to record a payment intent for{' '}
                  <span className="font-medium">
                    {state.parsed.recipient || 'an unspecified recipient'}
                  </span>
                  .
                </p>
                <p className="text-sm text-gray-700">
                  Amount:{' '}
                  <span className="font-medium">
                    {state.parsed.amount
                      ? `${state.parsed.amount} ${state.parsed.currency || ''}`
                      : 'unspecified'}
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  This records the QR payload for your audit trail. It does not
                  move money by itself.
                </p>

                {state.error && (
                  <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                    {state.error}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetFlow}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCapture}
                    className="flex-1"
                    isLoading={state.isSaving}
                  >
                    Authorize &amp; Capture
                  </Button>
                </div>
              </div>
            )}

            {state.step === 'capture' && (
              <div className="py-8 text-center">
                <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
                <h3 className="font-semibold text-gray-900">Capture Complete</h3>
                <p className="text-sm text-gray-600">
                  The QR payload has been recorded and validated.
                </p>
                <Button onClick={resetFlow} className="mt-4">
                  Scan Another
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>QR Generator</CardTitle>
          <CardDescription>
            Generate a QR code for a payment reference or transaction link
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={generatorData}
            onChange={(event) => setGeneratorData(event.target.value)}
            placeholder="https://paytrust.ai/t/abc-123"
            label="Data to encode"
          />
          {generatorError && (
            <div className="rounded border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {generatorError}
            </div>
          )}
          <Button
            onClick={handleGenerateQR}
            disabled={!generatorData.trim()}
            className="w-full sm:w-auto"
          >
            <FileText className="h-4 w-4" /> Generate QR
          </Button>
          {qrDataUrl && (
            <div className="flex flex-col items-center gap-2">
              {/* Data URL generated locally from the submitted value. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="h-48 w-48 rounded border bg-white p-2"
              />
            </div>
          )}
        </CardContent>
      </Card>
      </main>
    </div>
  );
}
