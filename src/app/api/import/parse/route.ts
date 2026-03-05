import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseOFX } from '@/lib/parsers/ofx'
import { parseCsvPreview } from '@/lib/parsers/csv'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file      = formData.get('file') as File | null
  const accountId = formData.get('accountId') as string | null

  if (!file)      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  if (!accountId) return NextResponse.json({ error: 'Conta não selecionada' }, { status: 400 })

  const content  = await file.text()
  const fileName = file.name.toLowerCase()
  const isOfx    = fileName.endsWith('.ofx') || fileName.endsWith('.qfx')
  const isCsv    = fileName.endsWith('.csv')

  if (!isOfx && !isCsv) {
    return NextResponse.json({ error: 'Formato não suportado. Use .ofx ou .csv' }, { status: 400 })
  }

  // Create import record
  const { data: importRecord, error: importErr } = await supabase
    .from('imports')
    .insert({
      user_id:    user.id,
      account_id: accountId,
      file_name:  file.name,
      file_type:  isOfx ? 'ofx' : 'csv',
      status:     'pending',
    })
    .select()
    .single()

  if (importErr) return NextResponse.json({ error: importErr.message }, { status: 500 })

  if (isOfx) {
    const result = parseOFX(content)

    // Check which FITID already exist in DB (duplicate detection)
    const fitIds = result.transactions
      .map((t) => t.ofx_fitid)
      .filter(Boolean) as string[]

    let existingFitIds = new Set<string>()
    if (fitIds.length > 0) {
      const { data: existing } = await supabase
        .from('transactions')
        .select('ofx_fitid')
        .eq('account_id', accountId)
        .in('ofx_fitid', fitIds)
      existingFitIds = new Set((existing ?? []).map((r) => r.ofx_fitid!))
    }

    const annotated = result.transactions.map((t) => ({
      ...t,
      isDuplicate: t.ofx_fitid ? existingFitIds.has(t.ofx_fitid) : false,
    }))

    const newCount  = annotated.filter((t) => !t.isDuplicate).length
    const dupCount  = annotated.filter((t) => t.isDuplicate).length

    return NextResponse.json({
      importId:    importRecord.id,
      fileType:    'ofx',
      transactions: annotated,
      accountInfo: result.accountInfo,
      stats: {
        total:     annotated.length,
        new:       newCount,
        duplicate: dupCount,
        errors:    result.errors.length,
      },
      errors:   result.errors,
      warnings: result.warnings,
    })
  }

  // CSV: return headers + preview rows for mapping step
  const preview = parseCsvPreview(content)

  return NextResponse.json({
    importId:   importRecord.id,
    fileType:   'csv',
    headers:    preview.headers,
    previewRows: preview.rows,
    rawContent: content, // send back for confirm step
    error:      preview.error,
  })
}
