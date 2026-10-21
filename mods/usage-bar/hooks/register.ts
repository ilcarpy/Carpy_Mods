import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Totals } from '../types'

// Kept in $.state so a reload of the mod does not reset the session totals.
const totals = atom({ plugin: 'usage-bar', key: 'totals' } as const, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
const line = atom({ plugin: 'usage-bar', key: 'line' } as const, '')

const k = (n: number): string => {
  const [v, s] = n >= 1e6 ? [n / 1e6, 'M'] : n >= 1e3 ? [n / 1e3, 'k'] : [n, '']
  return `${s ? v.toFixed(1).replace(/\.0$/, '') : v}${s}`
}

const label: Record<string, string> = { five_hour: '5h', seven_day: '7g', spend_limit: 'extra' }

const format = (t: Totals, u: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>): string => {
  const inTotal = t.input + t.cacheRead + t.cacheWrite
  const cache = inTotal > 0 ? `cache ${Math.round((t.cacheRead / inTotal) * 100)}%` : 'cache –'
  const { context } = u
  const ctx =
    context.percent !== undefined && context.tokens !== undefined
      ? `ctx ${context.percent}% (${k(context.tokens)}/${k(context.window)})`
      : 'ctx –'
  const limits = u.rateLimits.map(r => `${label[r.kind] ?? r.kind} ${Math.round(r.percentUsed)}%`).join(' · ')
  const usd = u.cost ? `$${u.cost.usd.toFixed(2)}` : ''
  return [cache, ctx, `tok ↑${k(inTotal)} ↓${k(t.output)}`, limits, usd].filter(Boolean).join(' · ')
}

const refresh = async ($: EngineInterface, u?: Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>): Promise<void> => {
  try {
    const text = format(await read($, totals), u ?? (await $.session.usage()))
    await update($, line, () => text)
    $.ui.status(text)
  } catch {
    // never break a turn over a status line
  }
}

export const register: Register = on => {
  // Draw the line as soon as the session starts, not only after the first turn.
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)
    return result
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u && e.agentId === undefined) {
      await update($, totals, t => ({
        input: t.input + u.input_tokens,
        output: t.output + u.output_tokens,
        cacheRead: t.cacheRead + u.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + u.cache_creation_input_tokens,
      }))
    }
    await refresh($)
    return next(e)
  })

  // Rate limits and cost also move between turns.
  on('session.measure', async ($, e, next) => {
    await refresh($, e)
    return next(e)
  })

  // The same line as a band above the prompt, always in sight (terminal and desktop draw it).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const text = await read($, line)
    if (e.props.hasSurvey || !text) return next(e)
    const { Text } = $.ui.resolve(e)
    return h(Text, { dimColor: true }, text) as JSX.Element
  })
}
