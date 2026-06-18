'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { locationsApi } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { MapPin, Plus, Pencil, Trash2, Users, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { Location } from '@/lib/types'

export function LocationsView() {
  const qc = useQueryClient()
  const { data: locs, isLoading } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Location | null>(null)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')

  function openNew() { setEditing(null); setName(''); setAddress(''); setOpen(true) }
  function openEdit(l: Location) { setEditing(l); setName(l.name); setAddress(l.address || ''); setOpen(true) }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name is required'); return }
    try {
      if (editing) {
        await locationsApi.update(editing.id, { name, address })
        toast.success('Location updated')
      } else {
        await locationsApi.create({ name, address })
        toast.success('Location created')
      }
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['locations'] })
    } catch (e) { toast.error('Save failed: ' + String(e)) }
  }

  async function handleDelete(l: Location) {
    if (!confirm(`Delete location "${l.name}"?`)) return
    try {
      await locationsApi.delete(l.id)
      toast.success('Location deleted')
      qc.invalidateQueries({ queryKey: ['locations'] })
    } catch (e) { toast.error('Delete failed: ' + String(e)) }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><MapPin className="h-5 w-5" /> Locations</h2>
          <p className="text-sm text-muted-foreground">{locs?.length || 0} locations</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Add Location</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Persons</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !locs || locs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No locations yet</TableCell></TableRow>
            ) : (
              locs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                        <MapPin className="h-4 w-4 text-emerald-600" />
                      </div>
                      {l.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{l.address || '—'}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-sm"><Package className="h-3.5 w-3.5 text-muted-foreground" />{l._count?.assets || 0}</span></TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-sm"><Users className="h-3.5 w-3.5 text-muted-foreground" />{l._count?.persons || 0}</span></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(l)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Location' : 'Add Location'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the location details below.' : 'Add a new physical location for asset tracking.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Head Office" />
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
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
