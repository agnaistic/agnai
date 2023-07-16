import { Component, Show, createSignal } from 'solid-js'
import { getStrictForm } from '/web/shared/util'
import { pipelineApi } from '/web/store/data/pipeline'
import { toastStore } from '/web/store/toasts'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { memoryStore, settingStore } from '/web/store'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import Divider from '/web/shared/Divider'
import { slugify } from '/common/util'

export { EmbedContent as default }

const EmbedContent: Component = (props) => {
  let ref: any
  const cfg = settingStore()

  const [loading, setLoading] = createSignal(false)
  const [pdfName, setPdfName] = createSignal('')
  const [file, setFile] = createSignal<File>()

  const embedWiki = async () => {
    setLoading(true)
    try {
      const { wiki } = getStrictForm(ref, { wiki: 'string' })
      await pipelineApi.embedArticle(wiki)
      toastStore.success('Successfully created embedding')
      setLoading(false)
      memoryStore.listCollections()
    } finally {
      setLoading(false)
    }
  }

  const embedPdf = async () => {
    setLoading(true)
    try {
      const { pdfName } = getStrictForm(ref, { pdfName: 'string' })
      const pdf = file()
      if (!pdf) {
        toastStore.error(`No PDF loaded`)
        return
      }

      const slug = slugify(pdfName)
      await pipelineApi.embedPdf(slug, pdf)
      toastStore.success(`Successfully created embedding: ${slug}`)
      memoryStore.listCollections()
    } finally {
      setLoading(false)
    }
  }

  const onFile = (files: FileInputResult[]) => {
    const file = files[0]
    if (!file) {
      setFile()
      setPdfName('')
      return
    }

    setFile(() => file.file)
    setPdfName(slugify(file.file.name).slice(0, 63))
  }

  return (
    <Show when={cfg.pipelineOnline}>
      <form ref={ref}>
        <TextInput
          fieldName="wiki"
          label="Embed Wikipedia Article"
          helperText="Create an embedding using the content from a Wikipedia article"
          placeholder="URL. E.g. https://en.wikipedia.org/wiki/Taylor_Swift"
        />
        <Button class="mt-2" disabled={loading()} onClick={embedWiki}>
          Embed
        </Button>

        <Divider />

        <TextInput
          fieldName="pdfName"
          label="Name"
          helperText='(Optional) An identifier for your embedding. This will become a "slug". E.g. "Hello World" will become "hello-world"'
          value={pdfName()}
        />

        <FileInput
          fieldName="pdf"
          label="Embed PDF"
          onUpdate={onFile}
          helperText="This may take a long time depending on the size of the PDF."
          accept="application/pdf"
        />
        <Button class="mt-2" disabled={loading() || !file()} onClick={embedPdf}>
          Embed PDF
        </Button>
      </form>
    </Show>
  )
}
