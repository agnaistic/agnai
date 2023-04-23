import { Save, X } from 'lucide-solid'
import { Component, createEffect, createSignal } from 'solid-js'
import AvatarIcon from '../../shared/AvatarIcon'
import Button from '../../shared/Button'
import FileInput, { FileInputResult } from '../../shared/FileInput'
import Modal from '../../shared/Modal'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { getStrictForm, setComponentPageTitle } from '../../shared/util'
import { toastStore, userStore } from '../../store'

const ProfilePage: Component = () => {
  setComponentPageTitle('My profile')
  const state = userStore()
  const [pass, setPass] = createSignal(false)
  const [avatar, setAvatar] = createSignal<File | undefined>()

  const onAvatar = (files: FileInputResult[]) => {
    const [file] = files
    if (!file) return setAvatar()
    setAvatar(() => file.file)
  }

  const submit = (ev: Event) => {
    const body = getStrictForm(ev, { handle: 'string' })
    const payload = { handle: body.handle, avatar: avatar() }
    userStore.updateProfile(payload)
  }

  createEffect(() => {
    userStore.getProfile()
    userStore.getConfig()
  })

  return (
    <>
      <PageHeader title="Your Profile" />
      <form onSubmit={submit}>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <div class="text-xl">How you appear</div>
            <div class="flex flex-row gap-2">
              <AvatarIcon avatarUrl={state.profile?.avatar} />
              <div class="flex items-center">{state.profile?.handle}</div>
            </div>
          </div>

          <TextInput
            label="ID"
            helperText="Your user ID. This is used by others to send you chat invitations."
            fieldName="userid"
            value={state.user?._id}
            disabled
          />

          <TextInput
            label="Username"
            helperText="Your username. This cannot be changed. You never need to share your username."
            fieldName="username"
            value={state.user?.username}
            disabled
          />

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

          <div>
            <Button onClick={() => setPass(true)}>Change Password</Button>
          </div>

          <div class="mt-4 flex w-full justify-end">
            <Button type="submit">
              <Save />
              Update Profile
            </Button>
          </div>
        </div>
      </form>
      <PasswordModal show={pass()} close={() => setPass(false)} />
    </>
  )
}

export default ProfilePage

const PasswordModal: Component<{ show: boolean; close: () => void }> = (props) => {
  let ref: any
  const save = () => {
    const body = getStrictForm(ref, { newPassword: 'string', confirmPassword: 'string' })
    if (body.newPassword !== body.confirmPassword) {
      toastStore.warn(`Your passwords do not match`)
      return
    }

    userStore.changePassword(body.newPassword, props.close)
  }

  return (
    <Modal
      show={props.show}
      close={props.close}
      title="Change Password"
      footer={
        <>
          {' '}
          <Button schema="secondary" onClick={props.close}>
            <X /> Cancel
          </Button>
          <Button onClick={save}>
            <Save /> Update
          </Button>
        </>
      }
    >
      <div>
        <form ref={ref} class="flex flex-col gap-2">
          <div class="w-full justify-center">Update your password</div>
          <TextInput type="password" fieldName="newPassword" required />
          <TextInput type="password" fieldName="confirmPassword" required />
        </form>
      </div>
    </Modal>
  )
}
