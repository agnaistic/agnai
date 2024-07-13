import { Component } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { markdown } from '/web/shared/markdown'
import { Page } from '/web/Layout'

const FAQ: Component = () => {
  return (
    <Page>
      <PageHeader title="FAQ" subtitle="Frequently Asked Questions"></PageHeader>
      <div class="markdown" innerHTML={markdown.makeHtml(faq)}></div>
    </Page>
  )
}

export default FAQ

const faq = `

### Are my responses filtered?
No, Agnaistic does not make any attempt to filter your responses.

### The response from the character keeps getting cut off mid-sentence. What can I do?
There are a few things you can try:
- In your **Preset Settings** increase your \`Max Tokens\`.
- If you're using **Horde**, make sure your \`Max Tokens\` isn't "too high". In your **Settings -> Horde Settings** you can click \`Select Workers\` to view the "Context and Token" limits of each worker. Ensure your \`Max Tokens\` does not exceed their token limit.

### How can I have multiple profiles or change my name in the chat?
This is accomplished by **impersonating a character**. To impersonate, click on your Avatar/Name in the main menu.

### Can I have multiple users and characters in my chat?
Yes. In your **Chat Options**, you can add characters and invite users from **Participants**.

### Can I edit or delete my chat messages?
Yes. In the **Chat Options** enable *Chat Editing* and extra buttons will appear in your chat messages.

### My response was cut off mid-sentence, can I continue it?
Yes. In the **Input Options** you can choose to *Generate More*.

### Can I generate images based on my conversation?
Yes, you can configure image generation in your **Settings -> Image Settings**.
When you specify the Web URL, make sure it is *publicly accessible* using a service like Local Tunnel or NGrok.

### Do you support Text-to-Speech?
Yes, In your **Settings -> Voice Settings** we support a variety of text-to-speech services.

### Can I customise the UI?
Yes, you can change some elements of Agnaistic in your **Settings -> UI Settings**.

### I came from "some other site", how can I get my bot to talk like it was on that site?
All frontends behave a little differently. You can tweak how your character behaves by modifying your **Prompt Template** in your **Preset**.

### I forgot my password!
Recovering your account is not guaranteed. You can try to contact Sceik on [Discord](https://discord.agnai.chat) to try to recover your account.

### My question isn't answered here, where should I ask?
The best place to get a quick answer is on [Discord](https://discord.agnai.chat).

### Glossory / Terminology:
- **Input Options**: Accessed from the Right hand side (three-dot menu) of your chat text input.
- **Chat Options**: Accessed from your Top Right of your chat window.
- **Settings**: Accessed from the Settings link in the main menu.
- **AI Settings**: Available in your Settings page.
- **Prompt**: This is the body of text sent to your AI service to generate a response.
- **Max Context Length**: The maximum size of the prompt to send to your AI service.
- **Max Tokens**: The maximum amount of tokens to receive in response from your AI service.
- **Preset**: Also known as **Generation Settings**. This controls:
    - Which AI service you use
    - The format/shape of your *Prompt*
    - *Maximum Context Length* and *Max Tokens*
    - "Generation settings" such as "temperature", "repetition penalty", etc.
`
