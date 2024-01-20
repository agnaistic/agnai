import { Component, Match, Switch, createSignal } from 'solid-js'
import { getStrictForm } from '/web/shared/util'
import { toastStore } from '/web/store/toasts'
import TextInput from '/web/shared/TextInput'
import Button from '/web/shared/Button'
import FileInput, { FileInputResult } from '/web/shared/FileInput'
import Divider from '/web/shared/Divider'
import { slugify } from '/common/util'
import { embedApi } from '/web/store/embeddings'
import Select from '/web/shared/Select'
import { useTransContext } from '@mbarzda/solid-i18next'

export { EmbedContent as default }

const EmbedContent: Component = (props) => {
  const [t] = useTransContext()

  let ref: any

  const options = [t('article'), t('pdf'), t('text_file'), t('plain_text')]
  const [type, setType] = createSignal(options[0])

  const [loading, setLoading] = createSignal(false)
  const [filename, setFilename] = createSignal('')
  const [file, setFile] = createSignal<File>()

  const embedWiki = async () => {
    setLoading(true)
    try {
      const { wiki } = getStrictForm(ref, { wiki: 'string' })
      await embedApi.embedArticle(wiki)
      toastStore.success(t('successfully_created_embedding'))
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
      const docNeeded = embedType === t('pdf') || embedType === t('text_file')
      const doc = file()
      if (!doc && docNeeded) {
        toastStore.error(t('no_pdf_loaded'))
        return
      }

      const slug = slugify(embedName)
      switch (embedType) {
        case t('pdf'):
          await embedApi.embedPdf(slug, doc!)
          break

        case t('text_file'):
          await embedApi.embedFile(slug, doc!)
          break

        case t('plain-text'): {
          const { embedText } = getStrictForm(ref, { embedText: 'string' })
          if (!embedText) {
            toastStore.warn(t('embedding_content_is_empty'))
            return
          }
          await embedApi.embedPlainText(slug, embedText)
          break
        }
      }
      toastStore.success(t('successfully_created_embedding_x', { slug: slug }))
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
      <Select
        items={options.map((value) => ({ label: t('embed_x', { value: value }), value }))}
        fieldName="embed-type"
        value={type()}
        onChange={(ev) => setType(ev.value)}
      />

      <Switch>
        <Match when={type() === t('article')}>
          <TextInput
            fieldName="wiki"
            label={t('embed_wikipedia_article')}
            helperText={t('create_an_embedding_using_the_content_from_wikipedia')}
            placeholder={t('wikipedia_url_example')}
          />
          <Button class="mt-2 w-fit" disabled={loading()} onClick={embedWiki}>
            {t('embed_article')}
          </Button>
        </Match>

        <Match when={type() === t('pdf')}>
          <TextInput
            fieldName="embedName"
            label={t('name')}
            helperText={t('embedding_name_message')}
            value={filename()}
          />

          <FileInput
            fieldName="pdf"
            label={t('embed_pdf')}
            onUpdate={onFile}
            helperText={t('this_may_take_a_long_time_depending_on_the_size_of_the_pdf')}
            accept="application/pdf"
          />
          <Button class="mt-2 w-fit" disabled={loading() || !file()} onClick={embedFile}>
            {t('embed_pdf')}
          </Button>
        </Match>

        <Match when={type() === t('text_file')}>
          <TextInput
            fieldName="embedName"
            label={t('name')}
            helperText={t('embedding_name_message')}
            value={filename()}
          />

          <FileInput
            fieldName="pdf"
            label={t('embed_file')}
            onUpdate={onFile}
            helperText={t('this_may_take_a_long_time_depending_on_the_size_of_the_file')}
            accept="text/plain"
          />
          <Button class="mt-2 w-fit" disabled={loading() || !file()} onClick={embedFile}>
            {t('embed_file')}
          </Button>
        </Match>

        <Match when={type() === t('plain_text')}>
          <TextInput
            fieldName="embedName"
            label={t('name')}
            helperText={t('embedding_name_message')}
            value={filename()}
          />

          <TextInput
            fieldName="embedText"
            label={t('content')}
            helperText={t('the_content_to_be_embedded')}
            isMultiline
          />

          <Button class="mt-2 w-fit" onClick={embedFile}>
            {t('embed_content')}
          </Button>
        </Match>
      </Switch>

      <Divider />
    </form>
  )
}
