'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Tags } from 'lucide-react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { Category } from '@/types/database'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#22c55e', '#0ea5e9', '#06b6d4', '#84cc16',
  '#94a3b8', '#6b7280',
]

const TYPE_LABEL: Record<string, string> = {
  income:  'Receita',
  expense: 'Despesa',
  both:    'Ambos',
}

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  color: z.string(),
  type: z.enum(['income', 'expense', 'both']),
})

type FormData = z.infer<typeof schema>

interface CategoriesClientProps {
  initialCategories: Category[]
}

export function CategoriesClient({ initialCategories }: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Category | undefined>()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', color: '#6366f1', type: 'expense' },
  })

  const selectedColor = watch('color')

  function openCreate() {
    setEditing(undefined)
    reset({ name: '', color: '#6366f1', type: 'expense' })
    setDialogOpen(true)
  }

  function openEdit(cat: Category) {
    setEditing(cat)
    reset({ name: cat.name, color: cat.color, type: cat.type })
    setDialogOpen(true)
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const url = editing ? `/api/categories/${editing.id}` : '/api/categories'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const saved: Category = await res.json()
      setCategories((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id)
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = saved
          return next
        }
        return [...prev, saved].sort((a, b) => a.name.localeCompare(b.name))
      })
      toast.success(editing ? 'Categoria atualizada!' : 'Categoria criada!')
      setDialogOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(cat: Category) {
    if (!cat.user_id) {
      toast.error('Não é possível excluir categorias padrão do sistema')
      return
    }
    if (!confirm(`Excluir categoria "${cat.name}"?`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
      toast.success('Categoria excluída')
    } else {
      toast.error('Erro ao excluir categoria')
    }
  }

  const userCategories = categories.filter((c) => c.user_id)
  const systemCategories = categories.filter((c) => !c.user_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Categorias</h2>
          <p className="text-sm text-slate-500">Organize suas transações por categoria</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova categoria
        </Button>
      </div>

      {/* User categories */}
      {userCategories.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Minhas categorias</h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {userCategories.map((cat) => (
              <CategoryRow key={cat.id} cat={cat} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {/* System categories */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Categorias padrão</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {systemCategories.map((cat) => (
            <CategoryRow key={cat.id} cat={cat} onEdit={openEdit} onDelete={handleDelete} />
          ))}
        </div>
      </div>

      {categories.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Tags className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhuma categoria</p>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar categoria' : 'Nova categoria'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input placeholder="Ex: Alimentação, Salário..." {...register('name')} />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select
                defaultValue={editing?.type ?? 'expense'}
                onValueChange={(v) => setValue('type', v as FormData['type'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Receita</SelectItem>
                  <SelectItem value="expense">Despesa</SelectItem>
                  <SelectItem value="both">Ambos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className="h-7 w-7 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: color,
                      outline: selectedColor === color ? `2px solid ${color}` : 'none',
                      outlineOffset: '2px',
                    }}
                    onClick={() => setValue('color', color)}
                  />
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {editing ? 'Salvar' : 'Criar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function CategoryRow({
  cat,
  onEdit,
  onDelete,
}: {
  cat: Category
  onEdit: (c: Category) => void
  onDelete: (c: Category) => void
}) {
  const TYPE_LABEL: Record<string, string> = {
    income: 'Receita', expense: 'Despesa', both: 'Ambos',
  }
  return (
    <div className="flex items-center justify-between rounded-lg border bg-white p-3">
      <div className="flex items-center gap-2.5">
        <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
        <span className="text-sm font-medium text-slate-800">{cat.name}</span>
        <Badge variant="secondary" className="text-xs">{TYPE_LABEL[cat.type]}</Badge>
      </div>
      {cat.user_id && (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(cat)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-600"
            onClick={() => onDelete(cat)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  )
}
