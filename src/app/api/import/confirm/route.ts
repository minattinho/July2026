import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { applyCsvMapping } from '@/lib/parsers/csv'
import type { CsvColumnMapping, ParsedTransaction } from '@/lib/parsers/types'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const {
    importId,
    accountId,
    transactions,         // for OFX: already parsed
    csvContent,           // for CSV: raw content
    csvMapping,           // for CSV: column mapping
  } = body as {
    importId:     string
    accountId:    string
    transactions?: (ParsedTransaction & { isDuplicate?: boolean })[]
    csvContent?:  string
    csvMapping?:  CsvColumnMapping
  }

  if (!importId || !accountId) {
    return NextResponse.json({ error: 'importId e accountId são obrigatórios' }, { status: 400 })
  }

  let toInsert: ParsedTransaction[] = []

  if (transactions) {
    // OFX flow: use pre-parsed transactions, skip duplicates
    toInsert = transactions.filter((t) => !t.isDuplicate)
  } else if (csvContent && csvMapping) {
    // CSV flow: apply mapping now
    const result = applyCsvMapping(csvContent, csvMapping)
    toInsert = result.transactions
  } else {
    return NextResponse.json({ error: 'Dados de importação ausentes' }, { status: 400 })
  }

  if (toInsert.length === 0) {
    await supabase
      .from('imports')
      .update({ status: 'done', total_rows: 0, imported_rows: 0, skipped_rows: 0 })
      .eq('id', importId)
    return NextResponse.json({ imported: 0, skipped: 0 })
  }

  // Build rows for upsert
  const rows = toInsert.map((t) => ({
    user_id:    user.id,
    account_id: accountId,
    import_id:  importId,
    date:       t.date,
    description: t.description,
    amount:     t.amount,
    type:       t.type,
    notes:      t.notes ?? null,
    ofx_fitid:  t.ofx_fitid ?? null,
    checknum:   t.checknum ?? null,
  }))

  // Upsert: skip duplicates via the unique constraint (account_id, ofx_fitid)
  const { data: inserted, error } = await supabase
    .from('transactions')
    .upsert(rows, {
      onConflict: 'account_id,ofx_fitid',
      ignoreDuplicates: true,
    })
    .select('id')

  if (error) {
    await supabase
      .from('imports')
      .update({ status: 'error', error_message: error.message })
      .eq('id', importId)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const importedCount = inserted?.length ?? 0
  const skippedCount  = toInsert.length - importedCount

  await supabase
    .from('imports')
    .update({
      status:        'done',
      total_rows:    toInsert.length,
      imported_rows: importedCount,
      skipped_rows:  skippedCount,
    })
    .eq('id', importId)

  return NextResponse.json({ imported: importedCount, skipped: skippedCount })
}
