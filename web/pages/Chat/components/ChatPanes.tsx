import {
  Component,
  JSX,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from 'solid-js'
import { ChatRightPane, characterStore, chatStore } from '/web/store'
import Convertible from '../Convertible'
import { useParams, useSearchParams } from '@solidjs/router'
import { getActiveBots } from '../util'
import { AppSchema } from '/common/types'
import { CreateCharacterForm } from '../../Character/CreateCharacterForm'
import Loading from '/web/shared/Loading'
import { ChatGenSettings } from '../ChatGenSettings'
import MemberModal from '../MemberModal'
import Button from '/web/shared/Button'
import UISettings from '../../Settings/UISettings'
import { wait } from '/common/util'
import CharacterSelect from '/web/shared/CharacterSelect'
import { isValid } from '/common/valid'
import ChatSettings from '../ChatSettings'

export { ChatPanes as default }

const ChatPanes: Component<{
  setShowOpts: (state: boolean) => void
}> = (props) => {
  const params = useParams()
  const [search, setSearch] = useSearchParams()

  const chars = characterStore((s) => ({
    chatBots: s.characters.list,
    botMap: s.characters.map,
    impersonate: s.impersonating,
  }))

  const chats = chatStore((s) => {
    return {
      ...(s.active?.chat._id === params.id ? s.active : undefined),
      opts: s.opts,
      activeBots: getActiveBots(s.active?.chat!, chars.botMap),
      tempBots: Object.values(s.active?.chat?.tempCharacters! || {}),
    }
  })

  const [paneFooter, setPaneFooter] = createSignal<JSX.Element>()
  const [editId, setEditId] = createSignal<string>()

  onMount(() => {
    if (isValid({ pane: ['character', 'preset', 'participants', 'ui', 'chat-settings'] }, search)) {
      togglePane(search.pane)
    }
  })

  onCleanup(() => {
    closeCharEditor(false)
  })

  createEffect(() => {
    setEditId(chats.char?._id ?? '')
  })

  const editableCharcters = createMemo(() => {
    const ids = new Map<string, AppSchema.Character>()

    if (chats.char) {
      ids.set(chats.char._id, chats.char)
    }

    if (chars.impersonate) {
      ids.set(chars.impersonate._id, chars.impersonate)
    }

    for (const bot of chats.activeBots) {
      ids.set(bot._id, bot)
    }

    const editable = Array.from(ids.values())
    return editable
  })

  const charBeingEdited = createMemo(() => {
    return chars.chatBots.find((ch) => ch._id === editId())
  })

  const changeEditingChar = async (char: AppSchema.Character | undefined) => {
    const prev = editId()
    if (prev === char?._id) return

    setEditId('')
    if (!char) return
    await wait(0.2)
    setEditId(char._id)
  }

  const togglePane = (paneType: ChatRightPane) => {
    props.setShowOpts(false)
    chatStore.option('pane', chats.opts.pane === paneType ? undefined : paneType)
    setSearch({ pane: paneType })
  }

  const closePane = (search = true) => {
    chatStore.option('pane', undefined)
    if (search) {
      setSearch({ pane: undefined })
    }
  }

  const closeCharEditor = (search?: boolean) => {
    closePane(search)
    setEditId(chats.char?._id || '')
  }

  return (
    <Show when={!!chats.opts.pane}>
      <Switch>
        <Match when={chats.opts.pane === 'character'}>
          <Convertible
            kind="partial"
            title="Edit Character"
            close={closeCharEditor}
            footer={paneFooter()}
          >
            <Show when={editId() !== ''}>
              <CreateCharacterForm
                chat={chats.chat}
                editId={editId()}
                footer={setPaneFooter}
                close={closeCharEditor}
              >
                <Show when={editableCharcters().length > 1}>
                  <CharacterSelect
                    class="w-full"
                    fieldName="editingId"
                    items={editableCharcters()}
                    value={charBeingEdited()}
                    onChange={changeEditingChar}
                  />
                </Show>
              </CreateCharacterForm>
            </Show>

            <Show when={editId() === ''}>
              <div class="flex h-full w-full items-center justify-center">
                <Loading />
              </div>
            </Show>
          </Convertible>
        </Match>

        <Match when={chats.opts.pane === 'preset'}>
          <Convertible
            kind="partial"
            title={'Preset Settings'}
            close={closePane}
            footer={paneFooter()}
          >
            <ChatGenSettings chat={chats.chat!} close={closePane} footer={setPaneFooter} />
          </Convertible>
        </Match>

        <Match when={chats.opts.pane === 'participants'}>
          <MemberModal show chat={chats.chat!} charId={chats?.char?._id!} close={closePane} />
        </Match>

        <Match when={chats.opts.pane === 'ui'}>
          <Convertible
            kind="partial"
            close={closePane}
            title="UI Settings"
            footer={<Button onClick={() => closePane()}>Close</Button>}
          >
            <UISettings />
          </Convertible>
        </Match>

        <Match when={chats.opts.pane === 'chat-settings'}>
          <Convertible kind="partial" close={closePane} title="Chat Settings" footer={paneFooter()}>
            <ChatSettings footer={setPaneFooter} close={closePane} />
          </Convertible>
        </Match>
      </Switch>
    </Show>
  )
}
