'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate, formatMonthYear, getTransactionColor } from '@/lib/utils'
import { ptBR } from 'date-fns/locale'
import { format } from 'date-fns'

// Dynamically import recharts to avoid SSR issues
const BarChart = dynamic(
  () => import('recharts').then((m) => m.BarChart),
  { ssr: false }
)
const Bar          = dynamic(() => import('recharts').then((m) => m.Bar), { ssr: false })
const XAxis        = dynamic(() => import('recharts').then((m) => m.XAxis), { ssr: false })
const YAxis        = dynamic(() => import('recharts').then((m) => m.YAxis), { ssr: false })
const Tooltip      = dynamic(() => import('recharts').then((m) => m.Tooltip), { ssr: false })
const ResponsiveContainer = dynamic(
  () => import('recharts').then((m) => m.ResponsiveContainer),
  { ssr: false }
)
const PieChart   = dynamic(() => import('recharts').then((m) => m.PieChart), { ssr: false })
const Pie        = dynamic(() => import('recharts').then((m) => m.Pie), { ssr: false })
const Cell       = dynamic(() => import('recharts').then((m) => m.Cell), { ssr: false })
const Legend     = dynamic(() => import('recharts').then((m) => m.Legend), { ssr: false })

interface TxRaw {
  amount: number
  type: string
  date: string
  description?: string
  category?: { name: string; color: string } | null
  account?:   { name: string; color: string } | null
}

interface DashboardClientProps {
  currentMonthTransactions: TxRaw[]
  sixMonthsTransactions:    TxRaw[]
  recentTransactions:       (TxRaw & { id: string })[],
  currentYear:  number
  currentMonth: number
}

export function DashboardClient({
  currentMonthTransactions,
  sixMonthsTransactions,
  recentTransactions,
  currentYear,
  currentMonth,
}: DashboardClientProps) {
  // Summary for current month
  const totalIncome = currentMonthTransactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)

  const totalExpense = Math.abs(
    currentMonthTransactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
  )

  const balance = totalIncome - totalExpense

  // Build 6-month bar chart data
  const monthMap: Record<string, { income: number; expense: number }> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1)
    const key = format(d, 'MMM/yy', { locale: ptBR })
    monthMap[key] = { income: 0, expense: 0 }
  }

  sixMonthsTransactions.forEach((t) => {
    const d   = new Date(t.date)
    const key = format(d, 'MMM/yy', { locale: ptBR })
    if (!monthMap[key]) return
    if (t.type === 'income')  monthMap[key].income  += t.amount
    if (t.type === 'expense') monthMap[key].expense += Math.abs(t.amount)
  })

  const barData = Object.entries(monthMap).map(([month, v]) => ({
    month,
    Receitas: Math.round(v.income),
    Despesas: Math.round(v.expense),
  }))

  // Category breakdown for pie chart (expenses only)
  const catMap: Record<string, { value: number; color: string }> = {}
  currentMonthTransactions
    .filter((t) => t.type === 'expense' && t.category)
    .forEach((t) => {
      const name  = t.category!.name
      const color = t.category!.color
      if (!catMap[name]) catMap[name] = { value: 0, color }
      catMap[name].value += Math.abs(t.amount)
    })

  const pieData = Object.entries(catMap)
    .map(([name, { value, color }]) => ({ name, value: Math.round(value), color }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8)

  const monthTitle = format(new Date(currentYear, currentMonth - 1, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 capitalize">{monthTitle}</h2>
        <p className="text-sm text-slate-500">Resumo financeiro do mês</p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard
          title="Receitas"
          value={totalIncome}
          icon={<TrendingUp className="h-5 w-5 text-emerald-500" />}
          color="text-emerald-600"
        />
        <SummaryCard
          title="Despesas"
          value={totalExpense}
          icon={<TrendingDown className="h-5 w-5 text-red-500" />}
          color="text-red-500"
        />
        <SummaryCard
          title="Saldo"
          value={balance}
          icon={<Wallet className="h-5 w-5 text-blue-500" />}
          color={balance >= 0 ? 'text-emerald-600' : 'text-red-500'}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Bar chart — last 6 months */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="Receitas" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Despesas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart — expense by category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-slate-700">Despesas por categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-slate-400">
                Nenhuma despesa categorizada este mês
              </div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ percent }: { percent?: number }) =>
                        (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                    <Legend
                      formatter={(value) => (
                        <span className="text-xs text-slate-600">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-700">Transações recentes</CardTitle>
          <Link
            href="/transactions"
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900"
          >
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400">Nenhuma transação ainda</p>
              <Link href="/import" className="mt-2 inline-block text-sm font-medium text-slate-900 hover:underline">
                Importar extrato
              </Link>
            </div>
          ) : (
            <div className="divide-y">
              {recentTransactions.map((t, i) => (
                <div key={i} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900">{t.description}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(t.date)}</span>
                        {t.category && (
                          <Badge
                            variant="secondary"
                            className="text-xs h-4 px-1.5"
                            style={{
                              backgroundColor: `${t.category.color}20`,
                              color: t.category.color,
                            }}
                          >
                            {t.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${getTransactionColor(t.type as 'income' | 'expense' | 'transfer')}`}>
                    {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''}
                    {formatCurrency(Math.abs(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {icon}
        </div>
        <p className={`mt-2 text-2xl font-bold ${color}`}>
          {formatCurrency(value)}
        </p>
      </CardContent>
    </Card>
  )
}
