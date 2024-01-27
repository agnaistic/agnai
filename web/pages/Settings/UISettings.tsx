import { Component, Show, createMemo, onCleanup } from 'solid-js'
import { toBotMsg, toUserMsg } from '../../../common/dummy'
import Button from '../../shared/Button'
import Divider from '../../shared/Divider'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import RangeInput from '../../shared/RangeInput'
import Select from '../../shared/Select'
import { createDebounce, toDropdownItems } from '../../shared/util'
import { characterStore, userStore } from '../../store'
import Message from '../Chat/components/Message'
import { Toggle } from '../../shared/Toggle'
import ColorPicker from '/web/shared/ColorPicker'
import { FormLabel } from '/web/shared/FormLabel'
import { UI } from '/common/types'
import { Save } from 'lucide-solid'
import { Trans, useTransContext } from '@mbarzda/solid-i18next'

const themeOptions = UI.UI_THEME.map((color) => ({ label: color, value: color }))

function noop() {}

const UISettings: Component = () => {
  const [t, { changeLanguage }] = useTransContext()

  const state = userStore()
  const chars = characterStore()

  const themeBgOptions = createMemo(() => {
    const options = UI.BG_THEME.map((color) => ({ label: color as string, value: color as string }))
    const custom = state.current.bgCustom || ''
    if (custom !== '') return [{ label: t('custom'), value: '' }]
    return options
  })

  const onBackground = async (results: FileInputResult[]) => {
    if (!results.length) return
    const [result] = results

    userStore.setBackground(result)
  }

  const [tryCustomUI, unsubCustomUi] = createDebounce((update: Partial<UI.CustomUI>) => {
    userStore.tryCustomUI(update)
  }, 50)

  onCleanup(() => unsubCustomUi())

  return (
    <>
      <h3 class="text-lg font-bold">{t('theme')}</h3>
      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="theme"
          items={themeOptions}
          label={t('color')}
          value={state.ui.theme}
          onChange={(item) => userStore.saveUI({ theme: item.value as any })}
        />

        <Select
          fieldName="mode"
          label={t('mode')}
          items={[
            { label: t('dark'), value: 'dark' },
            { label: t('light'), value: 'light' },
          ]}
          value={state.ui.mode}
          onChange={(item) => userStore.saveUI({ mode: item.value as any })}
        />
      </div>
      <div class="flex flex-col">
        <FormLabel
          label={t('backgrounds')}
          helperText={
            <>
              <span class="link" onClick={() => userStore.saveCustomUI({ bgCustom: '' })}>
                {t('reset_to_default')}
              </span>
            </>
          }
        />
        <div class="flex items-center gap-2">
          <Select
            fieldName="themeBg"
            items={themeBgOptions()}
            value={state.ui.themeBg}
            onChange={(item) => userStore.saveUI({ themeBg: item.value })}
          />
          <ColorPicker
            fieldName="customBg"
            onChange={(color) => userStore.saveCustomUI({ bgCustom: color })}
            onInput={(color) => tryCustomUI({ bgCustom: color })}
            value={state.current.bgCustom ?? state.ui[state.ui.mode].bgCustom}
          />
        </div>
      </div>

      <FileInput
        fieldName="background"
        label={t('background_image')}
        onUpdate={onBackground}
        accept="image/png,image/jpeg,image/jpg"
      />
      <div class="my-2 w-full justify-center">
        <Button onClick={() => userStore.setBackground(null)}>{t('remove_background')}</Button>
      </div>

      <Select
        fieldName="font"
        label={t('font')}
        items={[
          { label: t('default'), value: 'default' },
          { label: t('lato'), value: 'lato' },
        ]}
        value={state.ui.font}
        onChange={(item) => userStore.saveUI({ font: item.value as any })}
      />

      <Select
        fieldName="language"
        label={t('language')}
        items={[
          { label: t('English (United States)'), value: 'en-US' },
          { label: t('Indonesia'), value: 'id-ID' },
        ]}
        value={state.ui.language}
        onChange={(item) => {
          changeLanguage(item.value)

          userStore.saveUI({ language: item.value as any })
        }}
      />

      <Divider />
      <h3 class="text-md font-bold">{t('chat_settings')}</h3>

      <Toggle
        label={t('trim_incomplete_sentences')}
        fieldName="trimSentences"
        value={state.ui.trimSentences ?? false}
        onChange={(next) => userStore.saveUI({ trimSentences: next })}
      />

      <Toggle
        fieldName="mobileSendOnEnter"
        label={t('send_message_on_enter_on_mobile')}
        helperText={t('instead_of_adding_a_line_break_enter_will_send_message')}
        value={state.ui.mobileSendOnEnter}
        onChange={(ev) => userStore.saveUI({ mobileSendOnEnter: ev })}
      />

      <Toggle
        fieldName="contextWindowLine"
        label="Show context window delineator"
        helperText="Shows a dotted line above which messages are no longer inserted in the prompt"
        value={state.ui.contextWindowLine}
        onChange={(ev) => userStore.saveUI({ contextWindowLine: ev })}
      />

      <Select
        fieldName="chatMode"
        label={t('view_mode')}
        helperText={
          <>
            <Trans key="standard_messages_take_up_the_entire_chat_screen">
              <b>Standard</b>: Messages take up the entire chat screen.
            </Trans>
            <br />
            <Trans key="split_characters_avatar_appears_at_the_top_of_the_screen">
              <b>Split</b>: Character's avatar appears at the top of the screen
            </Trans>
          </>
        }
        items={[
          { label: t('standard'), value: 'standard' },
          { label: t('split'), value: 'split' },
        ]}
        value={state.ui.viewMode || 'standard'}
        onChange={(next) => userStore.saveUI({ viewMode: next.value as any })}
      />

      <div class="flex w-full items-center justify-between gap-2">
        <RangeInput
          parentClass="w-full"
          fieldName="chatModeHeight"
          min={25}
          max={65}
          step={1}
          label={t('split_height')}
          helperText={t('maximum_height_of_the_characters_avatar')}
          value={state.ui.viewHeight || 40}
          onChange={(value) => userStore.tryUI({ viewHeight: value })}
        />
        <Button onClick={() => userStore.saveUI({ viewHeight: state.ui.viewHeight || 40 })}>
          <Save />
        </Button>
      </div>

      <div class="flex flex-row justify-start gap-4">
        <Select
          fieldName="avatarSize"
          label={t('size')}
          items={toDropdownItems(UI.AVATAR_SIZES)}
          value={state.ui.avatarSize}
          onChange={(item) => userStore.saveUI({ avatarSize: item.value as any })}
        />
        <Select
          fieldName="avatarCorners"
          label={t('corner_radius')}
          items={toDropdownItems(UI.AVATAR_CORNERS)}
          value={state.ui.avatarCorners}
          onChange={(item) => userStore.saveUI({ avatarCorners: item.value as any })}
        />
      </div>

      <ColorPicker
        label={t('message_background_color')}
        fieldName="messageColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ msgBackground: 'bg-800' })}>
            {t('reset_to_default')}
          </span>
        }
        onInput={(color) => tryCustomUI({ msgBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ msgBackground: color })}
        value={state.current.msgBackground}
      />

      <ColorPicker
        label={t('bot_message_background_color')}
        fieldName="botMessageColor"
        helperText={
          <>
            <span class="link" onClick={() => userStore.saveCustomUI({ botBackground: 'bg-800' })}>
              {t('reset_to_default')}
            </span>
            <span>
              <Trans key="this_will_override_message_background">
                . This will override the <b>Message Background</b>.
              </Trans>
            </span>
          </>
        }
        onInput={(color) => tryCustomUI({ botBackground: color })}
        onChange={(color) => userStore.saveCustomUI({ botBackground: color })}
        value={state.current.botBackground}
      />

      <ColorPicker
        label={t('chat_text_color')}
        fieldName="chatTextColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatTextColor: 'text-800' })}>
            {t('reset_to_default')}
          </span>
        }
        onInput={(color) => tryCustomUI({ chatTextColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatTextColor: color })}
        value={state.current.chatTextColor}
      />

      <ColorPicker
        label={t('chat_emphasis_color')}
        fieldName="chatEmphasisColor"
        helperText={
          <span
            class="link"
            onClick={() => userStore.saveCustomUI({ chatEmphasisColor: 'text-600' })}
          >
            {t('reset_to_default')}
          </span>
        }
        onInput={(color) => tryCustomUI({ chatEmphasisColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatEmphasisColor: color })}
        value={state.current.chatEmphasisColor}
      />

      <ColorPicker
        label={t('chat_quote_color')}
        fieldName="chatQuoteColor"
        helperText={
          <span class="link" onClick={() => userStore.saveCustomUI({ chatQuoteColor: 'text-800' })}>
            {t('reset_to_default')}
          </span>
        }
        onInput={(color) => tryCustomUI({ chatQuoteColor: color })}
        onChange={(color) => userStore.saveCustomUI({ chatQuoteColor: color })}
        value={state.current.chatQuoteColor || '--text-800'}
      />

      <Select
        fieldName="chatWidth"
        label={t('content_width')}
        items={[
          { label: t('narrow'), value: 'narrow' },
          { label: t('large'), value: 'full' },
          { label: t('x_large'), value: 'xl' },
          { label: t('2x_large'), value: '2xl' },
          { label: t('3x_large'), value: '3xl' },
          { label: t('100%'), value: 'fill' },
        ]}
        onChange={(item) => userStore.saveUI({ chatWidth: item.value as any })}
        value={state.ui.chatWidth}
      />
      <RangeInput
        fieldName="msgOpacity"
        value={state.ui.msgOpacity}
        step={0.05}
        label={t('message_opacity')}
        helperText={t('the_opacity_of_the_message_block_in_the_chat_window')}
        min={0}
        max={1}
        onChange={(value) => userStore.saveUI({ msgOpacity: value })}
      />

      <Toggle
        fieldName="imageWrap"
        label={t('avatar_wrap_around')}
        helperText={t('allow_text_in_messages_to_wrap_around_avatars')}
        onChange={(value) => userStore.saveUI({ imageWrap: value })}
        value={state.ui.imageWrap}
      />

      <Divider />
      <div class="text-lg font-bold">{t('preview')}</div>
      <Show when={chars.characters.list.length > 0}>
        <div class="bg-100 flex w-full flex-col gap-2 rounded-md p-2">
          <Message
            editing={false}
            msg={toBotMsg(chars.characters.list[0], t('preview_chat_example_1'), {
              _id: '1',
            })}
            onRemove={noop}
            sendMessage={() => {}}
            isPaneOpen={false}
          />

          <Show when={state.profile}>
            <Message
              editing={false}
              msg={toUserMsg(state.profile!, t('preview_chat_example_2'), { _id: '2' })}
              onRemove={noop}
              sendMessage={() => {}}
              isPaneOpen={false}
            />
          </Show>
        </div>
      </Show>
    </>
  )
}

export default UISettings
