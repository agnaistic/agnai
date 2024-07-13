import { Component } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { markdown } from '/web/shared/markdown'
import { Page } from '/web/Layout'

const NovelGuide: Component = () => {
  return (
    <Page>
      <PageHeader title="NovelAI Guide"></PageHeader>
      <div class="markdown" innerHTML={markdown.makeHtml(text)}></div>
    </Page>
  )
}

const text = `
# Novel Instructions

There are two methods to setup NovelAI:

**Get the persistent API token from the NovelAI site.**

1. Login to [NovelAI](https://novelai.net/stories)
2. Open your User Settings and go to the Account tab
3. Press the Get Persistent API Token button
4. Copy (use the clipboard button)/paste the resulting token into the \`Novel API Key\` field in your [NovelAI Settings Page](https://agnai.chat/settings?tab=ai&service=novelai)

The API Key will look something like this:

\`\`\`
pst-ykHYhtDti6ZYYmgCtUnhYraECciZQCEVMGhhh4HUgRf7XLQGzeDinQtCRECZJXWE
\`\`\`

or

**Manually retrieve your token from the NovelAI site using the Developer Tools.**

1. Login to [Novel AI](https://novelai.net/stories)
2. Open the Developer Tools using one of the following methods:

   - \`Ctrl + Shift + I\`
   - Right click the page --> Click _Inspect_

3. Open the \`Console\` tab and type:

- \`console.log(JSON.parse(localStorage.getItem('session')).auth_token)\`

4. Copy/paste the resulting output into the \`Novel API Key\` field in your [NovelAI Settings Page](/settings?tab=ai&service=novelai)

The API Key will look something like this:

\`\`\`
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ii4uLiIsImlhdCI6MTUxNjIzOTAyMn0.pCVUFONBLI_Lw3vKQG6ykCkuWNeG4cDhdEqRO_QJbh4
\`\`\`

Please note that this token will periodically expire and will require replacement once every month. It is preferred to use the persistent API token.
`

export default NovelGuide
