import { Save, X } from 'lucide-solid'
import { Component, createSignal } from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm } from '../../shared/util'
import { guestStore } from '../../store'

const GuestProfile: Component = () => {
  const state = guestStore()
  const [avatar, setAvatar] = createSignal<File | undefined>()
  const onAvatar = (files: FileInputResult[]) => {
    const [file] = files
    if (!file) return setAvatar()
    setAvatar(() => file.file)
  }

  const submit = (ev: Event) => {
    const body = getStrictForm(ev, { handle: 'string' })
    const payload = { handle: body.handle, avatar: avatar() }
    guestStore.saveProfile(body.handle, avatar())
  }

  return (
    <>
      <PageHeader title="Your Profile" />
      <form onSubmit={submit}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="text-xl">How you appear</div>
            <div class="flex flex-row gap-2">
              <AvatarIcon class="h-12 w-12" avatarUrl={state.profile?.avatar} />
              <div class="flex items-center">{state.profile?.handle}</div>
            </div>
          </div>

          <TextInput
            label="Display Name"
            helperText="This is your publicly visible name."
            fieldName="handle"
            value={state.profile?.handle}
          />

          <FileInput
            label="Profile Image"
            fieldName="avatar"
            accept="image/jpeg,image/png"
            helperText={'File size limit of 2MB'}
            onUpdate={onAvatar}
          />

          <div class="mt-4 flex w-full justify-end">
            <Button type="submit">
              <Save />
              Update Profile
            </Button>
          </div>
        </div>
      </form>
    </>
  )
}

export default GuestProfile
