import type { ParsedTransaction, ParseResult } from './types'

/**
 * Parse an OFX date string (YYYYMMDDHHMMSS[.mmm][TZD]) to ISO date (YYYY-MM-DD).
 */
function parseOfxDate(raw: string): string {
  const cleaned = raw.trim().replace(/\[.*\]/, '')  // strip timezone info
  const year  = cleaned.slice(0, 4)
  const month = cleaned.slice(4, 6)
  const day   = cleaned.slice(6, 8)
  return `${year}-${month}-${day}`
}

/**
 * Map OFX TRNTYPE to our transaction type.
 */
function mapTrnType(trnType: string): 'income' | 'expense' | 'transfer' {
  const upper = trnType.toUpperCase().trim()
  switch (upper) {
    case 'CREDIT':
    case 'INT':      // interest
    case 'DIV':      // dividend
    case 'DIRECTDEP':
    case 'DEPOSIT':
      return 'income'
    case 'DEBIT':
    case 'PAYMENT':
    case 'CHECK':
    case 'SRVCHG':   // service charge
    case 'ATM':
    case 'POS':
    case 'FEE':
      return 'expense'
    case 'XFER':
    case 'TRANSFER':
      return 'transfer'
    default:
      return 'expense'
  }
}

/**
 * Parse OFX 1.x SGML format (unclosed tags, no XML declaration).
 * Walks through text sequentially collecting STMTTRN blocks.
 */
function parseSGML(body: string): { transactions: ParsedTransaction[]; errors: string[] } {
  const transactions: ParsedTransaction[] = []
  const errors: string[] = []

  // Extract STMTTRN blocks
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(body)) !== null) {
    const block = match[1]

    function getTag(tag: string): string {
      const m = new RegExp(`<${tag}>([^<\r\n]*)`, 'i').exec(block)
      return m ? m[1].trim() : ''
    }

    try {
      const dtPosted = getTag('DTPOSTED')
      const trnAmt   = getTag('TRNAMT')
      const fitId    = getTag('FITID')
      const trnType  = getTag('TRNTYPE')
      const name     = getTag('NAME')
      const memo     = getTag('MEMO')
      const checkNum = getTag('CHECKNUM')

      if (!dtPosted || !trnAmt) {
        errors.push(`Transação sem data ou valor ignorada`)
        continue
      }

      const amount = parseFloat(trnAmt.replace(',', '.'))
      if (isNaN(amount)) {
        errors.push(`Valor inválido: "${trnAmt}"`)
        continue
      }

      const description = name || memo || 'Sem descrição'
      const inferredType = trnType
        ? mapTrnType(trnType)
        : amount >= 0 ? 'income' : 'expense'

      transactions.push({
        date:        parseOfxDate(dtPosted),
        description,
        amount,
        type:        inferredType,
        notes:       name && memo ? memo : undefined,
        ofx_fitid:   fitId || undefined,
        checknum:    checkNum || undefined,
      })
    } catch (e) {
      errors.push(`Erro ao processar transação: ${e}`)
    }
  }

  return { transactions, errors }
}

/**
 * Parse OFX 2.x XML format using DOMParser (browser) or regex fallback (server).
 */
function parseXML(body: string): { transactions: ParsedTransaction[]; errors: string[] } {
  // In Next.js server context, we use regex-based approach (same as SGML)
  // since DOMParser is not available server-side without a polyfill.
  return parseSGML(body)
}

/**
 * Extract account info from OFX body.
 */
function extractAccountInfo(body: string) {
  function getTag(tag: string) {
    const m = new RegExp(`<${tag}>([^<\r\n]*)`, 'i').exec(body)
    return m ? m[1].trim() : undefined
  }
  return {
    bankId:    getTag('BANKID'),
    accountId: getTag('ACCTID'),
    currency:  getTag('CURDEF'),
  }
}

/**
 * Main OFX parser. Handles both OFX 1.x (SGML) and OFX 2.x (XML).
 */
export function parseOFX(content: string): ParseResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Split header and body at the first <OFX> tag
  const ofxStart = content.indexOf('<OFX>')
  if (ofxStart === -1) {
    return {
      transactions: [],
      errors: ['Arquivo OFX inválido: tag <OFX> não encontrada'],
      warnings,
    }
  }

  const header = content.slice(0, ofxStart)
  const body   = content.slice(ofxStart)

  // Determine OFX version from header
  const versionMatch = /VERSION:(\d+)/i.exec(header)
  const version = versionMatch ? parseInt(versionMatch[1]) : 102

  const isXml = version >= 200 || content.trimStart().startsWith('<?xml')

  const { transactions, errors: parseErrors } = isXml
    ? parseXML(body)
    : parseSGML(body)

  errors.push(...parseErrors)

  const accountInfo = extractAccountInfo(body)

  if (transactions.length === 0 && errors.length === 0) {
    warnings.push('Nenhuma transação encontrada no arquivo OFX')
  }

  return { transactions, accountInfo, errors, warnings }
}
