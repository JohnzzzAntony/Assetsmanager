'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { departmentsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Pencil, Trash2, Users, Package } from 'lucide-react'
import { toast } from 'sonner'
import type { Department } from '@/lib/types'

export function DepartmentsView() {
  const qc = useQueryClient()
  const { data: depts, isLoading } = useQuery({ queryKey: ['departments'], queryFn: () => departmentsApi.list() })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  function openNew() {
    setEditing(null)
    setName('')
    setCode('')
    setOpen(true)
  }

  function openEdit(d: Department) {
    setEditing(d)
    setName(d.name)
    setCode(d.code || '')
    setOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    try {
      if (editing) {
        await departmentsApi.update(editing.id, { name, code })
        toast.success('Department updated')
      } else {
        await departmentsApi.create({ name, code })
        toast.success('Department created')
      }
      setOpen(false)
      qc.invalidateQueries({ queryKey: ['departments'] })
    } catch (e) {
      toast.error('Save failed: ' + String(e))
    }
  }

  async function handleDelete(d: Department) {
    if (!confirm(`Delete department "${d.name}"?`)) return
    try {
      await departmentsApi.delete(d.id)
      toast.success('Department deleted')
      qc.invalidateQueries({ queryKey: ['departments'] })
    } catch (e) {
      toast.error('Delete failed: ' + String(e))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 shimmer-underline inline-block">
            <Building2 className="h-5 w-5" /> Departments
          </h2>
          <p className="text-sm text-muted-foreground">{depts?.length || 0} departments</p>
        </div>
        <Button onClick={openNew} className="hover-ripple">
          <Plus className="h-4 w-4 mr-1.5" /> Add Department
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="shimmer-underline">Name</TableHead>
              <TableHead className="shimmer-underline">Code</TableHead>
              <TableHead className="shimmer-underline">Assets</TableHead>
              <TableHead className="shimmer-underline">Persons</TableHead>
              <TableHead className="text-right shimmer-underline">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : !depts || depts.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No departments yet</TableCell></TableRow>
            ) : (
              depts.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Building2 className="h-4 w-4 text-primary" />
                      </div>
                      {d.name}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="font-mono badge-shine">{d.code || '—'}</Badge></TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Package className="h-3.5 w-3.5 text-muted-foreground" />
                      {d._count?.assets || 0}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {d._count?.persons || 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover-ripple" onClick={() => openEdit(d)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover-ripple" onClick={() => handleDelete(d)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
            <DialogTitle>{editing ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editing ? 'Update the department details below.' : 'Create a new department to organize your assets and people.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Finance" />
            </div>
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. FIN" className="font-mono" />
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
