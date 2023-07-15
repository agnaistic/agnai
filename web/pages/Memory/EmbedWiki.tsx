import { Component, createSignal } from 'solid-js'
import { getStrictForm } from '/web/shared/util'
import { pipelineApi } from '/web/store/data/pipeline'
import { toastStore } from '/web/store/toasts'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import { memoryStore } from '/web/store'

export { EmbedWiki as default }

const EmbedWiki: Component = (props) => {
  let ref: any

  const [loading, setLoading] = createSignal(false)

  const create = async () => {
    setLoading(true)
    const { wiki } = getStrictForm(ref, { wiki: 'string' })
    await pipelineApi.embedArticle(wiki)
    toastStore.success('Successfully created embedding')
    setLoading(false)
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
      <Button class="mt-2" disabled={loading()} onClick={create}>
        Create
      </Button>
    </form>
  )
}
