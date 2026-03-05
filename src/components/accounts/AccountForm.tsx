'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import type { Account } from '@/types/database'

const ACCOUNT_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#22c55e', '#0ea5e9',
  '#06b6d4', '#84cc16', '#94a3b8',
]

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  bank_name: z.string().optional(),
  account_type: z.enum(['checking', 'savings', 'credit', 'investment']),
  color: z.string(),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  account?: Account
  onSuccess: (account: Account) => void
  onCancel: () => void
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const [loading, setLoading] = useState(false)
  const isEditing = !!account

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: account?.name ?? '',
      bank_name: account?.bank_name ?? '',
      account_type: account?.account_type ?? 'checking',
      color: account?.color ?? '#6366f1',
    },
  })

  const selectedColor = watch('color')

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const url = isEditing ? `/api/accounts/${account.id}` : '/api/accounts'
      const method = isEditing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error)
      }
      const saved = await res.json()
      toast.success(isEditing ? 'Conta atualizada!' : 'Conta criada!')
      onSuccess(saved)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Nome da conta</Label>
        <Input placeholder="Ex: Nubank, Bradesco..." {...register('name')} />
        {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label>Banco</Label>
        <Input placeholder="Nome do banco (opcional)" {...register('bank_name')} />
      </div>

      <div className="space-y-1.5">
        <Label>Tipo de conta</Label>
        <Select
          defaultValue={account?.account_type ?? 'checking'}
          onValueChange={(v) => setValue('account_type', v as FormData['account_type'])}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="checking">Conta Corrente</SelectItem>
            <SelectItem value="savings">Poupança</SelectItem>
            <SelectItem value="credit">Cartão de Crédito</SelectItem>
            <SelectItem value="investment">Investimentos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Cor</Label>
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className="h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110"
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEditing ? 'Salvar' : 'Criar conta'}
        </Button>
      </div>
    </form>
  )
}
