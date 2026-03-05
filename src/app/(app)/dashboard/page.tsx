import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get current month boundaries
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay  = new Date(year, month, 0).toISOString().split('T')[0]

  // Transactions for current month
  const { data: currentMonth } = await supabase
    .from('transactions')
    .select('amount, type, date, description, category:categories(name, color)')
    .eq('user_id', user!.id)
    .gte('date', firstDay)
    .lte('date', lastDay)
    .order('date', { ascending: false })

  // Last 6 months for chart
  const sixMonthsAgo = new Date(year, month - 7, 1).toISOString().split('T')[0]
  const { data: sixMonths } = await supabase
    .from('transactions')
    .select('amount, type, date')
    .eq('user_id', user!.id)
    .gte('date', sixMonthsAgo)
    .order('date')

  // Recent transactions (last 10)
  const { data: recent } = await supabase
    .from('transactions')
    .select('id, description, amount, type, date, category:categories(name, color), account:accounts(name, color)')
    .eq('user_id', user!.id)
    .order('date', { ascending: false })
    .limit(10)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toTxRaw = (arr: any[]) => arr as any[]

  return (
    <DashboardClient
      currentMonthTransactions={toTxRaw(currentMonth ?? [])}
      sixMonthsTransactions={toTxRaw(sixMonths ?? [])}
      recentTransactions={toTxRaw(recent ?? [])}
      currentYear={year}
      currentMonth={month}
    />
  )
}
