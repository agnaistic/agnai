import { Component, Show } from "solid-js";
import { ThumbsUp, ThumbsDown } from "lucide-solid";
import showdown from "showdown";

import MessageProps from "../../../models/Message";

import "./Message.css";

const showdownConverter = new showdown.Converter();

/** An individual message. */
const Message: Component<MessageProps> = (props) => (
  <span class="flex gap-4">
    <img
      src={props.speaker.avatarUrl}
      class="h-12 w-12 mt-1 rounded-full bg-white"
    />

    <div class="flex flex-col select-text">
      <span>
        <b class="text-white">{props.speaker.name}</b>
        <span
          class="ml-2 text-sm text-white/25"
          // TODO(11b): Use datefns here to convert the Date object coming in
          // from the props into a proper time string.
        >
          8:07 PM
        </span>
      </span>
      <div
        class="message-text"
        // TODO(11b): Figure out whether Showdown emits only safe HTML.
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={showdownConverter.makeHtml(props.utterance)}
      />
      <Show when={!props.speaker.isHuman}>
        <div class="text-sm text-white/25 flex gap-2 mt-3">
          <ThumbsUp size={16} class="-mt-[0.15rem]" />
          <ThumbsDown size={16} />
        </div>
      </Show>
    </div>
  </span>
);

export default Message;
