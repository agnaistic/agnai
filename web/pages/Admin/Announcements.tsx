import { Component, createSignal } from 'solid-js'
import PageHeader from '/web/shared/PageHeader'
import { Plus } from 'lucide-solid'
import Button from '/web/shared/Button'
import TextInput from '/web/shared/TextInput'
import { useParams } from '@solidjs/router'
import { settingStore } from '/web/store'

export const AnnoucementList: Component = (props) => {
  return (
    <>
      <PageHeader title="Manage Announcements" />
      <div class="flex w-full justify-end">
        <Button>
          Create <Plus />
        </Button>
      </div>
    </>
  )
}

export const Announcement: Component<{}> = (props) => {
  let ref: HTMLFormElement

  const params = useParams()

  const [id, setId] = createSignal(params.id || '')
  const state = settingStore((s) => ({ item: s.announcements.find((a) => a._id === id()) }))

  return (
    <>
      <PageHeader title="Announcement" />

      <form ref={ref!} class="flex flex-col gap-2">
        <TextInput fieldName="id" disabled value={id()} label="ID" />

        <TextInput fieldName="title" value={state.item?.title} />
        <TextInput fieldName="title" value={state.item?.content} isMultiline />
      </form>
    </>
  )
}
