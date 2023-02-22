import { RefreshCw, ThumbsDown, ThumbsUp } from 'lucide-solid'
import showdown from 'showdown'
import { Component, Show } from 'solid-js'
import { AppSchema } from '../../../../srv/db/schema'
import { chatStore } from '../../../store'

const showdownConverter = new showdown.Converter()

const Message: Component<{
  msg: AppSchema.ChatMessage
  char?: AppSchema.Character
  last?: boolean
}> = (props) => (
  <div class="flex w-full gap-4 rounded-l-md p-1 hover:bg-slate-800">
    <Show when={props.char && !!props.msg.characterId}>
      <img src={props.char?.avatar} class="mt-1 h-12 w-12 rounded-md" />
    </Show>
    <Show when={!props.msg.characterId}>
      <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-500">YOU</div>
    </Show>

    <div class="flex w-full select-text flex-col">
      <div class="flex w-full flex-row justify-between">
        <div class="flex flex-row">
          <b class="mr-2 text-white">{props.msg.characterId ? props.char?.name : 'You'}</b>
          <span class="text-sm text-white/25">
            {new Intl.DateTimeFormat('en-US', {
              dateStyle: 'short',
              timeStyle: 'short',
            }).format(new Date(props.msg.createdAt))}
          </span>
          <Show when={props.msg.characterId}>
            <div class="ml-2 flex flex-row items-center gap-2 text-white/25">
              <ThumbsUp size={14} class="mt-[-0.15rem] cursor-pointer" />
              <ThumbsDown size={14} class="cursor-pointer" />
            </div>
          </Show>
        </div>
        <div class="mr-4 flex items-center gap-2 text-sm text-white/25">
          <Show when={props.last && props.msg.characterId}>
            <RefreshCw size={16} class="cursor-pointer" onClick={() => chatStore.retry()} />
          </Show>
        </div>
      </div>
      <div class="w-full opacity-50">
        <div
          // TODO(11b): Figure out whether Showdown emits only safe HTML.
          // eslint-disable-next-line solid/no-innerhtml
          innerHTML={showdownConverter.makeHtml(props.msg.msg)}
        />
      </div>
    </div>
  </div>
)

export default Message
