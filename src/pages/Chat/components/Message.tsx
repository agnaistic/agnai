import { ThumbsDown, ThumbsUp } from "lucide-solid";
import showdown from "showdown";
import { Component, Show } from "solid-js";

import MessageProps from "../../../models/Message";

import "./Message.css";

const showdownConverter = new showdown.Converter();

/** An individual message. */
const Message: Component<MessageProps> = (props) => (
  <span class="flex gap-4">
    <img
      src={props.speaker.avatarUrl}
      class="mt-1 h-12 w-12 rounded-full bg-white"
    />

    <div class="flex select-text flex-col">
      <span>
        <b class="mr-2 text-white">{props.speaker.name}</b>
        <span class="text-sm text-white/25">
          {new Intl.DateTimeFormat("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(props.timestamp)}
        </span>
      </span>
      <div class="message-text">
        <div
          // TODO(11b): Figure out whether Showdown emits only safe HTML.
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={showdownConverter.makeHtml(props.utterance)}
        />
      </div>
      <Show when={!props.speaker.isHuman}>
        <div class="mt-3 flex gap-2 text-sm text-white/25">
          <ThumbsUp size={16} class="mt-[-0.15rem]" />
          <ThumbsDown size={16} />
        </div>
      </Show>
    </div>
  </span>
);

export default Message;
