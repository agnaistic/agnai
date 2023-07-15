import { Component, createSignal } from 'solid-js'
import { getStrictForm } from '/web/shared/util'
import { pipelineApi } from '/web/store/data/pipeline'
import { toastStore } from '/web/store/toasts'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { memoryStore } from '/web/store'
import FileInput from '/web/shared/FileInput'
import Divider from '/web/shared/Divider'
import { slugify } from '/common/util'

export { EmbedWiki as default }

const EmbedWiki: Component = (props) => {
  let ref: any

  const [loading, setLoading] = createSignal(false)
  const [file, setFile] = createSignal<File>()

  const embedWiki = async () => {
    setLoading(true)
    const { wiki } = getStrictForm(ref, { wiki: 'string' })
    await pipelineApi.embedArticle(wiki)
    toastStore.success('Successfully created embedding')
    setLoading(false)
    memoryStore.listCollections()
  }

  const embedPdf = async () => {
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
  }

  return (
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
      />

      <FileInput
        fieldName="pdf"
        label="Embed PDF"
        onUpdate={(files) => {
          console.log(files)
          setFile(() => files[0]?.file)
        }}
        helperText="This may take a long time depending on the size of the PDF."
        accept="application/pdf"
      />
      <Button class="mt-2" disabled={loading() || !file()} onClick={embedPdf}>
        Embed PDF
      </Button>
    </form>
  )
}
