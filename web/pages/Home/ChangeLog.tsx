import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { markdown } from '../../shared/markdown'
import { setComponentPageTitle } from '../../shared/util'

const text = `
_29 June 2023_
- Add character "sprites". These are an alternative to avatar images.
- "Trim Sentences" option in UI settings. This will trim incomplete sentences.
- Character Card V2 support

_17 June 2023_
- New character and preset editor pane. Edit your characters and presets while chatting!
- Added new OpenAI models
- Add token counts to character editor
- New Prompt Editor (nearly ready to support advanced prompt templates!)

_6 June 2023_
- Add background color to customizable colors

_3 June 2023_
- Add "message background color", "chat text color", and "chat emphasis color" to UI settings

_1 June 2023_
- Character impersonation! You can now speak as characters that you create. Click on your avatar/name in the menu.

_31 May 2023_
- Experimental release: "Adventure" (aka Choose your own adventure or CYOA) mode for OpenAI Turbo
- Migrate to "prompt templates" - More to come on this functionality soon
- Use the correct NovelAI tokenizers when required

_20-28 May 2023_
- Remember chat input "drafts"
- Add PNG character card export format
- Add NovelAI Clio, text-to-speech and chat summarisation for images
- Allow multiple horde models to be selected

_19 May 2023_
- Image retry uses previous prompt (only applies to new images)
- Clicking an avatar in chat opens the avatar in the image viewer modal
- Allow using a custom prompt to generate a character avatar

_15 May 2023_
- Add 'avatar wrap-around'. Enable this in the UI settings will allow text to wrap around avatars in messages.
- Fix 'failing to send a message' after editing the chat.
- Include character appearances in OpenAI chat summarisations for image prompts.

_13 May 2023_
- Introduce "multiple character" capability. Add characters to your chats using the 'Participants' option.
  - Multi-user + Multi-character is supported.
- Add 'OOC toggle' adjacent to message input for multi-user rooms

_10 May 2023_
- Add experimental chat summarisation for image prompts. Enable it in IMAGE SETTINGS. Only works if your preset uses OpenAI.
- Fix issues with Voice playback.
- Add AI generated character avatars. Create or Edit your character to generate an avatar.

_8 May 2023_
- Add support to import from characters from CharacterHub.org
- Added GooseAI support
- Add "out of character" mode for group chats

_6 May 2023_
- Added text-to-speech, speech-to-text
- Fixed issue with memory books for authed users
- Reduced bundle size (from 7MB to 1MB)

_5 May 2023_
- Improve character importing: Allow multiple imports and improve error reporting

_21 Apr 2023_
- Added dashboard
- Added change log`

const ChangeLog: Component = () => {
  setComponentPageTitle('Changelog')
  return (
    <>
      <PageHeader title="Change Log" />

      <div class="markdown" innerHTML={markdown.makeHtml(text)}></div>
    </>
  )
}

export default ChangeLog
