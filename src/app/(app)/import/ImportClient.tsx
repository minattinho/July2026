'use client'

import { useState, useRef } from 'react'
import { Upload, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatCurrency } from '@/lib/utils'
import type { ParsedTransaction } from '@/lib/parsers/types'

type Step = 'upload' | 'mapping' | 'preview' | 'done'

interface ParsedTxWithMeta extends ParsedTransaction {
  isDuplicate?: boolean
}

interface Account {
  id: string
  name: string
  color: string | null
}

interface ImportClientProps {
  accounts: Account[]
}

export function ImportClient({ accounts }: ImportClientProps) {
  const [step, setStep] = useState<Step>('upload')
  const [loading, setLoading] = useState(false)

  const [file, setFile]           = useState<File | null>(null)
  const [accountId, setAccountId] = useState('')
  const [dragging, setDragging]   = useState(false)

  // OFX result
  const [importId, setImportId]         = useState('')
  const [transactions, setTransactions] = useState<ParsedTxWithMeta[]>([])
  const [stats, setStats]               = useState({ total: 0, new: 0, duplicate: 0, errors: 0 })
  const [parseErrors, setParseErrors]   = useState<string[]>([])

  // CSV result
  const [csvHeaders, setCsvHeaders]     = useState<string[]>([])
  const [csvPreviewRows, setCsvPreviewRows] = useState<Record<string, string>[]>([])
  const [csvContent, setCsvContent]     = useState('')
  const [csvMapping, setCsvMapping]     = useState<Record<string, string>>({})

  // Done
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleParse() {
    if (!file || !accountId) {
      toast.error('Selecione um arquivo e uma conta')
      return
    }
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('accountId', accountId)

      const res = await fetch('/api/import/parse', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error)

      setImportId(json.importId)

      if (json.fileType === 'ofx') {
        setTransactions(json.transactions ?? [])
        setStats(json.stats ?? { total: 0, new: 0, duplicate: 0, errors: 0 })
        setParseErrors(json.errors ?? [])
        setStep('preview')
      } else {
        // CSV: show mapping step
        setCsvHeaders(json.headers ?? [])
        setCsvPreviewRows(json.previewRows ?? [])
        setCsvContent(json.rawContent ?? '')
        setCsvMapping({ date: '', description: '', amount: '' })
        setStep('mapping')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao processar arquivo')
    } finally {
      setLoading(false)
    }
  }

  async function handleApplyCsvMapping() {
    if (!csvMapping.date || !csvMapping.description) {
      toast.error('Mapeie pelo menos as colunas de data e descrição')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/import/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      // We call confirm directly with csv content + mapping
      const confirmRes = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId,
          accountId,
          csvContent,
          csvMapping,
        }),
      })
      const json = await confirmRes.json()
      if (!confirmRes.ok) throw new Error(json.error)
      setResult(json)
      setStep('done')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch('/api/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ importId, accountId, transactions }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setResult(json)
      setStep('done')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao importar')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setStep('upload')
    setFile(null)
    setAccountId('')
    setTransactions([])
    setStats({ total: 0, new: 0, duplicate: 0, errors: 0 })
    setParseErrors([])
    setCsvHeaders([])
    setCsvPreviewRows([])
    setCsvContent('')
    setCsvMapping({})
    setResult(null)
    setImportId('')
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Importar Extrato</h2>
        <p className="text-sm text-slate-500">Importe extratos bancários nos formatos OFX ou CSV</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {(['upload', 'preview', 'done'] as Step[]).map((s, i) => {
          const steps = ['Upload', 'Visualizar', 'Concluído']
          const active = s === step || (s === 'preview' && step === 'mapping')
          const done   = (step === 'preview' && s === 'upload') ||
                         (step === 'mapping' && s === 'upload') ||
                         (step === 'done')
          return (
            <div key={s} className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                done ? 'bg-emerald-500 text-white' :
                active ? 'bg-slate-900 text-white' :
                'bg-slate-200 text-slate-500'
              }`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={active ? 'font-medium text-slate-900' : 'text-slate-400'}>
                {steps[i]}
              </span>
              {i < 2 && <ArrowRight className="h-3 w-3 text-slate-300" />}
            </div>
          )
        })}
      </div>

      {/* STEP: Upload */}
      {step === 'upload' && (
        <div className="space-y-4 rounded-lg border bg-white p-6">
          <div className="space-y-1.5">
            <Label>Conta bancária</Label>
            {accounts.length === 0 ? (
              <p className="text-sm text-amber-600">
                Cadastre uma conta antes de importar.
              </p>
            ) : (
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
              dragging ? 'border-slate-500 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ofx,.qfx,.csv"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <Upload className="mb-3 h-10 w-10 text-slate-300" />
            {file ? (
              <div>
                <p className="font-medium text-slate-900">{file.name}</p>
                <p className="text-sm text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-slate-700">Arraste o arquivo aqui</p>
                <p className="mt-1 text-sm text-slate-400">ou clique para selecionar</p>
                <p className="mt-2 text-xs text-slate-400">Suporta .OFX e .CSV</p>
              </div>
            )}
          </div>

          <Button
            className="w-full"
            onClick={handleParse}
            disabled={!file || !accountId || loading || accounts.length === 0}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Processar arquivo
          </Button>
        </div>
      )}

      {/* STEP: CSV Mapping */}
      {step === 'mapping' && (
        <div className="space-y-4 rounded-lg border bg-white p-6">
          <h3 className="font-semibold text-slate-900">Mapear colunas do CSV</h3>
          <p className="text-sm text-slate-500">
            Colunas detectadas: {csvHeaders.join(', ')}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { key: 'date',        label: 'Coluna da Data *'        },
              { key: 'description', label: 'Coluna da Descrição *'   },
              { key: 'amount',      label: 'Coluna do Valor'         },
              { key: 'debit',       label: 'Coluna de Débito'        },
              { key: 'credit',      label: 'Coluna de Crédito'       },
              { key: 'notes',       label: 'Coluna de Observações'   },
            ].map(({ key, label }) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <Select
                  value={csvMapping[key] ?? ''}
                  onValueChange={(v) => setCsvMapping((prev) => ({ ...prev, [key]: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Não usar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não usar</SelectItem>
                    {csvHeaders.map((h) => (
                      <SelectItem key={h} value={h}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          {csvPreviewRows.length > 0 && (
            <div className="overflow-x-auto">
              <p className="mb-2 text-xs font-medium text-slate-500 uppercase">Prévia (5 linhas)</p>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {csvHeaders.map((h) => (
                      <th key={h} className="border px-2 py-1 text-left text-slate-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvPreviewRows.slice(0, 5).map((row, i) => (
                    <tr key={i} className="odd:bg-white even:bg-slate-50">
                      {csvHeaders.map((h) => (
                        <td key={h} className="border px-2 py-1 text-slate-700">{row[h]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={reset}>Voltar</Button>
            <Button onClick={handleApplyCsvMapping} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importar
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Preview (OFX) */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <StatBadge label="Total" value={stats.total} color="slate" />
            <StatBadge label="Novas" value={stats.new} color="emerald" />
            <StatBadge label="Duplicatas" value={stats.duplicate} color="amber" />
            {stats.errors > 0 && (
              <StatBadge label="Erros" value={stats.errors} color="red" />
            )}
          </div>

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">Avisos de parsing:</p>
              {parseErrors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-amber-700">{e}</p>
              ))}
            </div>
          )}

          {/* Transaction preview */}
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Data</th>
                    <th className="px-3 py-2 text-left font-medium text-slate-600">Descrição</th>
                    <th className="px-3 py-2 text-right font-medium text-slate-600">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((t, i) => (
                    <tr
                      key={i}
                      className={t.isDuplicate ? 'bg-amber-50' : 'hover:bg-slate-50'}
                    >
                      <td className="px-3 py-2">
                        {t.isDuplicate ? (
                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700">
                            Duplicata
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-700">
                            Nova
                          </Badge>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                        {formatDate(t.date)}
                      </td>
                      <td className="px-3 py-2 text-slate-900">{t.description}</td>
                      <td className={`px-3 py-2 text-right font-medium ${
                        t.amount >= 0 ? 'text-emerald-600' : 'text-red-500'
                      }`}>
                        {t.amount >= 0 ? '+' : ''}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={reset}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={loading || stats.new === 0}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirmar importação ({stats.new} transações)
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Done */}
      {step === 'done' && result && (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-white p-12 text-center space-y-4">
          <CheckCircle2 className="h-14 w-14 text-emerald-500" />
          <div>
            <p className="text-xl font-bold text-slate-900">Importação concluída!</p>
            <p className="mt-1 text-slate-500">
              {result.imported} transação(ões) importada(s)
              {result.skipped > 0 && `, ${result.skipped} ignorada(s) por duplicata`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>Nova importação</Button>
            <Button asChild>
              <a href="/transactions">Ver transações</a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBadge({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'slate' | 'emerald' | 'amber' | 'red'
}) {
  const colors = {
    slate:   'bg-slate-100 text-slate-700',
    emerald: 'bg-emerald-100 text-emerald-700',
    amber:   'bg-amber-100 text-amber-700',
    red:     'bg-red-100 text-red-700',
  }
  return (
    <div className={`rounded-lg px-4 py-2 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}
