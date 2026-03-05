import { createClient } from '@/lib/supabase/server'
import { ImportClient } from './ImportClient'

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, color')
    .eq('user_id', user!.id)
    .eq('is_active', true)
    .order('name')

  return <ImportClient accounts={accounts ?? []} />
}
