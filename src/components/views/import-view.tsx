'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { importApi, assetsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, FileSpreadsheet, Download, CheckCircle2, XCircle, Loader2, AlertCircle, Database } from 'lucide-react'
import { toast } from 'sonner'

const SAMPLE_CSV = `Asset Tag,Type,Make,Model,Serial Number,Status,OS,CPU,RAM,Storage,User,Department,Location,Cost,Purchase Date
TC-000100,Desktop,Dell,Optiplex 7050,DL7050SN100,In Use,Windows 11 PRO,Intel Core i5-7500,8GB,256GB SSD,John Smith,IT,Maylaa HO,700,2024-01-15
TC-000101,Laptop,Lenovo,ThinkPad T14,LNVT14SN101,In Use,Windows 11 PRO,Intel Core i7-1260P,16GB,512GB SSD,Jane Doe,Finance,Maylaa HO,1400,2024-02-20
TC-000102,Mobile,Apple,iPhone 14,F2LW14ABC102,In Stock,iOS 17,,,128GB,,,,799,2024-03-10`

export function ImportView() {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ imported: number; errors: string[] } | null>(null)
  const [csvText, setCsvText] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    setFile(f)
    setResult(null)
    f.text().then(setCsvText)
  }

  async function handleImport() {
    setImporting(true)
    try {
      const fileToImport = file || new File([csvText], 'manual.csv', { type: 'text/csv' })
      if (!fileToImport) { toast.error('Please provide a CSV'); return }
      const res = await importApi.excel(fileToImport)
      setResult(res)
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} assets`)
        qc.invalidateQueries({ queryKey: ['assets'] })
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
    } catch (e) {
      toast.error('Import failed: ' + String(e))
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'asset-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 border">
          <Upload className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Import Assets from CSV</h2>
          <p className="text-sm text-muted-foreground">Bulk import assets from a CSV file. New departments, locations, and persons will be auto-created.</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" /> Upload CSV File
              </CardTitle>
              <CardDescription>Drag & drop or click to select a .csv file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div
                onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => { e.preventDefault(); setDragActive(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f) }}
                onClick={() => inputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
                  dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/50'
                }`}
              >
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm font-medium">{file ? file.name : 'Drop CSV here or click to browse'}</p>
                <p className="text-xs text-muted-foreground">.csv format, UTF-8 encoded</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />
              </div>

              {csvText && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Preview (first 1000 chars)</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setCsvText('')}>Clear</Button>
                  </div>
                  <Textarea readOnly value={csvText.slice(0, 1000)} className="font-mono text-xs max-h-40" rows={5} />
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleImport} disabled={importing || (!file && !csvText)} className="flex-1">
                  {importing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4 mr-1.5" /> Import Now</>}
                </Button>
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="h-4 w-4 mr-1.5" /> Template
                </Button>
              </div>
            </CardContent>
          </Card>

          {result && (
            <Alert variant={result.errors.length > 0 ? 'destructive' : 'default'}>
              <div className="flex items-start gap-2">
                {result.imported > 0 ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <XCircle className="h-4 w-4" />}
                <div>
                  <p className="font-medium">Import Complete</p>
                  <AlertDescription>
                    Successfully imported <strong>{result.imported}</strong> assets.
                    {result.errors.length > 0 && ` ${result.errors.length} errors occurred.`}
                  </AlertDescription>
                  {result.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer">View errors</summary>
                      <ul className="mt-1 space-y-0.5 text-xs max-h-32 overflow-y-auto scrollbar-thin">
                        {result.errors.map((e, i) => <li key={i} className="font-mono">{e}</li>)}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </Alert>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Supported Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {['Asset Tag', 'Type', 'Make', 'Model', 'Model Number', 'Serial Number', 'Status', 'OS', 'CPU', 'RAM', 'Storage', 'User', 'Department', 'Location', 'Cost', 'Purchase Date', 'Warranty', 'IMEI', 'Color', 'Comments'].map((c) => (
                  <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Column names are case-insensitive. Aliases like "S/N", "SN", "Serial" all map to Serial Number.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900">
            <CardContent className="p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Tips</p>
                  <p>• New departments, locations, and persons are auto-created from values</p>
                  <p>• Asset Type values should match existing types (Desktop, Laptop, etc.)</p>
                  <p>• Dates should be in YYYY-MM-DD format</p>
                  <p>• Costs should be numeric (without currency symbols)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2"><Database className="h-4 w-4" /> Demo Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Load sample data to explore the system</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    const res = await fetch('/api/seed', { method: 'POST' })
                    const data = await res.json()
                    toast.success(data.message || 'Seeded')
                    qc.invalidateQueries()
                  } catch (e) { toast.error('Seed failed: ' + String(e)) }
                }}
              >
                Load Demo Assets
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
