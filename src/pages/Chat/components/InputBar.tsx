import { Sliders, Send } from "lucide-solid";
import { Component, JSX } from "solid-js";

/** Meant to be used exclusively within the InputBar. */
const IconButton: Component<{ children: JSX.Element }> = (props) => (
  <button
    type="button"
    class="visibly-focusable-with-bg py-3 px-1 border-2 border-transparent"
  >
    {props.children}
  </button>
);

/** Bar containing the message text input and some attached buttons. */
const InputBar = () => (
  <div class="flex justify-center max-sm:pb-4 pb-8">
    <input
      type="text"
      placeholder="Send a message..."
      class="placeholder:text-white/25 !text-white w-full px-4 py-2 rounded-l-xl visibly-focusable-with-bg"
    />
    <IconButton>
      <Sliders size={20} />
    </IconButton>
    <IconButton>
      <Send size={20} />
    </IconButton>
    <div class="rounded-r-xl pr-2 bg-white/5" />
  </div>
);

export default InputBar;
