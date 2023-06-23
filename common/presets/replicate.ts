import { AppSchema } from '../types/schema'

export const replicatePresets = {
  replicate_vicuna_13b: {
    name: 'Replicate (Vicuna 13B)',
    replicateModelType: 'llama',
    replicateModelVersion: '6282abe6a492de4145d7bb601023762212f9ddbbe78278bd6771c8b3b2f2a13b',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1,
    service: 'replicate',
    maxTokens: 500,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `{{char}}' Persona: {{personality}}
Scenario: {{scenario}}
Facts: {{memory}}
<START>
[DIALOGUE HISTORY]
{{example_dialogue}}`,
  },
  replicate_stablelm_7b: {
    name: 'Replicate (StableLM Tuned Alpha 7B)',
    replicateModelType: 'stablelm',
    replicateModelVersion: 'c49dae362cbaecd2ceabb5bd34fdb68413c4ff775111fea065d259d577757beb',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1.2,
    service: 'replicate',
    maxTokens: 100,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Write 1 reply only in internet RP style, italicize actions, and avoid quotation marks. Use markdown. Be proactive, creative, and drive the plot and conversation forward. Write at least 1 paragraph, up to 4. Always stay in character and avoid repetition.
Description of {{char}}:
{{personality}}
Circumstances and context of the dialogue: {{scenario}}
Facts: {{memory}}
This is how {{char}} should talk: {{example_dialogue}}`,
  },
  replicate_open_assistant_pythia_12b: {
    name: 'Replicate (Open-Assistant Pythia 12B)',
    replicateModelType: 'openassistant',
    replicateModelVersion: '28d1875590308642710f46489b97632c0df55adb5078d43064e1dc0bf68117c3',
    temp: 0.75,
    topP: 1,
    repetitionPenalty: 1.2,
    service: 'replicate',
    maxTokens: 500,
    maxContextLength: 2048,
    useGaslight: true,
    gaslight: `{{char}}' Persona: {{personality}}
Scenario: {{scenario}}
Facts: {{memory}}
This is how the character should talk:
{{example_dialogue}}`,
  },
} satisfies Record<string, Partial<AppSchema.GenSettings>>
