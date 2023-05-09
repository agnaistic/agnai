import { Component } from 'solid-js'
import PageHeader from '../../shared/PageHeader'
import { markdown } from '../../shared/markdown'
import { setComponentPageTitle } from '../../shared/util'

const text = `
_10 May 2023_
- Add experimental chat summarisation for image prompts. Enable it in IMAGE SETTINGS. Only works if your preset uses OpenAI.
- Fix issues with Voice playback.

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
- Added changelog
`

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
