import { Component, Show, createMemo } from "solid-js";

const TextInput: Component<{
  label: string;
  fieldName: string;
  helperText?: string;
  placeholder?: string;
  isMultiline?: boolean;
}> = (props) => {
  const placeholder = createMemo(
    () => props.placeholder || "Type something here..."
  );

  return (
    <div>
      <label for={props.fieldName}>
        {props.label}
        <Show when={!!props.helperText}>
          <p class="mt-[-0.125rem] pb-2 text-sm text-white/50">
            {props.helperText}
          </p>
        </Show>
      </label>
      <Show
        when={props.isMultiline}
        fallback={
          <input
            id={props.fieldName}
            name={props.fieldName}
            type="text"
            placeholder={placeholder()}
            class="focusable-field w-full rounded-xl px-4 py-2"
          />
        }
      >
        <textarea
          // TODO(11b): It'd be nice if this auto-resized based on its contents.
          // https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize?noredirect=1
          id={props.label}
          name={props.fieldName}
          placeholder={placeholder()}
          class="focusable-field w-full rounded-xl px-4 py-2 !text-white"
        />
      </Show>
    </div>
  );
};

export default TextInput;
