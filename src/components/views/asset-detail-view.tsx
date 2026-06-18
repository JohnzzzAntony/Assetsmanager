'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assetsApi, assetActivityApi, disposalsApi, tagsApi, bookingsApi } from '@/lib/api'
import { useNav } from '@/lib/nav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatDateTime, formatCurrency, formatRelative, warrantyStatus, initials } from '@/lib/format'
import { STATUS_CONFIG, MAINTENANCE_STATUS_CONFIG, getTagColorConfig, BOOKING_STATUS_CONFIG } from '@/lib/types'
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
  Wrench,
  Activity,
  QrCode,
  Archive,
  AlertTriangle,
  CheckCircle2,
  Boxes,
  KeyRound,
  ArrowLeftRight,
  Recycle,
  Gift,
  Undo2,
  Tag,
  CalendarClock,
  Plus,
  X,
  GitBranch,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

  const { data: maintenance } = useQuery({
    queryKey: ['asset-maintenance', id],
    queryFn: () => assetActivityApi.maintenance(id),
    enabled: !!id,
  })

  const { data: activity } = useQuery({
    queryKey: ['asset-activity', id],
    queryFn: () => assetActivityApi.activity(id),
    enabled: !!id,
  })

  const { data: licenses } = useQuery({
    queryKey: ['asset-licenses', id],
    queryFn: () => assetActivityApi.maintenance(id).then(() => licensesForAsset(id)),
    enabled: !!id,
  })

  const { data: disposals } = useQuery({
    queryKey: ['asset-disposals', id],
    queryFn: () => disposalsApi.listForAsset(id),
    enabled: !!id,
  })

  const { data: bookings } = useQuery({
    queryKey: ['asset-bookings', id],
    queryFn: () => bookingsApi.listForAsset(id),
    enabled: !!id,
  })

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => tagsApi.list(),
  })

  async function toggleTag(tagId: string, currentlyAttached: boolean) {
    if (!asset) return
    try {
      if (currentlyAttached) {
        await tagsApi.detachFromAsset(asset.id, tagId)
        toast.success('Tag removed')
      } else {
        await tagsApi.attachToAsset(asset.id, tagId)
        toast.success('Tag added')
      }
      qc.invalidateQueries({ queryKey: ['asset', id] })
      qc.invalidateQueries({ queryKey: ['tags'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Tag update failed: ' + String(e))
    }
  }

  async function cancelBooking(bookingId: string) {
    try {
      await bookingsApi.update(bookingId, { status: 'Cancelled' })
      toast.success('Booking cancelled')
      qc.invalidateQueries({ queryKey: ['asset-bookings', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Cancel failed: ' + String(e))
    }
  }

  async function approveBooking(bookingId: string) {
    try {
      await bookingsApi.approve(bookingId)
      toast.success('Booking approved')
      qc.invalidateQueries({ queryKey: ['asset-bookings', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    } catch (e) {
      toast.error('Approve failed: ' + String(e))
    }
  }

  // Helper to fetch licenses (workaround for missing direct call)
  async function licensesForAsset(assetId: string) {
    const res = await fetch(`/api/assets/${assetId}/licenses`)
    return res.json()
  }

  async function quickStatus(newStatus: string) {
    if (!asset) return
    try {
      await assetsApi.update(id, { status: newStatus })
      toast.success(`Marked as ${newStatus}`)
      qc.invalidateQueries({ queryKey: ['asset', id] })
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['asset-activity', id] })
    } catch (e) {
      toast.error('Update failed: ' + String(e))
    }
  }

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
  const maintCount = maintenance?.length || 0
  const activityCount = activity?.length || 0

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
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => window.open(assetActivityApi.qrUrl(id), '_blank')}>
            <QrCode className="h-4 w-4 mr-1.5" /> Label
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Activity className="h-4 w-4 mr-1.5" /> Quick Action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => quickStatus('In Use')} disabled={asset.status === 'In Use'}>
                <CheckCircle2 className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Mark In Use
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatus('In Stock')} disabled={asset.status === 'In Stock'}>
                <Boxes className="h-3.5 w-3.5 mr-2 text-slate-600" /> Move to Stock
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatus('Repair')} disabled={asset.status === 'Repair'}>
                <Wrench className="h-3.5 w-3.5 mr-2 text-amber-600" /> Send to Repair
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatus('Retired')} disabled={asset.status === 'Retired'}>
                <Archive className="h-3.5 w-3.5 mr-2 text-rose-600" /> Retire Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => quickStatus('Lost')} disabled={asset.status === 'Lost'}>
                <AlertTriangle className="h-3.5 w-3.5 mr-2 text-red-600" /> Mark as Lost
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('asset-edit', { id: asset.id })}>
                <Pencil className="h-3.5 w-3.5 mr-2" /> Edit Asset
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => navigate('asset-edit', { id: asset.id })}>
            <Pencil className="h-4 w-4 mr-1.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('asset-timeline', { id: asset.id })}>
            <GitBranch className="h-4 w-4 mr-1.5" /> Timeline
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('checkouts')}>
            <ArrowLeftRight className="h-4 w-4 mr-1.5" /> Check-out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-10 h-auto">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="hardware" className="text-xs">Hardware</TabsTrigger>
          {isMobile && <TabsTrigger value="mobile" className="text-xs">Mobile</TabsTrigger>}
          <TabsTrigger value="peripherals" className="text-xs">Peripherals</TabsTrigger>
          <TabsTrigger value="maintenance" className="text-xs">Maintenance ({maintCount})</TabsTrigger>
          <TabsTrigger value="images" className="text-xs">Images ({asset._count?.images || 0})</TabsTrigger>
          <TabsTrigger value="history" className="text-xs">History ({asset._count?.history || 0})</TabsTrigger>
          <TabsTrigger value="disposals" className="text-xs">Disposals ({disposals?.length || 0})</TabsTrigger>
          <TabsTrigger value="tags" className="text-xs">Tags ({asset.tags?.length || 0})</TabsTrigger>
          <TabsTrigger value="bookings" className="text-xs">Bookings ({bookings?.length || 0})</TabsTrigger>
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

        {/* Maintenance */}
        <TabsContent value="maintenance" className="mt-4 space-y-4">
          <SectionCard
            title="Maintenance History"
            icon={Wrench}
            action={
              <Button size="sm" variant="outline" onClick={() => navigate('maintenance')}>
                View All <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
              </Button>
            }
          >
            {!maintenance || maintenance.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Wrench className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No maintenance records for this asset</p>
                <Button size="sm" variant="outline" onClick={() => navigate('maintenance')}>
                  <Wrench className="h-3.5 w-3.5 mr-1.5" /> Schedule Maintenance
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {maintenance.map((m) => {
                  const mcfg = MAINTENANCE_STATUS_CONFIG[m.status as keyof typeof MAINTENANCE_STATUS_CONFIG] || MAINTENANCE_STATUS_CONFIG.Scheduled
                  return (
                    <div key={m.id} className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${mcfg.bg}`}>
                            <Wrench className={`h-4 w-4 ${mcfg.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{m.title}</span>
                              <Badge variant="outline" className={`${mcfg.bg} ${mcfg.text} border-0 text-[10px] gap-1`}>
                                <span className={`h-1 w-1 rounded-full ${mcfg.dot}`} />
                                {m.status}
                              </Badge>
                              <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                            </div>
                            {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                              <span><Calendar className="h-3 w-3 inline mr-0.5" />{formatDate(m.scheduledFor)}</span>
                              {m.completedAt && <span><CheckCircle2 className="h-3 w-3 inline mr-0.5" />{formatDate(m.completedAt)}</span>}
                              {m.performedBy && <span><User className="h-3 w-3 inline mr-0.5" />{m.performedBy}</span>}
                              {m.cost != null && <span><DollarSign className="h-3 w-3 inline mr-0.5" />{formatCurrency(m.cost)}</span>}
                            </div>
                            {m.notes && <p className="text-xs italic text-muted-foreground mt-1">"{m.notes}"</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Recent Activity Log" icon={Activity}>
            {!activity || activity.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No activity logged for this asset</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                {activity.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 rounded-md border p-2 text-sm hover:bg-accent/30">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{log.action}</span>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatRelative(log.createdAt)}</span>
                      </div>
                      {log.details && <p className="text-xs text-muted-foreground mt-0.5">{log.details}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
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

        {/* Disposals */}
        <TabsContent value="disposals" className="mt-4">
          <SectionCard title="Disposal History" icon={Trash2}>
            {!disposals || disposals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Trash2 className="h-10 w-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No disposal records yet</p>
                <p className="text-xs text-muted-foreground">When this asset is disposed, sold, or recycled, the record will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {disposals.map((d) => {
                  const methodIcon = (m: string) => {
                    if (m === 'Recycled') return Recycle
                    if (m === 'Donated') return Gift
                    if (m === 'Returned to Vendor') return Undo2
                    if (m === 'Sold' || m === 'Trade-in') return DollarSign
                    return Trash2
                  }
                  const Icon = methodIcon(d.method)
                  return (
                    <div key={d.id} className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${d.netProceeds >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                            <Icon className={`h-4 w-4 ${d.netProceeds >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{d.method}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">{d.disposalNumber}</Badge>
                              {d.environmentalCompliant && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-0">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Eco
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(d.disposalDate)} · {d.buyerRecipient || 'No recipient'}
                            </p>
                            {d.reason && <p className="text-xs text-muted-foreground italic mt-1">{d.reason}</p>}
                            {d.certificateNumber && (
                              <p className="text-[11px] text-muted-foreground mt-1">Certificate: <span className="font-mono">{d.certificateNumber}</span></p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Net Proceeds</p>
                          <p className={`text-base font-bold tabular-nums ${d.netProceeds >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatCurrency(d.netProceeds)}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Residual {formatCurrency(d.residualValue)} − Cost {formatCurrency(d.disposalCost)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags" className="mt-4 space-y-4">
          <SectionCard title="Asset Tags" icon={Tag}>
            {asset.tags && asset.tags.length > 0 ? (
              <div className="mb-4 flex flex-wrap gap-2">
                {asset.tags.map((t) => {
                  const cfg = getTagColorConfig(t.color)
                  return (
                    <span
                      key={t.id}
                      className={`inline-flex items-center gap-1.5 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border} px-2.5 py-1 text-xs font-medium`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {t.name}
                      <button
                        onClick={() => toggleTag(t.id, true)}
                        className="ml-0.5 rounded-sm hover:bg-foreground/10 p-0.5"
                        aria-label={`Remove ${t.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  )
                })}
              </div>
            ) : (
              <div className="mb-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No tags assigned to this asset yet.
              </div>
            )}
            <Separator className="my-3" />
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Available Tags</div>
              <div className="flex flex-wrap gap-2">
                {allTags?.filter((t) => !asset.tags?.some((at) => at.id === t.id)).map((t) => {
                  const cfg = getTagColorConfig(t.color)
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id, false)}
                      className={`inline-flex items-center gap-1.5 rounded-md border border-dashed ${cfg.bg} ${cfg.text} ${cfg.border} px-2.5 py-1 text-xs font-medium transition-colors hover:bg-foreground/5`}
                    >
                      <Plus className="h-3 w-3" />
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      {t.name}
                    </button>
                  )
                })}
                {allTags?.length === 0 && (
                  <p className="text-xs text-muted-foreground">No tags exist yet. Create some in the Tags view.</p>
                )}
              </div>
            </div>
          </SectionCard>
        </TabsContent>

        {/* Bookings */}
        <TabsContent value="bookings" className="mt-4 space-y-4">
          <SectionCard title="Booking History" icon={CalendarClock}>
            {bookings && bookings.length > 0 ? (
              <div className="space-y-2 max-h-[500px] overflow-y-auto scrollbar-thin">
                {bookings.map((b) => {
                  const cfg = BOOKING_STATUS_CONFIG[b.status as keyof typeof BOOKING_STATUS_CONFIG] || BOOKING_STATUS_CONFIG.Pending
                  return (
                    <div key={b.id} className="rounded-lg border p-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                            <span className="text-sm font-medium truncate">{b.title}</span>
                          </div>
                          {b.purpose && <p className="text-xs text-muted-foreground mb-1.5 line-clamp-2">{b.purpose}</p>}
                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                            <span><Calendar className="inline h-3 w-3 mr-1" />{formatDate(b.startDate)} → {formatDate(b.endDate)}</span>
                            {b.bookedBy && <span><User className="inline h-3 w-3 mr-1" />{b.bookedBy.fullName}</span>}
                          </div>
                        </div>
                        <Badge variant="outline" className={`${cfg.bg} ${cfg.text} text-[10px]`}>{b.status}</Badge>
                      </div>
                      {b.status === 'Pending' && (
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => approveBooking(b.id)}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => cancelBooking(b.id)}>
                            Cancel
                          </Button>
                        </div>
                      )}
                      {(b.status === 'Approved' || b.status === 'Active') && (
                        <div className="mt-2">
                          <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => cancelBooking(b.id)}>
                            Cancel Booking
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                No bookings for this asset.
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
