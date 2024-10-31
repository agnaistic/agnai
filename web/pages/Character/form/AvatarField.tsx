import { Component, Match, Show, Switch } from 'solid-js'
import { Card } from '/web/shared/Card'
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
import { characterStore, UserState } from '/web/store'

export const AvatarField: Component<{
  user: UserState
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
    <Card class="flex w-full flex-col gap-4 sm:flex-row">
      <div class="flex flex-col items-center gap-1">
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
        <ReelControl user={props.user} editor={props.editor} loading={state.avatar.loading} />
      </div>
      <div class="flex w-full flex-col gap-2">
        <ToggleButtons
          items={[
            { value: 'avatar', label: 'Avatar' },
            { value: 'sprite', label: 'Sprite' },
          ]}
          onChange={(opt) => props.editor.update('visualType', opt.value)}
          selected={props.editor.state.visualType}
        />

        <Switch>
          <Match when={props.editor.state.visualType === 'avatar'}>
            <FileInput
              class="w-full"
              fieldName="avatar"
              label={
                <div class="flex gap-2">
                  <div>Avatar</div>
                </div>
              }
              accept="image/png,image/jpeg,image/apng,image/gif,image/webp"
              onUpdate={props.updateFile}
            />
            <div class="flex w-full flex-col gap-2 sm:flex-row">
              <TextInput
                isMultiline
                parentClass="w-full"
                fieldName="appearance"
                label={
                  <>
                    <Regenerate
                      field={'appearance'}
                      editor={props.editor}
                      allowed={props.editor.canGuidance}
                    />
                  </>
                }
                helperText={`Leave the prompt empty to use your character's persona "looks" / "appearance" attributes`}
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
        <div></div>
      </div>
    </Card>
  )
}
