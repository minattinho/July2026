'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AccountForm } from '@/components/accounts/AccountForm'
import type { Account } from '@/types/database'

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  checking:   'Conta Corrente',
  savings:    'Poupança',
  credit:     'Cartão de Crédito',
  investment: 'Investimentos',
}

interface AccountsClientProps {
  initialAccounts: Account[]
}

export function AccountsClient({ initialAccounts }: AccountsClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Account | undefined>()

  function openCreate() {
    setEditing(undefined)
    setDialogOpen(true)
  }

  function openEdit(account: Account) {
    setEditing(account)
    setDialogOpen(true)
  }

  function handleSaved(saved: Account) {
    setAccounts((prev) => {
      const idx = prev.findIndex((a) => a.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [...prev, saved]
    })
    setDialogOpen(false)
  }

  async function handleDelete(account: Account) {
    if (!confirm(`Deseja desativar a conta "${account.name}"?`)) return
    const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' })
    if (res.ok) {
      setAccounts((prev) => prev.filter((a) => a.id !== account.id))
      toast.success('Conta removida')
    } else {
      toast.error('Erro ao remover conta')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Contas</h2>
          <p className="text-sm text-slate-500">{accounts.length} conta(s) cadastrada(s)</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nova conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Wallet className="mb-3 h-10 w-10 text-slate-300" />
          <p className="font-medium text-slate-600">Nenhuma conta cadastrada</p>
          <p className="mt-1 text-sm text-slate-400">Crie uma conta para começar a registrar suas transações</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nova conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Card key={account.id} className="overflow-hidden">
              <div className="h-2" style={{ backgroundColor: account.color ?? '#94a3b8' }} />
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{account.name}</p>
                    {account.bank_name && (
                      <p className="text-xs text-slate-500">{account.bank_name}</p>
                    )}
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {ACCOUNT_TYPE_LABEL[account.account_type]}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(account)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600"
                      onClick={() => handleDelete(account)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar conta' : 'Nova conta'}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editing}
            onSuccess={handleSaved}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
