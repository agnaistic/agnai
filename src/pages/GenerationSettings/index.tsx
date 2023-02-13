import { Component } from "solid-js";
import { Save, X } from "lucide-solid";

import Button from "../../shared/Button";
import RangeInput from "../../shared/RangeInput";

const GenerationSettings: Component = () => (
  <>
    <h1 class="text-4xl">Generation Settings Settings</h1>
    <p class="text-white/50">Some settings might not show up depending on which inference backend is being used.</p>
    <div class="my-4 border-b border-white/5" />

    <div class="flex flex-col gap-8">
        <RangeInput 
            label="Max New Tokens"
            helperText="Number of tokens the AI should generate. Higher numbers will take longer to generate."
            min={16}
            max={512}
            step={4}
            value={196}
        />
        <RangeInput 
            label="Temperature"
            helperText="Randomness of sampling. High values can increase creativity but may make text less sensible. Lower values will make text more predictable but can become repetitious."
            min={0.1}
            max={2}
            step={0.01}
            value={0.5}
        />
        <RangeInput 
            label="Top P"
            helperText="Used to discard unlikely text in the sampling process. Lower values will make text more predictable but can become repetitious. (Put this value on 1 to disable its effect)"
            min={0}
            max={1}
            step={0.01}
            value={0.9}
        />
        <RangeInput 
            label="Top K"
            helperText="Alternative sampling method, can be combined with top_p. The number of highest probability vocabulary tokens to keep for top-k-filtering. (Put this value on 0 to disable its effect)"
            min={0}
            max={100}
            step={1}
            value={0}
        />
        <RangeInput 
            label="Typical P"
            helperText="Alternative sampling method described in the paper 'Typical_p Decoding for Natural Language Generation' (10.48550/ARXIV.2202.00666). The paper suggests 0.2 as a good value for this setting. Set this setting to 1 to disable its effect."
            min={0}
            max={1}
            step={0.01}
            value={1}
        />
        <RangeInput 
            label="Repetition Penalty"
            helperText="Used to penalize words that were already generated or belong to the context (Going over 1.2 breaks 6B models. Set to 1.0 to disable)."
            min={0}
            max={3}
            step={0.01}
            value={1.05}
        />
        <RangeInput 
            label="Penalty Alpha"
            helperText="The alpha coefficient when using contrastive search."
            min={0}
            max={1}
            step={0.05}
            value={0.6}
        />

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

export default GenerationSettings;