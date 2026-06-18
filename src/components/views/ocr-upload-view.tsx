'use client'

import { useState, useCallback, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ocrApi, assetTypesApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  ScanText,
  Upload,
  FileImage,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  RotateCcw,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { OcrResult } from '@/lib/types'

export function OcrUploadView() {
  const { navigate } = useNav()
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<OcrResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: types } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) {
      toast.error('Please upload an image file (PNG, JPG, WebP)')
      return
    }
    setFile(f)
    setResult(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  async function runOcr() {
    if (!file) return
    setProcessing(true)
    try {
      const res = await ocrApi.extract(file)
      setResult(res)
      toast.success('Text extracted successfully!')
    } catch (e) {
      toast.error('OCR failed: ' + String(e))
    } finally {
      setProcessing(false)
    }
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  function continueToForm() {
    if (!result) return
    // Pre-fill the asset form with OCR results
    const prefill: Record<string, string> = {}
    if (result.parsed.make) prefill.make = result.parsed.make
    if (result.parsed.model) prefill.model = result.parsed.model
    if (result.parsed.modelNumber) prefill.modelNumber = result.parsed.modelNumber
    if (result.parsed.serialNumber) prefill.serialNumber = result.parsed.serialNumber
    if (result.parsed.imei1) prefill.imei1 = result.parsed.imei1
    if (result.parsed.imei2) prefill.imei2 = result.parsed.imei2
    if (result.parsed.os) prefill.os = result.parsed.os
    if (result.parsed.cpu) prefill.cpu = result.parsed.cpu
    if (result.parsed.ram) prefill.ram = result.parsed.ram
    if (result.parsed.storage) prefill.storage = result.parsed.storage
    if (result.parsed.color) prefill.color = result.parsed.color

    // Try to match asset type
    let assetTypeId = ''
    if (result.parsed.assetType && types) {
      const t = types.find((x) => x.name.toLowerCase() === result.parsed.assetType?.toLowerCase())
      if (t) assetTypeId = t.id
    }

    navigate('asset-new', { ocr: '1', ...prefill, assetTypeId })
    // Store prefill in sessionStorage for the form to pick up
    sessionStorage.setItem('ocr-prefill', JSON.stringify(prefill))
    sessionStorage.setItem('ocr-asset-type', assetTypeId)
  }

  const detectedFields = result?.parsed
    ? Object.entries(result.parsed).filter(([, v]) => v && String(v).trim())
    : []

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border">
          <ScanText className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Add Asset via Image (OCR)</h2>
          <p className="text-sm text-muted-foreground">
            Upload a photo of an asset or its spec label. Our AI will extract serial numbers, model info, IMEI, and more.
          </p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Upload zone */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload className="h-4 w-4" /> Step 1: Upload Image
            </CardTitle>
            <CardDescription>Drag & drop or click to select an image</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {!preview ? (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <FileImage className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Drop image here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP — up to 10MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleFile(f)
                  }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border">
                  <img src={preview} alt="Preview" className="w-full max-h-72 object-contain bg-muted/30" />
                  <Button
                    size="icon"
                    variant="secondary"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={reset}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{file?.name}</span>
                  <span>{file ? `${(file.size / 1024).toFixed(1)} KB` : ''}</span>
                </div>
                <div className="flex gap-2">
                  <Button onClick={runOcr} disabled={processing} className="flex-1">
                    {processing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-1.5" /> Extract Text
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ScanText className="h-4 w-4" /> Step 2: Review Extracted Text
            </CardTitle>
            <CardDescription>
              {result ? 'AI-extracted details from the image' : 'Results will appear here after extraction'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!result ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
                <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm">No results yet</p>
                <p className="text-xs">Upload an image and click "Extract Text"</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Detected fields */}
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Detected Fields ({detectedFields.length})
                    </span>
                  </div>
                  <div className="grid gap-2">
                    {detectedFields.length === 0 ? (
                      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        No specific fields detected. You can still use the raw text below.
                      </div>
                    ) : (
                      detectedFields.map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-1.5">
                          <span className="text-xs font-medium text-muted-foreground">{k}</span>
                          <span className="text-xs font-mono">{String(v)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Separator />

                {/* Raw text */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Raw Extracted Text</span>
                    <Badge variant="secondary" className="text-[10px]">{result.rawText.length} chars</Badge>
                  </div>
                  <Textarea
                    readOnly
                    value={result.rawText}
                    className="font-mono text-xs max-h-40"
                    rows={6}
                  />
                </div>

                <Button onClick={continueToForm} className="w-full" size="lg">
                  Continue to Asset Form <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Pre-filled fields will be editable in the form
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tips */}
      <Card className="bg-muted/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="text-sm">
              <p className="font-medium">Tips for better OCR results:</p>
              <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                <li>• Ensure good lighting and focus when photographing labels</li>
                <li>• Capture the full serial number / model label clearly</li>
                <li>• For mobiles, photograph the IMEI label (often under the battery or in settings)</li>
                <li>• Avoid reflections or glare on shiny surfaces</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
