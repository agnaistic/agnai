import { Component, Show, createMemo } from "solid-js";

const TextInput: Component<{
  fieldName: string;
  label?: string;
  helperText?: string;
  placeholder?: string;
  isMultiline?: boolean;
  type?: string;
  required?: boolean;
}> = (props) => {
  const placeholder = createMemo(() =>
    props.placeholder !== undefined
      ? props.placeholder
      : "Type something here..."
  );

  return (
    <div>
      <Show when={!!props.label}>
        <label for={props.fieldName}>
          <div class={props.helperText ? "" : "pb-1"}>{props.label}</div>
          <Show when={!!props.helperText}>
            <p class="mt-[-0.125rem] pb-1 text-sm text-white/50">
              {props.helperText}
            </p>
          </Show>
        </label>
      </Show>
      <Show
        when={props.isMultiline}
        fallback={
          <input
            id={props.fieldName}
            name={props.fieldName}
            type={props.type || "text"}
            required={props.required}
            placeholder={placeholder()}
            class="focusable-field w-full rounded-xl px-4 py-2"
          />
        }
      >
        <textarea
          // TODO(11b): It'd be nice if this auto-resized based on its contents.
          // https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize?noredirect=1
          id={props.fieldName}
          name={props.fieldName}
          required={props.required}
          placeholder={placeholder()}
          class="focusable-field w-full rounded-xl px-4 py-2 !text-white"
          onInput={(e) => {
            const ele = e.target as HTMLTextAreaElement;
            ele.style.height = "";
            ele.style.height = `${ele.scrollHeight}px`;
          }}
        />
      </Show>
    </div>
  );
};

export default TextInput;
