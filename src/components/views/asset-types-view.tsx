'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { assetTypesApi } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Layers, Plus, Pencil, Trash2, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { AssetType } from '@/lib/types'

export function AssetTypesView() {
  const qc = useQueryClient()
  const { data: types, isLoading } = useQuery({ queryKey: ['asset-types'], queryFn: () => assetTypesApi.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AssetType | null>(null)
  const [form, setForm] = useState({ name: '', description: '', icon: '' })

  function openNew() { setEditing(null); setForm({ name: '', description: '', icon: '' }); setOpen(true) }
  function openEdit(t: AssetType) { setEditing(t); setForm({ name: t.name, description: t.description || '', icon: t.icon || '' }); setOpen(true) }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    try {
      if (editing) {
        await assetTypesApi.update(editing.id, form)
        toast.success('Asset type updated')
      } else {
        await assetTypesApi.create(form)
        toast.success('Asset type created')
      }
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['asset-types'] })
    } catch (e) { toast.error('Save failed: ' + String(e)) }
  }

  async function handleDelete(t: AssetType) {
    if ((t._count?.assets || 0) > 0) {
      toast.error(`Cannot delete: ${t._count?.assets} assets use this type`)
      return
    }
    if (!confirm(`Delete asset type "${t.name}"?`)) return
    try {
      await assetTypesApi.delete(t.id)
      toast.success('Asset type deleted')
      qc.invalidateQueries({ queryKey: ['asset-types'] })
    } catch (e) { toast.error('Delete failed: ' + String(e)) }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Layers className="h-5 w-5" /> Asset Types</h2>
          <p className="text-sm text-muted-foreground">{types?.length || 0} types</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Add Type</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 shimmer" />
          ))
        ) : !types || types.length === 0 ? (
          <Card className="col-span-full p-8 text-center text-muted-foreground">No asset types yet</Card>
        ) : (
          types.map((t) => (
            <Card key={t.id} className="card-hover">
              <div className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{t.description || 'No description'}</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">
                      <Package className="h-3 w-3 mr-1" />{t._count?.assets || 0} assets
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Asset Type' : 'Add Asset Type'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the asset type details below.' : 'Create a new asset type to categorize your inventory.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Laptop" />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Icon (Lucide name)</Label>
              <Input value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} placeholder="Laptop, Monitor, Smartphone..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
