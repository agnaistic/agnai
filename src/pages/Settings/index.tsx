import { Component } from 'solid-js'
// import { Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'

const Settings: Component = () => {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configuration" />
      <div class="flex flex-col gap-8">
        <TextInput
          fieldName="koboldUrl"
          label="Kobold URL"
          helperText="Fully qualified URL for Kobold"
          placeholder="http://localhost:5000"
        />
      </div>

      <div class="flex justify-end gap-2">
        <Button>
          {/* <Save /> */}
          Save
        </Button>
      </div>
    </>
  )
}

export default Settings
