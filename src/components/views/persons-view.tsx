'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { personsApi, departmentsApi, locationsApi } from '@/lib/api'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Users, Plus, Pencil, Trash2, Mail, Phone, Package } from 'lucide-react'
import { toast } from 'sonner'
import { initials } from '@/lib/format'
import type { Person } from '@/lib/types'

export function PersonsView() {
  const qc = useQueryClient()
  const { data: persons, isLoading } = useQuery({ queryKey: ['persons'], queryFn: () => personsApi.list() })
  const { data: depts } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })
  const { data: locs } = useQuery({ queryKey: ['locations'], queryFn: () => locationsApi.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', role: '', departmentId: '', locationId: '' })

  function openNew() { setEditing(null); setForm({ fullName: '', email: '', phone: '', role: '', departmentId: '', locationId: '' }); setOpen(true) }
  function openEdit(p: Person) {
    setEditing(p)
    setForm({ fullName: p.fullName, email: p.email || '', phone: p.phone || '', role: p.role || '', departmentId: p.departmentId || '', locationId: p.locationId || '' })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.fullName.trim()) { toast.error('Name is required'); return }
    try {
      const data = { ...form, departmentId: form.departmentId || null, locationId: form.locationId || null }
      if (editing) {
        await personsApi.update(editing.id, data)
        toast.success('Person updated')
      } else {
        await personsApi.create(data)
        toast.success('Person created')
      }
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['persons'] })
    } catch (e) { toast.error('Save failed: ' + String(e)) }
  }

  async function handleDelete(p: Person) {
    if (!confirm(`Delete person "${p.fullName}"?`)) return
    try {
      await personsApi.delete(p.id)
      toast.success('Person deleted')
      qc.invalidateQueries({ queryKey: ['persons'] })
    } catch (e) { toast.error('Delete failed: ' + String(e)) }
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2"><Users className="h-5 w-5" /> Persons</h2>
          <p className="text-sm text-muted-foreground">{persons?.length || 0} people</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1.5" /> Add Person</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !persons || persons.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No persons yet</TableCell></TableRow>
            ) : (
              persons.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback className="text-xs">{initials(p.fullName)}</AvatarFallback></Avatar>
                      <span className="font-medium">{p.fullName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-xs text-muted-foreground gap-0.5">
                      {p.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{p.email}</span>}
                      {p.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.phone}</span>}
                      {!p.email && !p.phone && '—'}
                    </div>
                  </TableCell>
                  <TableCell>{p.role ? <Badge variant="outline">{p.role}</Badge> : '—'}</TableCell>
                  <TableCell>{p.department?.name || '—'}</TableCell>
                  <TableCell>{p.location?.name || '—'}</TableCell>
                  <TableCell><span className="inline-flex items-center gap-1 text-sm"><Package className="h-3.5 w-3.5 text-muted-foreground" />{p._count?.assets || 0}</span></TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(p)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Person' : 'Add Person'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the contact details below.' : 'Add a new person who can be assigned assets or make bookings.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="John Doe" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Manager, Staff..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Department</Label>
                <Select value={form.departmentId} onValueChange={(v) => setForm({ ...form, departmentId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {depts?.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select value={form.locationId} onValueChange={(v) => setForm({ ...form, locationId: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— None —</SelectItem>
                    {locs?.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
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
