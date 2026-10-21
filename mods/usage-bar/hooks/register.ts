import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionUsage } from 'claude-code'

import type { Totals } from '../types'

type Usage = Pick<SessionUsage, 'context' | 'rateLimits' | 'cost'>

// Kept in $.state so a reload of the mod does not reset the session totals.
const totals = atom({ plugin: 'usage-bar', key: 'totals' } as const, { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 })
const line = atom({ plugin: 'usage-bar', key: 'line' } as const, '')

const k = (n: number): string => {
  const [v, s] = n >= 1e6 ? [n / 1e6, 'M'] : n >= 1e3 ? [n / 1e3, 'k'] : [n, '']
  return `${s ? v.toFixed(1).replace(/\.0$/, '') : v}${s}`
}

const label: Record<string, string> = { five_hour: '5h', seven_day: '7g', spend_limit: 'extra' }

// Green, yellow, red as a percentage fills up.
const dot = (pct: number): string => (pct >= 90 ? '🔴' : pct >= 70 ? '🟡' : '🟢')

const cachePct = (t: Totals): number | undefined => {
  const inTotal = t.input + t.cacheRead + t.cacheWrite
  return inTotal > 0 ? Math.round((t.cacheRead / inTotal) * 100) : undefined
}

// The full line: status line and band above the prompt.
const format = (t: Totals, u: Usage): string => {
  const cache = cachePct(t)
  const { context } = u
  const ctx =
    context.percent !== undefined && context.tokens !== undefined
      ? `ctx ${context.percent}% (${k(context.tokens)}/${k(context.window)})`
      : 'ctx –'
  const limits = u.rateLimits.map(r => `${label[r.kind] ?? r.kind} ${Math.round(r.percentUsed)}%`).join(' · ')
  const usd = u.cost ? `$${u.cost.usd.toFixed(2)}` : ''
  const tok = `tok ↑${k(t.input + t.cacheRead + t.cacheWrite)} ↓${k(t.output)}`
  return [cache === undefined ? 'cache –' : `cache ${cache}%`, ctx, tok, limits, usd].filter(Boolean).join(' · ')
}

// The short line Claude writes at the end of its answer where nothing draws the band (cloud sessions in the app).
const compact = (t: Totals, u: Usage): string => {
  const parts: string[] = []
  const pct = u.context.percent
  if (pct !== undefined) parts.push(`${dot(pct)} ctx ${pct}%`)
  for (const r of u.rateLimits) {
    const p = Math.round(r.percentUsed)
    parts.push(`${dot(p)} ${label[r.kind] ?? r.kind} ${p}%`)
  }
  if (u.cost) parts.push(`💵 $${u.cost.usd.toFixed(2)}`)
  const cache = cachePct(t)
  if (cache !== undefined) parts.push(`⚡ cache ${cache}%`)
  return parts.join('   ')
}

const refresh = async ($: EngineInterface, u?: Usage): Promise<void> => {
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

  // Without a surface (cloud sessions in the app) only the answer reaches the screen,
  // so ask Claude to end its answer with the short line. The context block is unseen by the user.
  on('prompt.submit', async ($, e, next) => {
    if (e.command || e.isMeta) return next(e)
    try {
      if ((await $.session.surfaces()).length === 0) {
        const usage = await $.session.usage()
        // Before the first answer there is no context figure yet: wait for one.
        if (usage.context.percent !== undefined) {
          const text = compact(await read($, totals), usage)
          const ask = `The user's usage-bar mod asks you to end your reply with the line below as its very last line, copied character for character, with nothing added: no tags, no quotes, no label, no code block.\n${text}`
          return next({ ...e, context: [...(e.context ?? []), ask] })
        }
      }
    } catch {
      // never block a prompt over a status line
    }
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
