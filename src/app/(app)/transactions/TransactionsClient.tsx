'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Pencil,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { TransactionEditDialog } from '@/components/transactions/TransactionEditDialog'
import { formatCurrency, formatDate, getTransactionColor } from '@/lib/utils'
import type { Account, Category, TransactionWithRelations } from '@/types/database'

interface TransactionsClientProps {
  accounts: Account[]
  categories: Category[]
}

interface TransactionsResponse {
  data: TransactionWithRelations[]
  total: number
  page: number
  pageSize: number
}

export function TransactionsClient({ accounts, categories }: TransactionsClientProps) {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const [search, setSearch]         = useState('')
  const [accountId, setAccountId]   = useState('all')
  const [categoryId, setCategoryId] = useState('all')
  const [type, setType]             = useState('all')
  const [dateFrom, setDateFrom]     = useState('')
  const [dateTo, setDateTo]         = useState('')

  const [loading, setLoading] = useState(false)
  const [editTarget, setEditTarget] = useState<TransactionWithRelations | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchTransactions = useCallback(async (p: number = page) => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) })
    if (search)     params.set('search', search)
    if (accountId  !== 'all') params.set('accountId', accountId)
    if (categoryId !== 'all') params.set('categoryId', categoryId)
    if (type       !== 'all') params.set('type', type)
    if (dateFrom)   params.set('dateFrom', dateFrom)
    if (dateTo)     params.set('dateTo', dateTo)

    try {
      const res = await fetch(`/api/transactions?${params}`)
      const json: TransactionsResponse = await res.json()
      setTransactions(json.data ?? [])
      setTotal(json.total ?? 0)
      setPage(p)
    } catch {
      toast.error('Erro ao carregar transações')
    } finally {
      setLoading(false)
    }
  }, [search, accountId, categoryId, type, dateFrom, dateTo, page])

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => fetchTransactions(1), 300)
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, accountId, categoryId, type, dateFrom, dateTo])

  async function handleDelete(t: TransactionWithRelations) {
    if (!confirm(`Excluir "${t.description}"?`)) return
    const res = await fetch(`/api/transactions/${t.id}`, { method: 'DELETE' })
    if (res.ok) {
      setTransactions((prev) => prev.filter((tx) => tx.id !== t.id))
      setTotal((prev) => prev - 1)
      toast.success('Transação excluída')
    } else {
      toast.error('Erro ao excluir transação')
    }
  }

  function handleSaved(saved: TransactionWithRelations) {
    setTransactions((prev) => prev.map((t) => (t.id === saved.id ? saved : t)))
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Transações</h2>
        <p className="text-sm text-slate-500">{total} transação(ões) encontrada(s)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 rounded-lg border bg-white p-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="income">Receitas</SelectItem>
            <SelectItem value="expense">Despesas</SelectItem>
            <SelectItem value="transfer">Transferências</SelectItem>
          </SelectContent>
        </Select>

        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Conta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as contas</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="date"
          className="w-40"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder="De"
        />
        <Input
          type="date"
          className="w-40"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder="Até"
        />
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            Carregando...
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ArrowLeftRight className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-600">Nenhuma transação encontrada</p>
            <p className="mt-1 text-sm text-slate-400">
              Importe um extrato bancário para começar
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Data</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Descrição</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Categoria</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Conta</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">Valor</th>
                <th className="px-4 py-3 text-right font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(t.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <TypeIcon type={t.type} />
                      <span className="font-medium text-slate-900">{t.description}</span>
                    </div>
                    {t.notes && (
                      <p className="mt-0.5 text-xs text-slate-400">{t.notes}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.category ? (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{ backgroundColor: `${t.category.color}20`, color: t.category.color }}
                      >
                        {t.category.name}
                      </Badge>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {t.account ? (
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.account.color ?? '#94a3b8' }}
                        />
                        <span className="text-slate-600">{t.account.name}</span>
                      </div>
                    ) : null}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${getTransactionColor(t.type)}`}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                    {formatCurrency(Math.abs(t.amount))}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setEditTarget(t); setEditOpen(true) }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>
            Página {page} de {totalPages} ({total} registros)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactions(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchTransactions(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <TransactionEditDialog
        transaction={editTarget}
        accounts={accounts}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </div>
  )
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'income')
    return <ArrowUpCircle className="h-4 w-4 text-emerald-500 shrink-0" />
  if (type === 'expense')
    return <ArrowDownCircle className="h-4 w-4 text-red-500 shrink-0" />
  return <ArrowLeftRight className="h-4 w-4 text-blue-500 shrink-0" />
}
