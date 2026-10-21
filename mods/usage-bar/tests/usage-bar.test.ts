import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-bar',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const

const TURN = { reason: 'answer', answer: 'the answer', durationMs: 1000, isAborted: false, turnId: 't1' } as const

const USAGE = {
  startedAt: 0,
  context: { tokens: 50_000, window: 200_000, percent: 25 },
  rateLimits: [{ kind: 'five_hour', percentUsed: 12 }, { kind: 'seven_day', percentUsed: 95.4 }],
  cost: { usd: 1.5 },
}

test('the line is drawn at session start, as a band above the prompt', async ($, on) => {
  // These hooks stand for the engine.
  const shown: (string | undefined)[] = []
  on('ui.status', (_, e) => {
    shown.push(e.text)
    return { value: undefined }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return h(Text, {}, 'engine') as JSX.Element
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({ value: USAGE }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const expected = 'cache – · ctx 25% (50k/200k) · tok ↑0 ↓0 · 5h 12% · 7g 95% · $1.50'
  expect(shown.at(-1)).toBe(expected)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Text', text: /ctx/ })
    expect(row?.text).toBe(expected)
    await ui.unmount()
  }
})

test('with no surface attached, Claude is asked to end its answer with the short line', async ($, on) => {
  on('ui.status', () => ({ value: undefined }))
  on('session.usage', () => ({ value: USAGE }))
  on('session.surfaces', () => ({ value: [] }))
  on('turn.complete', () => ({ text: 'the answer' }))
  let context: readonly string[] | undefined
  on('prompt.submit', (_, e) => {
    context = e.context
    return { text: e.text }
  })

  await $.turn.complete({
    ...TURN,
    usage: { model: 'claude', input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 },
  })
  await $.prompt.submit({ text: 'ciao', wait: false, origin: { kind: 'composer' } })
  expect(context?.[0]?.split('\n').at(-1)).toBe('🟢 ctx 25%   🟢 5h 12%   🔴 7g 95%   💵 $1.50   ⚡ cache 90%')
  expect(context?.[0]).not.toContain('<')
})

test('with a surface attached, the prompt is left as it is', async ($, on) => {
  on('ui.status', () => ({ value: undefined }))
  on('session.usage', () => ({ value: USAGE }))
  on('session.surfaces', () => ({ value: ['desktop'] }))
  let context: readonly string[] | undefined
  on('prompt.submit', (_, e) => {
    context = e.context
    return { text: e.text }
  })

  await $.prompt.submit({ text: 'ciao', wait: false, origin: { kind: 'composer' } })
  expect(context).toBeUndefined()
})
