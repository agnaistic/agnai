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
              // TODO(11b): The radio doesn't render properly on Safari for some
              // reason. Possibly come back here and investigate at some point.
              class="form-check-input float-left mt-1 mr-2 h-4 w-4 cursor-pointer appearance-none rounded-full border border-gray-300 bg-white bg-contain bg-center bg-no-repeat align-top transition duration-200 checked:border-purple-600 checked:bg-purple-600 focus:outline-none"
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
