import './init'
import { expect } from 'chai'
import { toChar, toChat, toProfile, toUser } from './util'
import { OPENAI_MODELS } from '/common/adapters'
import { createPromptWithParts, getPromptParts } from '/common/prompt'
import { toChatCompletionPayload } from '/srv/adapter/chat-completion'
import { logger } from '/srv/logger'
import { getEncoder } from '/srv/tokenize'
import { GenerateRequestV2 } from '/srv/adapter/type'
import { defaultPresets } from '/common/default-preset'
import { AppSchema } from '/common/types'

const settings: Partial<AppSchema.GenSettings> = {
  oaiModel: OPENAI_MODELS.Turbo,
  service: 'openai',
  maxContextLength: 4096,
  maxTokens: 128,
  systemPrompt: 'This is a system prompt',
  useGaslight: true,
  gaslight: defaultPresets.openai.gaslight,
}

const user = toUser('Admin')
const profile = toProfile('Oreo')
const char = toChar('Robot', {
  scenario: 'Snapshot testing scenario',
  sampleChat: `{{char}}: This is how I speak\nOreo: I speak to you like this`,
})
const chat = toChat(char, {})
const characters = { [char._id]: char }
const lines = [`Robot: Greetings!`, 'Oreo: My response to your greeting!']

const encoder = () => getEncoder('openai', OPENAI_MODELS.Turbo)

describe('Chat completion', () => {
  it('will', () => {
    const actual = getPayload()
    expect(actual).toMatchSnapshot()
  })
})

type TestOpts = {
  settings?: Partial<AppSchema.GenSettings>
  char?: AppSchema.Character
  lines?: string[]
}

function getPayload(test: TestOpts = {}) {
  const { parts, opts, lines } = getOpts(test)

  const prompt = createPromptWithParts(opts, parts, lines, encoder())

  const payload = toChatCompletionPayload(
    {
      requestId: '',
      char: test.char || char,
      chat,
      gen: Object.assign({}, opts.settings, test.settings),
      kind: 'send',
      replyAs: char,
      log: logger,
      lines: prompt.lines,
      members: [profile],
      parts: prompt.parts,
      prompt: prompt.prompt,
      characters,
      impersonate: undefined,
      sender: profile,
      settings: {},
      user,
    },
    1024
  )

  return payload
}

function getOpts(test: TestOpts) {
  const history = test.lines || lines
  const parts = getPromptParts(
    {
      char,
      chat,
      members: [profile],
      replyAs: char,
      user,
      characters,
      settings,
      kind: 'send',
    },
    history,
    encoder()
  )

  const opts: GenerateRequestV2 = {
    requestId: '',
    char,
    chat,
    kind: 'send' as const,
    characters,
    lines: history,
    members: [profile],
    parts,
    replyAs: char,
    sender: profile,
    user,
    settings,
  }

  return { parts, opts, lines: history }
}
