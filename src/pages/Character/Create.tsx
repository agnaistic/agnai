import { Save } from 'lucide-solid'
import Button from '../../shared/Button'
import PageHeader from '../../shared/PageHeader'
import TextInput from '../../shared/TextInput'
import { Component } from 'solid-js'

const CreateCharacter: Component = () => {
  return (
    <div>
      <PageHeader title="Create a Character" />

      <form class="flex flex-col gap-4">
        <TextInput
          fieldName="name"
          required
          label="Character Name"
          helperText="The name of your character."
          placeholder=""
        />

        <TextInput
          fieldName="greeting"
          required
          label="Greeting"
          helperText="The first message from your character. It is recommended to provide a lengthy first message to encourage the character to give longer responses."
        />

        <div class="flex justify-end">
          <Button>
            <Save />
            Create
          </Button>
        </div>
      </form>
    </div>
  )
}

export default CreateCharacter
