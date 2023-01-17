import { Component, For, JSX } from "solid-js";

export interface RadioOption {
  name: string;
  id: string;
  label: JSX.Element;
  isChecked?: boolean;
}

const RadioGroup: Component<{ options: RadioOption[] }> = (props) => (
  <div class="flex">
    <div>
      <For each={props.options}>
        {(option) => (
          <div class="form-check">
            <input
              class="form-check-input appearance-none rounded-full h-4 w-4 border border-gray-300 bg-white checked:bg-purple-600 checked:border-purple-600 focus:outline-none transition duration-200 mt-1 align-top bg-no-repeat bg-center bg-contain float-left mr-2 cursor-pointer"
              type="radio"
              name={option.name}
              id={option.id}
              checked={option.isChecked}
            />
            <label
              class="form-check-label inline-block cursor-pointer"
              for={option.id}
            >
              {option.label}
            </label>
          </div>
        )}
      </For>
    </div>
  </div>
);

export default RadioGroup;
