import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId  = searchParams.get('accountId')
  const categoryId = searchParams.get('categoryId')
  const type       = searchParams.get('type')
  const dateFrom   = searchParams.get('dateFrom')
  const dateTo     = searchParams.get('dateTo')
  const search     = searchParams.get('search')
  const page       = parseInt(searchParams.get('page') ?? '1')
  const pageSize   = parseInt(searchParams.get('pageSize') ?? '50')
  const sortBy     = searchParams.get('sortBy') ?? 'date'
  const sortDir    = searchParams.get('sortDir') ?? 'desc'

  let query = supabase
    .from('transactions')
    .select(
      `*, account:accounts(id, name, color), category:categories(id, name, color, icon)`,
      { count: 'exact' }
    )
    .eq('user_id', user.id)

  if (accountId)  query = query.eq('account_id', accountId)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (type && type !== 'all') query = query.eq('type', type)
  if (dateFrom)   query = query.gte('date', dateFrom)
  if (dateTo)     query = query.lte('date', dateTo)
  if (search)     query = query.ilike('description', `%${search}%`)

  const from = (page - 1) * pageSize
  const to   = from + pageSize - 1

  const { data, error, count } = await query
    .order(sortBy, { ascending: sortDir === 'asc' })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data, total: count, page, pageSize })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { account_id, category_id, amount, type, description, notes, date } = body

  if (!account_id || !amount || !type || !description || !date) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ user_id: user.id, account_id, category_id, amount, type, description, notes, date })
    .select(`*, account:accounts(id, name, color), category:categories(id, name, color, icon)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
