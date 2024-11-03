import { Component, createEffect, createSignal } from 'solid-js'
import { RequestDocEmbed } from '/web/store/embeddings/types'
import { embedApi } from '/web/store/embeddings'
import { toastStore } from '/web/store'
import Button from '/web/shared/Button'
import { Edit, X } from 'lucide-solid'
import Modal from '/web/shared/Modal'
import TextInput from '/web/shared/TextInput'

export const EditEmbedModal: Component<{ show: boolean; embedId?: string; close: () => void }> = (
  props
) => {
  let form: HTMLFormElement | undefined

  const [loading, setLoading] = createSignal(false)
  const [text, setText] = createSignal('')

  createEffect(async () => {
    if (!props.show || !props.embedId) return

    setLoading(true)
    let doc: RequestDocEmbed | undefined
    try {
      doc = await embedApi.cache.getDoc(props.embedId)
    } finally {
      setLoading(false)
    }

    if (doc) {
      // get the content of the document by combining all the lines
      const lines = doc.documents.map((d) => d.msg).join('\n')
      setText(lines)
    } else {
      toastStore.error(`Failed to load embedding ${props.embedId}`)
      props.close()
    }
  })

  const cancel = () => {
    setText('')
    props.close()
  }

  const updateEmbed = async () => {
    if (!form || !props.embedId) return

    setLoading(true)
    try {
      const embedText = text()
      if (!embedText) {
        toastStore.warn(`Embedding content cannot be empty`)
        return
      }

      await embedApi.embedPlainText(props.embedId, embedText)
      toastStore.success('Successfully updated embedding')
      cancel()
    } finally {
      setLoading(false)
    }
  }

  const Footer = (
    <>
      <Button onClick={cancel}>
        <X /> Cancel
      </Button>
      <Button onClick={updateEmbed}>
        <Edit /> Update
      </Button>
    </>
  )

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Edit Embedding"
      footer={Footer}
      maxWidth="half"
    >
      <form ref={form}>
        <TextInput
          label="Content"
          helperText="The content to be embedded. Use line breaks to seperate lines."
          isMultiline
          value={text()}
          onChange={(ev) => setText(ev.currentTarget.value)}
          required
          disabled={loading()}
        />
      </form>
    </Modal>
  )
}
