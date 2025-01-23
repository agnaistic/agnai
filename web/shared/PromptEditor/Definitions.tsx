import { Component, For, JSX, Match, Switch, createMemo } from 'solid-js'
import { FormLabel } from '../FormLabel'
import { TitleCard } from '../Card'
import { AppSchema } from '/common/types/schema'
import { RootModal } from '../Modal'
import { Interp, InterpAll } from './types'

const helpers: { [key in InterpAll | string]?: JSX.Element | string } = {
  char: 'Character name',
  user: `Your impersonated character's name. Your profile name if you aren't impersonating a character`,
  scenario: `Your main character's scenario`,
  personality: `The personality of the replying character`,
  example_dialogue: `The example dialogue of the replying character`,
  history: `(Required, or use \`#each msgs\`) Aliases: \`messages\` \`msgs\`. Chat history.`,

  'json.variable name': 'A value from your JSON schema. E.g. `{{json.name of my value}}`',
  system_prompt: `(For instruct models like Turbo, GPT-4, Claude, etc). "Instructions" for how the AI should behave. E.g. "Enter roleplay mode. You will write the {{char}}'s next reply ..."`,
  ujb: '(Aka: `{{jailbreak}}`) Similar to `system_prompt`, but typically at the bottom of the prompt',

  impersonating: `Your character's personality. This only applies when you are using the "character impersonation" feature.`,
  chat_age: `The age of your chat (time elapsed since chat created)`,
  idle_duration: `The time elapsed since you last sent a message`,
  all_personalities: `Personalities of all characters in the chat EXCEPT the main character.`,
  post: 'The "post-amble" text. This gives specific instructions on how the model should respond. E.g. Typically reads: `{{char}}:`',

  insert:
    "(Aka author's note) Insert text at a specific depth in the prompt. E.g. `{{#insert=4}}This is 4 rows from the bottom{{/insert}}`",

  memory: `Text retrieved from your Memory Book(s)`,

  longterm_memory:
    '(Aka `chat_embed`) Text retrieved from chat history embeddings. Adjust the token budget in the preset `Memory` section.',
  user_embed: 'Text retrieved from user-specified embeddings (Articles, PDFs, ...)',
  roll: 'Produces a random number. Defaults to "d20". To use a custom number: {{roll [number]}}. E.g.: {{roll 1000}}',
  random:
    'Produces a random word from a comma-separated list. E.g.: `{{random happy, sad, jealous, angry}}`',
  'each bot': (
    <>
      Supported properties: <code>{`{{.name}} {{.persona}}`}</code>
      <br />
      Example: <code>{`{{#each bot}}{{.name}}'s personality: {{.persona}}{{/each}}`}</code>
    </>
  ),
  'each message': (
    <>
      {' '}
      Supported properties: <code>{`{{.msg}} {{.name}} {{.isuser}} {{.isbot}} {{.i}}`}</code> <br />
      You can use <b>conditions</b> for isbot and isuser. E.g.{' '}
      <code>{`{{#if .isuser}} ... {{/if}}`}</code>
      <br />
      Full example:{' '}
      <code>{`{{#each msg}}{{#if .isuser}}User: {{.msg}}{{/if}}{{#if .isbot}}Bot: {{.msg}}{{/if}}{{/each}}`}</code>
    </>
  ),
  'each chat_embed': (
    <>
      Supported properties: <code>{`{{.name}} {{.text}}`}</code>
      <br />
      Example: <code>{`{{#each chat_embed}}{{.name}} said: {{.text}}{{/each}}`}</code>
    </>
  ),
  lowpriority: (
    <>
      Text that is only inserted if there still is token budget remaining for it after inserting
      conversation history.
      <br />
      Example:{' '}
      <code>{`{{#if example_dialogue}}{{#lowpriority}}This is how {{char}} speaks: {{example_dialogue}}{{/lowpriority}}{{/if}}`}</code>
    </>
  ),
}

export const DefinitionsModal: Component<{
  show: boolean
  close: () => void
  interps: Interp[]
  inherit?: Partial<AppSchema.GenSettings>
}> = (props) => {
  const items = createMemo(() => {
    const all = Object.entries(helpers)
    const entries = all.filter(([interp]) => props.interps.includes(interp as any))

    return entries
  })

  return (
    <RootModal
      show={props.show}
      close={props.close}
      title={<div>Placeholder Definitions</div>}
      maxWidth="half"
    >
      <div class="flex w-full flex-col gap-1 text-sm">
        <For each={items()}>
          {([interp, help]) => (
            <TitleCard>
              <Switch>
                <Match when={typeof help === 'string'}>
                  <FormLabel label={<b>{interp}</b>} helperMarkdown={help as string} />
                </Match>
                <Match when>
                  <FormLabel label={<b>{interp}</b>} helperText={help} />
                </Match>
              </Switch>
            </TitleCard>
          )}
        </For>
      </div>
    </RootModal>
  )
}
