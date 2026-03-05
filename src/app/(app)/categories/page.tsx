import { createClient } from '@/lib/supabase/server'
import { CategoriesClient } from './CategoriesClient'

export default async function CategoriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.eq.${user!.id},user_id.is.null`)
    .order('name')

  return <CategoriesClient initialCategories={categories ?? []} />
}
