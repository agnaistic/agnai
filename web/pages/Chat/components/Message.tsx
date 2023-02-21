import { ThumbsDown, ThumbsUp } from 'lucide-solid'
import showdown from 'showdown'
import { Component, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'

const showdownConverter = new showdown.Converter()

const Message: Component<{ msg: AppSchema.ChatMessage; char?: AppSchema.Character }> = (props) => (
  <span class="flex gap-4">
    <Show when={props.char && !!props.msg.characterId}>
      <img src={props.char?.avatar} class="mt-1 h-12 w-12 rounded-full" />
    </Show>
    <Show when={!props.msg.characterId}>
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500">YOU</div>
    </Show>

    <div class="flex select-text flex-col">
      <span>
        <b class="mr-2 text-white">{props.msg.characterId ? props.char?.name : 'You'}</b>
        <span class="text-sm text-white/25">
          {new Intl.DateTimeFormat('en-US', {
            dateStyle: 'short',
            timeStyle: 'short',
          }).format(new Date(props.msg.createdAt))}
        </span>
      </span>
      <div class="opacity-50">
        <div
          // TODO(11b): Figure out whether Showdown emits only safe HTML.
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={showdownConverter.makeHtml(props.msg.msg)}
        />
      </div>
      {/* <Show when={msg.characterId}>
        <div class="mt-3 flex gap-2 text-sm text-white/25">
          <ThumbsUp size={16} class="mt-[-0.15rem]" />
          <ThumbsDown size={16} />
        </div>
      </Show> */}
    </div>
  </span>
)

export default Message
