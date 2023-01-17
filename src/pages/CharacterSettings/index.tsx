import { Component } from "solid-js";
import { Save, X } from "lucide-solid";

import Button from "../../shared/Button";
import TextInput from "../../shared/TextInput";
import RadioGroup, { RadioOption } from "../../shared/RadioGroup";

const visibilityOptions: RadioOption[] = [
  {
    id: "public",
    name: "visibility-radio",
    label: (
      <>
        Public <span class="text-white/50"> - Everyone</span>
      </>
    ),
    isChecked: true,
  },
  {
    id: "unlisted",
    name: "visibility-radio",
    label: (
      <>
        Unlisted <span class="text-white/50"> - Only people with a link</span>
      </>
    ),
  },
  {
    id: "private",
    name: "visibility-radio",
    label: (
      <>
        Private <span class="text-white/50"> - Only you</span>
      </>
    ),
  },
];

const CharacterSettings: Component = () => (
  <>
    <h1 class="text-4xl">Character Settings</h1>
    <p class="text-white/50">Configure BOT's character.</p>
    <div class="my-4 border-b border-white/5" />

    <div class="flex flex-col gap-8">
      <TextInput
        fieldName="name"
        label="Name"
        helperText="What is this character's name?"
      />
      <TextInput
        fieldName="description"
        label="Description"
        helperText="To be shown in the character list. One or two sentences."
      />
      <TextInput
        fieldName="greeting"
        label="Greeting"
        helperText="The character will say this verbatim as their first message."
      />
      <TextInput
        fieldName="persona"
        label="Persona"
        helperText="A few sentences about what this character is like."
        isMultiline
      />
      <TextInput
        fieldName="example_conversations"
        label="Example Conversations"
        helperText="Some example dialogue to show how the character should speak and behave."
        isMultiline
      />

      <div>
        <label for="Visibility">
          Visibility
          <p class="mt-[-0.125rem] pb-2 text-sm text-white/50">
            Configure who can see and talk to this character.
          </p>
        </label>
        <RadioGroup options={visibilityOptions} />
      </div>

      <div class="flex justify-end gap-2">
        <Button schema="secondary">
          <X />
          Cancel
        </Button>

        <Button>
          <Save />
          Save
        </Button>
      </div>
    </div>
  </>
);

export default CharacterSettings;
