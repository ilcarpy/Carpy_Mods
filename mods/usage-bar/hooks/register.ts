import type { Register } from 'claude-code'

const k = (n: number): string => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : `${n}`)

export const register: Register = on => {
  // Session totals (restart from zero on reload).
  let input = 0
  let output = 0
  let cacheRead = 0
  let cacheWrite = 0

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (u && e.agentId === undefined) {
      input += u.input_tokens
      output += u.output_tokens
      cacheRead += u.cache_read_input_tokens
      cacheWrite += u.cache_creation_input_tokens
    }
    try {
      const { context, rateLimits, cost } = await $.session.usage()
      const inTotal = input + cacheRead + cacheWrite
      const cachePct = inTotal > 0 ? Math.round((cacheRead / inTotal) * 100) : 0
      const ctx =
        context.percent !== undefined && context.tokens !== undefined
          ? `ctx ${context.percent}% (${k(context.tokens)}/${k(context.window)})`
          : 'ctx –'
      const label: Record<string, string> = { five_hour: 'sessione 5h', seven_day: 'settimana', spend_limit: 'spesa extra' }
      const limits = rateLimits.map(r => `${label[r.kind] ?? r.kind} ${Math.round(r.percentUsed)}%`).join(' · ')
      const usd = cost ? `$${cost.usd.toFixed(2)}` : ''
      const parts = [`cache ${cachePct}%`, ctx, `tok ↑${k(inTotal)} ↓${k(output)}`, limits, usd]
      $.ui.status(parts.filter(Boolean).join(' · '))
    } catch {
      // never break a turn over a status line
    }
    return next(e)
  })
}
