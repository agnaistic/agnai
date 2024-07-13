import { Component } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { markdown } from '/web/shared/markdown'
import { Page } from '/web/Layout'

const PipelineGuide: Component = () => {
  return (
    <Page>
      <PageHeader
        title="Pipeline Guide"
        subtitle="How to install and use the Agnai Pipeline API"
      ></PageHeader>
      <div class="markdown" innerHTML={markdown.makeHtml(text)}></div>
    </Page>
  )
}

const text = `
### What is the Pipeline API?
The Pipeline API allows you to run additional features to enhance your conversations. 
Agnai.chat and local hosted conversations are both supported.
At the moment, only Embedding support using ChromaDB is currently available.

### What are embeddings?
Embeddings are similar to Memory Books, but more sophisticated. Instead of using simple "keyword" matching, they use a technique called "semantic similarity".
This means the results are based on the "likeness or closeness of their meaning". Your message is used to query entire body of text and the results are the "closest in meaning".
This means we can do things like:
- Use the last message to "jog the memory" of the AI and recall parts of the conversation that no longer fit in the prompt.
- Pass relevant parts of a PDF or article to the AI to provide meaningful responses based on that information.

### How do I install and run the Pipeline?
- You'll need [Node.JS v16+](https://nodejs.org/en/download) and [Python 3.10+](https://www.python.org/downloads/) installed.  
- Install Agnaistic using the NPM Package. From your terminal: \`npm install agnai -g \`
- Run \`agnai --pipeline\` from your terminal

### How do I now use the Pipeline?
- Head to your \`Settings -> AI Settings\` and enable "Use Local Pipeline" and hit Save.
- If your Pipeline is successfully connected, you will see a notification and a green Signal bar next to \`Memory\` in the main menu.
- If the Pipeline disconnects, you can click the Power icon next to \`Memory\` in the menu.

### How do I create and use Embeddings?
- In your \`Chat Options -> Memory\` modal, you can create embeddings from Wikipedia Articles or PDFs. This can also be done from the \`Memory -> Embeddings\` page.
- Once created, choose the Embedding from dropdown in the Memory modal and click \`Use Embedding\`.


The \`{{user_embed}}\` placeholder will automatically be injected into your prompt if you provide embedding information.
You can also manually add this to the \`{{user_embed}}\` placeholder to your template.
`

export default PipelineGuide
