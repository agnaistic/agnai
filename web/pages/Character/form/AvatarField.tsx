import { Component, Match, Show, Switch } from 'solid-js'
import AvatarContainer from '/web/shared/Avatar/Container'
import { CharEditor } from '../editor'
import { ReelControl } from './ReelControl'
import Loading from '/web/shared/Loading'
import AvatarIcon from '/web/shared/AvatarIcon'
import { ToggleButtons } from '/web/shared/Toggle'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import TextInput from '/web/shared/TextInput'
import { Regenerate } from './Regenerate'
import Button from '/web/shared/Button'
import { characterStore } from '/web/store'
import Divider from '/web/shared/Divider'

export const AvatarField: Component<{
  editor: CharEditor
  image: () => string | undefined
  setImageUrl: (url: string | undefined) => void
  updateFile: (files: FileInputResult[]) => void
  showBuilder: (show: boolean) => void
  forceNew: () => boolean
  spriteRef: any
}> = (props) => {
  const state = characterStore((s) => {
    return {
      status: s.hordeStatus,
      avatar: s.generate,
    }
  })

  return (
    <>
      <Divider class="!my-1" />
      <div class="flex flex-col items-center gap-1">
        <div class="flex w-full justify-center">
          <ToggleButtons
            items={[
              { value: 'avatar', label: 'Avatar' },
              { value: 'sprite', label: 'Sprite' },
            ]}
            class="!py-1 text-sm"
            onChange={(opt) => props.editor.update('visualType', opt.value)}
            selected={props.editor.state.visualType}
          />
        </div>

        <Switch>
          <Match when={props.editor.state.visualType === 'sprite'}>
            <div class="flex h-24 w-full justify-center sm:w-24" ref={props.spriteRef}>
              <AvatarContainer body={props.editor.state.sprite} container={props.spriteRef} />
            </div>
          </Match>
          <Match when={!state.avatar.loading}>
            <div class="flex flex-col items-center gap-1">
              <div
                class="flex items-baseline"
                style={{ cursor: state.avatar.image || props.image() ? 'pointer' : 'unset' }}
                onClick={() => props.setImageUrl(props.editor.avatar() || props.image())}
              >
                <AvatarIcon
                  format={{ corners: 'sm', size: '3xl' }}
                  avatarUrl={props.editor.avatar() || props.image()}
                />
              </div>
            </div>
          </Match>
          <Match when={state.avatar.loading}>
            <div class="flex w-[80px] flex-col items-center justify-center">
              <Loading type="windmill" />
              <Show when={state.status && state.status.wait_time > 0}>
                <span class="text-500 text-xs italic">{state.status?.wait_time}s</span>
              </Show>
            </div>
          </Match>
        </Switch>
        <ReelControl editor={props.editor} loading={state.avatar.loading} />
      </div>
      <div class="flex w-full flex-col gap-2">
        <Switch>
          <Match when={props.editor.state.visualType === 'avatar'}>
            <FileInput
              class="w-full text-sm"
              fieldName="avatar"
              accept="image/png,image/jpeg,image/apng,image/gif,image/webp"
              onUpdate={props.updateFile}
            >
              Select Avatar Image
            </FileInput>
            <div class="relative flex w-full gap-2">
              <div class="absolute right-2 top-1">
                <Regenerate field={'appearance'} editor={props.editor} />
              </div>
              <TextInput
                isMultiline
                parentClass="w-full"
                fieldName="appearance"
                placeholder="Appearance Prompt (used for Avatar Generation)"
                value={props.editor.state.appearance}
                onChange={(ev) => props.editor.update('appearance', ev.currentTarget.value)}
              />
            </div>
          </Match>
          <Match when={true}>
            <Button class="w-fit" onClick={() => props.showBuilder(true)}>
              Open Character Builder
            </Button>
          </Match>
        </Switch>
      </div>
      <Divider class="!my-1" />
    </>
  )
}
