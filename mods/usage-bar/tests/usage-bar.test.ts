import { expect, test } from 'claude-code/testing'

const BAND = {
  plugin: 'usage-bar',
  component: 'AbovePrompt',
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 100, scroll: { offset: 0, bodyRows: 4 }, view: {} },
} as const

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
  on('session.usage', () => ({
    value: {
      startedAt: 0,
      context: { tokens: 50_000, window: 200_000, percent: 25 },
      rateLimits: [{ kind: 'five_hour', percentUsed: 12 }, { kind: 'seven_day', percentUsed: 40.4 }],
      cost: { usd: 1.5 },
    },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })

  const expected = 'cache – · ctx 25% (50k/200k) · tok ↑0 ↓0 · 5h 12% · 7g 40% · $1.50'
  expect(shown.at(-1)).toBe(expected)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    const row = await ui.find({ type: 'Text', text: /ctx/ })
    expect(row?.text).toBe(expected)
    await ui.unmount()
  }
})
