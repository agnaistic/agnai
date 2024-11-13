import { Component } from 'solid-js'
import { CharacterSchema } from '../CharacterSchema'
import { CharEditor } from '../editor'
import { MemoryBookPicker } from './MemoryBookPicker'
import { Card } from '/web/shared/Card'
import RangeInput from '/web/shared/RangeInput'
import TextInput from '/web/shared/TextInput'

export const AdvancedOptions: Component<{ editor: CharEditor }> = (props) => {
  return (
    <>
      <Card class="flex flex-col gap-2">
        <CharacterSchema
          characterId={props.editor.state.editId}
          update={(next) => props.editor.update('json', next)}
        />
        <TextInput
          isMultiline
          fieldName="systemPrompt"
          label="Character System Prompt (optional)"
          helperText={
            <span>
              {`System prompt to bundle with your character. You can use the {{original}} placeholder to include the user's own system prompt, if you want to supplement it instead of replacing it.`}
            </span>
          }
          placeholder="Enter roleplay mode. You will write {{char}}'s next reply in a dialogue between {{char}} and {{user}}. Do not decide what {{user}} says or does. Use Internet roleplay style, e.g. no quotation marks, and write user actions in italic in third person like: *example*. You are allowed to use markdown. Be proactive, creative, drive the plot and conversation forward. Write at least one paragraph, up to four. Always stay in character. Always keep the conversation going. (Repetition is highly discouraged)"
          value={props.editor.state.systemPrompt}
          onChange={(ev) => props.editor.update('systemPrompt', ev.currentTarget.value)}
        />
        <TextInput
          isMultiline
          fieldName="postHistoryInstructions"
          label="Character Jailbreak (optional)"
          helperText={
            <span>
              {`Prompt to bundle with your character, used at the bottom of the prompt. You can use the {{original}} placeholder to include the user's jailbreak (UJB), if you want to supplement it instead of replacing it.`}
            </span>
          }
          placeholder="Write at least four paragraphs."
          value={props.editor.state.postHistoryInstructions}
          onChange={(ev) => props.editor.update('postHistoryInstructions', ev.currentTarget.value)}
        />
        <TextInput
          isMultiline
          class="min-h-[80px]"
          fieldName="insertPrompt"
          label="Insert / Depth Prompt"
          helperMarkdown={`A.k.a. Author's note. Prompt to be placed near the bottom of the chat history, **Insert Depth** messages from the bottom.`}
          placeholder={`E.g. ### Instruction: Write like James Joyce.`}
          value={props.editor.state.insert?.prompt}
          onChange={(ev) =>
            props.editor.update('insert', {
              prompt: ev.currentTarget.value,
              depth: props.editor.state.insert?.depth ?? 3,
            })
          }
        />
        <RangeInput
          fieldName="insertDepth"
          label="Insert Depth"
          helperText={
            <>
              The number of messages that should exist below the <b>Insert Prompt</b>. Between 1 and
              5 is recommended.
            </>
          }
          min={0}
          max={10}
          step={1}
          value={props.editor.state.insert?.depth ?? 3}
          onChange={(ev) =>
            props.editor.update('insert', {
              prompt: props.editor.state.insert?.prompt || '',
              depth: ev,
            })
          }
        />
      </Card>
      <Card>
        <MemoryBookPicker
          setBundledBook={(book) => props.editor.update('book', book)}
          bundledBook={props.editor.state.book}
          characterId={props.editor.state.editId}
        />
      </Card>
      <Card>
        <TextInput
          fieldName="creator"
          label="Creator (optional)"
          placeholder="e.g. John1990"
          value={props.editor.state.creator}
          onChange={(ev) => props.editor.update('creator', ev.currentTarget.value)}
        />
      </Card>
      <Card>
        <TextInput
          fieldName="characterVersion"
          label="Character Version (optional)"
          placeholder="any text e.g. 1, 2, v1, v1fempov..."
          value={props.editor.state.characterVersion}
          onChange={(ev) => props.editor.update('characterVersion', ev.currentTarget.value)}
        />
      </Card>
    </>
  )
}
