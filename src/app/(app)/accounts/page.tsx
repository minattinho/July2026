import { createClient } from '@/lib/supabase/server'
import { AccountsClient } from './AccountsClient'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .order('name')

  return <AccountsClient initialAccounts={accounts ?? []} />
}
