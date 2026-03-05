'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Account, Category, TransactionWithRelations } from '@/types/database'

const schema = z.object({
  description: z.string().min(1, 'Descrição é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório'),
  type: z.enum(['income', 'expense', 'transfer']),
  date: z.string().min(1, 'Data é obrigatória'),
  account_id: z.string().min(1, 'Conta é obrigatória'),
  category_id: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface TransactionEditDialogProps {
  transaction: TransactionWithRelations | null
  accounts: Account[]
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (transaction: TransactionWithRelations) => void
}

export function TransactionEditDialog({
  transaction,
  accounts,
  categories,
  open,
  onOpenChange,
  onSaved,
}: TransactionEditDialogProps) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    values: transaction
      ? {
          description: transaction.description,
          amount: String(Math.abs(transaction.amount)),
          type: transaction.type,
          date: transaction.date,
          account_id: transaction.account_id,
          category_id: transaction.category_id ?? '',
          notes: transaction.notes ?? '',
        }
      : undefined,
  })

  const type = watch('type')

  async function onSubmit(data: FormData) {
    if (!transaction) return
    setLoading(true)
    try {
      // Store expenses as negative, income as positive
      const numAmount = parseFloat(String(data.amount).replace(',', '.'))
      const amount = data.type === 'expense' ? -Math.abs(numAmount) : Math.abs(numAmount)
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          amount,
          category_id: data.category_id || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const saved = await res.json()
      toast.success('Transação atualizada!')
      onSaved(saved)
      onOpenChange(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const filteredCategories = categories.filter(
    (c) => c.type === 'both' || c.type === type
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar transação</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input {...register('description')} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0" {...register('amount')} />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select
              defaultValue={transaction?.type ?? 'expense'}
              onValueChange={(v) => setValue('type', v as FormData['type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="transfer">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <Select
              defaultValue={transaction?.account_id}
              onValueChange={(v) => setValue('account_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.account_id && <p className="text-xs text-red-500">{errors.account_id.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              defaultValue={transaction?.category_id ?? ''}
              onValueChange={(v) => setValue('category_id', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Sem categoria</SelectItem>
                {filteredCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Notas</Label>
            <Input placeholder="Observações (opcional)" {...register('notes')} />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
