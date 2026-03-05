import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from './TransactionsClient'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, color, account_type')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('categories')
      .select('id, name, color, icon, type')
      .or(`user_id.eq.${user!.id},user_id.is.null`)
      .order('name'),
  ])

  return (
    <TransactionsClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      accounts={(accounts ?? []) as any[]}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      categories={(categories ?? []) as any[]}
    />
  )
}
