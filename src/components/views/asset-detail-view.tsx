'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assetsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatDateTime, formatCurrency, formatRelative, warrantyStatus, initials } from '@/lib/format'
import { STATUS_CONFIG } from '@/lib/types'
import {
  Pencil,
  ArrowLeft,
  Trash2,
  Package,
  Cpu,
  MemoryStick,
  HardDrive,
  Monitor,
  Keyboard,
  Mouse,
  Smartphone,
  User,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  Image as ImageIcon,
  History,
  ScanText,
  Printer,
  FileText,
  CircleDot,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

function InfoRow({ label, value, icon: Icon }: { label: string; value?: React.ReactNode; icon?: typeof Cpu }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="text-sm font-medium text-right">{value || <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, action }: { title: string; icon: typeof Cpu; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm">{title}</CardTitle>
        </div>
        {action}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}

export function AssetDetailView({ id }: { id: string }) {
  const { navigate, back } = useNav()
  const qc = useQueryClient()

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.get(id),
    enabled: !!id,
  })

  async function handleDelete() {
    try {
      await assetsApi.delete(id)
      toast.success('Asset deleted')
      qc.invalidateQueries({ queryKey: ['assets'] })
      navigate('assets')
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  if (isLoading || !asset) {
    return (
      <div className="space-y-4">
        <div className="h-24 shimmer rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 shimmer rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  const cfg = STATUS_CONFIG[asset.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG['In Stock']
  const isMobile = ['Mobile', 'Tablet'].includes(asset.assetType?.name || '')
  const warranty = warrantyStatus(asset.warrantyExpiry)

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={back} className="-ml-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border">
            <Package className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight">
                {asset.make} {asset.model}
              </h2>
              <Badge variant="outline" className={`${cfg.bg} ${cfg.text} border-0 gap-1`}>
                <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                {asset.status}
              </Badge>
              <Badge variant="secondary">{asset.assetType?.name}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{asset.assetTag || 'No tag'}</span>
              {asset.serialNumber && <> · S/N: <span className="font-mono">{asset.serialNumber}</span></>}
              {asset.modelNumber && <> · {asset.modelNumber}</>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('asset-edit', { id: asset.id })}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this asset?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {asset.make} {asset.model} ({asset.assetTag}) and all related history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="hardware" className="text-xs">Hardware</TabsTrigger>
          {isMobile && <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>}
          <TabsTrigger value="peripherals" className="text-xs">Peripherals</TabsTrigger>
          <TabsTrigger value="images" className="text-xs">Images ({asset._count?.images || 0})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History ({asset._count?.history || 0})</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard title="Asset Information" icon={Package}>
              <InfoRow label="Asset Tag" value={<span className="font-mono">{asset.assetTag}</span>} />
              <InfoRow label="Type" value={asset.assetType?.name} />
              <InfoRow label="Make" value={asset.make} />
              <InfoRow label="Model" value={asset.model} />
              <InfoRow label="Model Number" value={asset.modelNumber} />
              <InfoRow label="Serial Number" value={<span className="font-mono">{asset.serialNumber}</span>} />
              <InfoRow label="Part Number" value={asset.partNumber} />
              <InfoRow label="Status" value={<Badge variant="outline" className={cfg.bg + ' ' + cfg.text}>{asset.status}</Badge>} />
            </SectionCard>

            <SectionCard title="Assignment" icon={User}>
              {asset.assignedTo ? (
                <div className="mb-3 flex items-center gap-3 rounded-lg border p-3">
                  <Avatar>
                    <AvatarFallback>{initials(asset.assignedTo.fullName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{asset.assignedTo.fullName}</div>
                    {asset.assignedTo.email && <div className="text-xs text-muted-foreground">{asset.assignedTo.email}</div>}
                    {asset.assignedTo.role && <div className="text-xs text-muted-foreground">{asset.assignedTo.role}</div>}
                  </div>
                </div>
              ) : (
                <div className="mb-3 rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                  Not assigned to anyone
                </div>
              )}
              <InfoRow label="Department" value={asset.department?.name} icon={Building2} />
              <InfoRow label="Location" value={asset.location?.name} icon={MapPin} />
              <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => navigate('asset-edit', { id: asset.id })}>
                <User className="h-3.5 w-3.5 mr-1.5" /> Reassign
              </Button>
            </SectionCard>

            <SectionCard title="Financial & Warranty" icon={DollarSign}>
              <InfoRow label="Purchase Cost" value={asset.cost != null ? formatCurrency(asset.cost, asset.currency) : undefined} icon={DollarSign} />
              <InfoRow label="Purchase Date" value={formatDate(asset.purchaseDate)} icon={Calendar} />
              <InfoRow label="Warranty Expiry" value={
                <div className="flex items-center gap-2 justify-end">
                  {formatDate(asset.warrantyExpiry)}
                  {warranty.daysLeft !== null && (
                    <Badge variant={warranty.variant} className="text-[10px]">{warranty.label}</Badge>
                  )}
                </div>
              } icon={ShieldCheck} />
              <InfoRow label="Operating System" value={asset.os} icon={CircleDot} />
              <Separator className="my-2" />
              <InfoRow label="Created" value={formatDateTime(asset.createdAt)} />
              <InfoRow label="Last Updated" value={formatRelative(asset.updatedAt)} />
            </SectionCard>
          </div>

          {asset.comments && (
            <SectionCard title="Notes / Comments" icon={FileText}>
              <p className="text-sm whitespace-pre-wrap">{asset.comments}</p>
            </SectionCard>
          )}
        </TabsContent>

        {/* Hardware */}
        <TabsContent value="hardware" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SectionCard title="Processor" icon={Cpu}>
              <InfoRow label="CPU" value={asset.cpu} />
              <InfoRow label="GPU" value={asset.gpu} />
            </SectionCard>
            <SectionCard title="Memory & Storage" icon={MemoryStick}>
              <InfoRow label="RAM" value={asset.ram} icon={MemoryStick} />
              <InfoRow label="Storage" value={asset.storage} icon={HardDrive} />
            </SectionCard>
            <SectionCard title="Software" icon={CircleDot}>
              <InfoRow label="Operating System" value={asset.os} />
              <InfoRow label="OS License Key" value={asset.osKey ? <span className="font-mono text-xs">{asset.osKey}</span> : undefined} />
              <InfoRow label="Office License Key" value={asset.officeKey ? <span className="font-mono text-xs">{asset.officeKey}</span> : undefined} />
            </SectionCard>
            <SectionCard title="Physical" icon={Package}>
              <InfoRow label="Color" value={asset.color} />
              <InfoRow label="Asset Tag" value={<span className="font-mono">{asset.assetTag}</span>} />
            </SectionCard>
          </div>
        </TabsContent>

        {/* Mobile */}
        {isMobile && (
          <TabsContent value="mobile" className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard title="Device Identity" icon={Smartphone}>
                <InfoRow label="IMEI 1" value={<span className="font-mono">{asset.imei1}</span>} />
                <InfoRow label="IMEI 2" value={<span className="font-mono">{asset.imei2}</span>} />
                <InfoRow label="Color" value={asset.color} />
              </SectionCard>
              <SectionCard title="Memory" icon={MemoryStick}>
                <InfoRow label="RAM" value={asset.ram} />
                <InfoRow label="ROM / Storage" value={asset.rom || asset.storage} />
              </SectionCard>
              <SectionCard title="Accounts" icon={User}>
                <InfoRow label="OTP Mobile" value={asset.otpMobileNumber} />
                <InfoRow label="Google/Apple ID" value={asset.googleAppleAccount} />
              </SectionCard>
            </div>
          </TabsContent>
        )}

        {/* Peripherals */}
        <TabsContent value="peripherals" className="mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SectionCard title="Monitor" icon={Monitor}>
              <InfoRow label="Make" value={asset.monitorMake} />
              <InfoRow label="Model" value={asset.monitorModel} />
              <InfoRow label="Serial" value={<span className="font-mono text-xs">{asset.monitorSn}</span>} />
              <InfoRow label="Size" value={asset.monitorSize} />
            </SectionCard>
            <SectionCard title="Keyboard" icon={Keyboard}>
              <InfoRow label="Make" value={asset.keyboardMake} />
              <InfoRow label="Model" value={asset.keyboardModel} />
              <InfoRow label="Serial" value={<span className="font-mono text-xs">{asset.keyboardSn}</span>} />
            </SectionCard>
            <SectionCard title="Mouse" icon={Mouse}>
              <InfoRow label="Make" value={asset.mouseMake} />
              <InfoRow label="Model" value={asset.mouseModel} />
              <InfoRow label="Serial" value={<span className="font-mono text-xs">{asset.mouseSn}</span>} />
            </SectionCard>
          </div>
        </TabsContent>

        {/* Images */}
        <TabsContent value="images" className="mt-4">
          <SectionCard title="Asset Images" icon={ImageIcon} action={
            <Button size="sm" variant="outline" onClick={() => navigate('ocr-upload')}>
              <ScanText className="h-3.5 w-3.5 mr-1.5" /> Upload via OCR
            </Button>
          }>
            {!asset.images || asset.images.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No images uploaded yet</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {asset.images.map((img) => (
                  <div key={img.id} className="overflow-hidden rounded-lg border">
                    <img src={`/api/images/${img.id}`} alt={img.fileName} className="aspect-video w-full object-cover" />
                    <div className="p-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate font-medium">{img.fileName}</span>
                        <Badge variant={img.ocrStatus === 'Success' ? 'default' : 'secondary'} className="text-[10px]">{img.ocrStatus}</Badge>
                      </div>
                      {img.processedText && (
                        <details className="mt-1">
                          <summary className="text-[11px] text-muted-foreground cursor-pointer">View OCR text</summary>
                          <pre className="mt-1 max-h-32 overflow-y-auto scrollbar-thin rounded bg-muted p-2 text-[10px] whitespace-pre-wrap">{img.processedText}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <SectionCard title="Assignment History" icon={History}>
            {!asset.history || asset.history.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <History className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No assignment history yet</p>
              </div>
            ) : (
              <div className="relative space-y-4 pl-4">
                <div className="absolute left-0 top-2 bottom-2 w-px bg-border" />
                {asset.history.map((h) => (
                  <div key={h.id} className="relative">
                    <div className="absolute -left-[18px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{h.action}</Badge>
                          <span className="text-sm font-medium">{h.person?.fullName || 'Unassigned'}</span>
                        </div>
                        {h.department && <p className="text-xs text-muted-foreground mt-0.5">{h.department.name} · {h.location?.name}</p>}
                        {h.reason && <p className="text-xs text-muted-foreground italic mt-0.5">{h.reason}</p>}
                      </div>
                      <div className="text-xs text-muted-foreground text-right">
                        <div>{formatDate(h.assignedOn)}</div>
                        {h.unassignedOn && <div className="text-[10px]">until {formatDate(h.unassignedOn)}</div>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
