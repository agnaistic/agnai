import { Component, Match, Show, Switch, createSignal } from 'solid-js'
import { getStrictForm } from '/web/shared/util'
import { toastStore } from '/web/store/toasts'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import Divider from '/web/shared/Divider'
import { slugify } from '/common/util'
import { embedApi } from '/web/store/embeddings'
import Select from '/web/shared/Select'
import { getStore } from '/web/store/create'
import { SolidCard } from '/web/shared/Card'

export { EmbedContent as default }

const EmbedContent: Component = (props) => {
  const user = getStore('user')()
  let ref: any

  const options = ['Article', 'PDF', 'Text file', 'Plain Text']
  const [type, setType] = createSignal(options[0])

  const [loading, setLoading] = createSignal(false)
  const [filename, setFilename] = createSignal('')
  const [file, setFile] = createSignal<File>()

  const embedWiki = async () => {
    setLoading(true)
    try {
      const { wiki } = getStrictForm(ref, { wiki: 'string' })
      await embedApi.embedArticle(wiki)
      toastStore.success('Successfully created embedding')
      setLoading(false)
    } finally {
      setLoading(false)
    }
  }

  const embedFile = async () => {
    setLoading(true)
    try {
      const { embedName } = getStrictForm(ref, { embedName: 'string' })
      const embedType = type()
      const docNeeded = embedType === 'PDF' || embedType === 'Text file'
      const doc = file()
      if (!doc && docNeeded) {
        toastStore.error(`No PDF loaded`)
        return
      }

      const slug = slugify(embedName)
      switch (embedType) {
        case 'PDF':
          await embedApi.embedPdf(slug, doc!)
          break

        case 'Text file':
          await embedApi.embedFile(slug, doc!)
          break

        case 'Plain Text': {
          const { embedText } = getStrictForm(ref, { embedText: 'string' })
          if (!embedText) {
            toastStore.warn(`Embedding content is empty`)
            return
          }
          await embedApi.embedPlainText(slug, embedText)
          break
        }
      }
      toastStore.success(`Successfully created embedding: ${slug}`)
    } finally {
      setLoading(false)
    }
  }

  const onFile = (files: FileInputResult[]) => {
    const file = files[0]
    if (!file) {
      setFile()
      setFilename('')
      return
    }

    setFile(() => file.file)
    const dot = file.file.name.lastIndexOf('.')
    const name = dot > -1 ? file.file.name.slice(0, dot) : file.file.name
    setFilename(slugify(name))
  }

  return (
    <form ref={ref} class="flex flex-col gap-2">
      <Show when={user.user?.disableLTM ?? true}>
        <SolidCard bg="premium-700">
          You need need to enable <b>Embeddings/Long-Term Memory</b> in your Settings
        </SolidCard>
      </Show>

      <Select
        items={options.map((value) => ({ label: `Embed: ${value}`, value }))}
        fieldName="embed-type"
        value={type()}
        onChange={(ev) => setType(ev.value)}
      />

      <Switch>
        <Match when={type() === 'Article'}>
          <TextInput
            fieldName="wiki"
            label="Embed Wikipedia Article"
            helperText="Create an embedding using the content from a Wikipedia article"
            placeholder="URL. E.g. https://en.wikipedia.org/wiki/Taylor_Swift"
          />
          <Button class="mt-2 w-fit" disabled={loading()} onClick={embedWiki}>
            Embed Article
          </Button>
        </Match>

        <Match when={type() === 'PDF'}>
          <TextInput
            fieldName="embedName"
            label="Name"
            helperText='(Optional) An identifier for your embedding. This will become a "slug". E.g. "Hello World" will become "hello-world"'
            value={filename()}
          />

          <FileInput
            fieldName="pdf"
            label="Embed PDF"
            onUpdate={onFile}
            helperText="This may take a long time depending on the size of the PDF."
            accept="application/pdf"
          />
          <Button class="mt-2 w-fit" disabled={loading() || !file()} onClick={embedFile}>
            Embed PDF
          </Button>
        </Match>

        <Match when={type() === 'Text file'}>
          <TextInput
            fieldName="embedName"
            label="Name"
            helperText='(Optional) An identifier for your embedding. This will become a "slug". E.g. "Hello World" will become "hello-world"'
            value={filename()}
          />

          <FileInput
            fieldName="pdf"
            label="Embed File"
            onUpdate={onFile}
            helperText="This may take a long time depending on the size of the file."
            accept="text/plain"
          />
          <Button class="mt-2 w-fit" disabled={loading() || !file()} onClick={embedFile}>
            Embed File
          </Button>
        </Match>

        <Match when={type() === 'Plain Text'}>
          <TextInput
            fieldName="embedName"
            label="Name"
            helperText='An identifier for your embedding. This will become a "slug". E.g. "Hello World" will become "hello-world"'
            value={filename()}
          />

          <TextInput
            fieldName="embedText"
            label="Content"
            helperText="The content to be embedded. Use line breaks to seperate lines."
            isMultiline
          />

          <Button class="mt-2 w-fit" onClick={embedFile}>
            Embed Content
          </Button>
        </Match>
      </Switch>

      <Divider />
    </form>
  )
}
