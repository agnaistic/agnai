import { Smile } from 'lucide-solid'
import { Component, For, Show, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { isMobile, useLocalStorage } from '/web/shared/hooks'

/** Maximum number of recently used emojis to keep in local storage */
const MAX_RECENT = 16
const RECENT_KEY = 'recent-emojis'

/** An emoji paired with a searchable name (used for the filter box) */
export type EmojiEntry = [emoji: string, name: string]

export const EmojiPicker: Component<{
  /** Called when the user selects an emoji from the picker */
  onSelect: (emoji: string) => void
  class?: string
}> = (props) => {
  let container!: HTMLDivElement

  const mobile = isMobile()
  const [open, setOpen] = createSignal(false)
  const [search, setSearch] = createSignal('')

  const [stored, setStored] = useLocalStorage<string[]>(RECENT_KEY, [])

  const recent = createMemo(() => {
    const list = stored()
    if (!Array.isArray(list)) return [] as string[]
    return list.filter((emoji) => typeof emoji === 'string' && emoji.length).slice(0, MAX_RECENT)
  })

  const remember = (emoji: string) => {
    const exists = recent().some((em) => emoji === em)
    if (exists) return

    const next = [emoji, ...recent().filter((e) => e !== emoji)].slice(0, MAX_RECENT)
    setStored(next)
  }

  const select = (emoji: string) => {
    remember(emoji)
    props.onSelect(emoji)

    if (mobile) {
      setOpen(false)
    }
  }

  const query = createMemo(() => search().trim().toLowerCase())

  const groups = createMemo(() => {
    const q = query()
    if (!q) return EMOJI_GROUPS

    return EMOJI_GROUPS.map((group) => ({
      label: group.label,
      emojis: group.emojis.filter(([emoji, name]) => emoji === q || name.includes(q)),
    })).filter((group) => group.emojis.length)
  })

  const onClickOutside = (ev: MouseEvent | TouchEvent) => {
    if (!open()) return
    if (container && ev.target instanceof Node && container.contains(ev.target)) return
    setOpen(false)
  }

  const onKeyDown = (ev: KeyboardEvent) => {
    if (!open()) return
    if (ev.key === 'Escape') setOpen(false)
  }

  onMount(() => {
    document.addEventListener('click', onClickOutside)
    document.addEventListener('touchend', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
  })

  onCleanup(() => {
    document.removeEventListener('click', onClickOutside)
    document.removeEventListener('touchend', onClickOutside)
    document.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div ref={container!} class={`relative flex h-[40px] items-center ${props.class || ''}`}>
      <button
        type="button"
        aria-label="Open emoji picker"
        class="icon-button flex h-full items-center px-2"
        onClick={(ev) => {
          ev.preventDefault()
          const next = !open()
          // Always start with a fresh search when the picker opens
          if (next) setSearch('')
          setOpen(next)
        }}
      >
        <Smile size={18} />
      </button>

      <Show when={open()}>
        <div class="bg-800 absolute bottom-full left-0 z-50 mb-1 w-[280px] rounded-md border-[1px] border-[var(--bg-600)] p-2 xs:w-[320px]">
          <input
            type="text"
            class="focusable-field mb-1 w-full rounded-md px-2 py-1 text-sm"
            placeholder="Search emojis..."
            spellcheck={false}
            value={search()}
            onInput={(ev) => setSearch(ev.currentTarget.value)}
          />

          <Show when={recent().length && !query()}>
            <div class="text-400 mb-0.5 px-1 text-xs">Recently used</div>
            <div class="mb-1 grid grid-cols-8 gap-0.5">
              <For each={recent()}>
                {(emoji) => (
                  <button
                    type="button"
                    class="cursor-pointer rounded-md p-1 text-lg leading-none hover:bg-[var(--bg-700)]"
                    onClick={() => select(emoji)}
                  >
                    {emoji}
                  </button>
                )}
              </For>
            </div>
          </Show>

          <div class="max-h-56 overflow-y-auto">
            <Show
              when={groups().length}
              fallback={<div class="text-400 p-2 text-sm">No emojis found</div>}
            >
              <For each={groups()}>
                {(group) => (
                  <>
                    <div class="text-400 mb-0.5 px-1 text-xs">{group.label}</div>
                    <div class="mb-1 grid grid-cols-8 gap-0.5">
                      <For each={group.emojis}>
                        {([emoji, name]) => (
                          <button
                            type="button"
                            title={name}
                            class="cursor-pointer rounded-md p-1 text-lg leading-none hover:bg-[var(--bg-700)]"
                            onClick={() => select(emoji)}
                          >
                            {emoji}
                          </button>
                        )}
                      </For>
                    </div>
                  </>
                )}
              </For>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  )
}

/**
 * Flat search across all emoji groups, used by the ":" quick emoji search.
 * Returns at most `max` matches.
 */
export function searchEmojis(query: string, max: number): EmojiEntry[] {
  const q = query.trim().toLowerCase()
  const all = EMOJI_GROUPS.flatMap((group) => group.emojis)
  if (!q) return all.slice(0, max)
  return all.filter(([emoji, name]) => name.includes(q) || emoji === q).slice(0, max)
}

export const EMOJI_GROUPS: { label: string; emojis: EmojiEntry[] }[] = [
  {
    label: 'Smileys',
    emojis: [
      // Smiling
      ['😀', 'grinning'],
      ['😃', 'smiley'],
      ['😄', 'smiling eyes'],
      ['😁', 'beaming'],
      ['😆', 'laughing'],
      ['😅', 'sweat smile'],
      ['😂', 'joy'],
      ['🤣', 'rofl'],
      ['☺️', 'smile'],
      ['😊', 'blush'],
      ['😇', 'innocent'],
      // Affection
      ['🥰', 'smiling hearts'],
      ['😍', 'heart eyes'],
      ['😘', 'kiss'],
      ['😗', 'kissing'],
      ['😙', 'kissing smiling eyes'],
      ['😚', 'kissing closed eyes'],
      // Tongue
      ['😋', 'yum'],
      ['😛', 'tongue'],
      ['😜', 'winking tongue'],
      ['🤪', 'zany'],
      ['😝', 'squint tongue'],
      ['🤑', 'money face'],
      // Hand
      ['🤗', 'hugging'],
      ['🤭', 'hand over mouth'],
      ['🤫', 'shush'],
      ['🤔', 'thinking'],
      ['🤐', 'zipper mouth'],
      ['🤨', 'raised eyebrow'],
      ['🤥', 'liar'],
      // Neutral / skeptical
      ['😐', 'neutral'],
      ['😑', 'expressionless'],
      ['😶', 'no mouth'],
      ['😏', 'smirk'],
      ['😒', 'unamused'],
      ['🙄', 'rolling eyes'],
      ['😬', 'grimace'],
      ['😌', 'relieved'],
      ['🙂', 'slight smile'],
      ['🙃', 'upside down'],
      ['🫠', 'melting'],
      ['😉', 'wink'],
      ['😕', 'confused'],
      // Frowning / open mouth
      ['☹️', 'frowning'],
      ['🙁', 'slight frown'],
      ['😮', 'open mouth'],
      ['😯', 'hushed'],
      // Sleepy
      ['😴', 'sleeping'],
      ['😪', 'sleepy'],
      ['🤤', 'drooling'],
      ['🥱', 'yawning'],
      ['😔', 'pensive'],
      ['😟', 'worried'],
      // Glasses, costumes, party
      ['🤓', 'nerd'],
      ['🧐', 'monocle'],
      ['😎', 'sunglasses'],
      ['🥸', 'disguised'],
      ['🤩', 'star struck'],
      ['🥳', 'party'],
      ['🥲', 'smiling tear'],
      ['🫡', 'salute'],
      ['🫣', 'peeking'],
      ['🤠', 'cowboy'],
      // Unwell
      ['🥵', 'hot'],
      ['🥶', 'cold'],
      ['🥴', 'woozy'],
      ['😵', 'knocked out'],
      ['🤯', 'exploding head'],
      ['🤒', 'sick'],
      ['🤕', 'injured'],
      ['🤢', 'nauseated'],
      ['🤮', 'vomiting'],
      ['🤧', 'sneezing'],
      ['😷', 'mask'],
      ['😳', 'flushed'],
      ['🥺', 'pleading'],
      // Concerned / negative
      ['😦', 'frowning open mouth'],
      ['😧', 'anguished'],
      ['😨', 'fearful'],
      ['😰', 'anxious'],
      ['😱', 'scream'],
      ['😥', 'disappointed relieved'],
      ['😓', 'downcast sweat'],
      ['😖', 'confounded'],
      ['😞', 'disappointed'],
      ['😣', 'persevering'],
      ['😢', 'cry'],
      ['😭', 'sob'],
      ['😩', 'weary'],
      ['😫', 'tired'],
      // Negative
      ['😤', 'smug'],
      ['😠', 'angry face'],
      ['😡', 'angry'],
      ['🤬', 'cursing'],
      ['😈', 'devil'],
      ['👿', 'imp'],
      ['💀', 'skull'],
      ['💩', 'poo'],
      ['🤡', 'clown'],
      ['👻', 'ghost'],
      ['🤖', 'robot'],
    ],
  },
  {
    label: 'People',
    emojis: [
      ['👋', 'wave'],
      ['🤚', 'raised hand back'],
      ['✋', 'raised hand'],
      ['🖐', 'hand fingers'],
      ['🖖', 'vulcan salute'],
      ['👌', 'ok'],
      ['🤌', 'pinched fingers'],
      ['✌', 'victory'],
      ['🤞', 'crossed fingers'],
      ['🤟', 'love you'],
      ['🤘', 'rock on'],
      ['🤙', 'call me'],
      ['👈', 'point left'],
      ['👉', 'point right'],
      ['👆', 'point up'],
      ['👇', 'point down'],
      ['👍', 'thumbs up'],
      ['👎', 'thumbs down'],
      ['✊', 'fist'],
      ['👊', 'punch'],
      ['🤛', 'left fist'],
      ['🤜', 'right fist'],
      ['👏', 'clap'],
      ['🙌', 'raised hands'],
      ['👐', 'open hands'],
      ['🙏', 'pray'],
      ['💪', 'muscle'],
      ['👀', 'eyes'],
      ['👁', 'eye'],
      ['👤', 'bust'],
      ['👥', 'busts'],
      ['🫂', 'people hugging'],
      ['💅', 'manicure'],
      ['👂', 'ear'],
      ['👃', 'nose'],
      ['👄', 'mouth'],
      ['💋', 'kiss mark'],
      ['🧠', 'brain'],
      ['🦴', 'bone'],
      ['🦷', 'tooth'],
    ],
  },
  {
    label: 'Hearts',
    emojis: [
      ['❤️', 'heart'],
      ['🧡', 'orange heart'],
      ['💛', 'yellow heart'],
      ['💚', 'green heart'],
      ['💙', 'blue heart'],
      ['💜', 'purple heart'],
      ['🖤', 'black heart'],
      ['🤍', 'white heart'],
      ['🤎', 'brown heart'],
      ['💔', 'broken heart'],
      ['❣️', 'heart exclamation'],
      ['💕', 'two hearts'],
      ['💞', 'revolving hearts'],
      ['💓', 'beating heart'],
      ['💗', 'growing heart'],
      ['💖', 'sparkling heart'],
      ['💘', 'cupid'],
      ['💝', 'heart ribbon'],
      ['💟', 'heart decoration'],
    ],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      ['🐶', 'dog'],
      ['🐱', 'cat'],
      ['🐭', 'mouse'],
      ['🐹', 'hamster'],
      ['🐰', 'rabbit'],
      ['🦊', 'fox'],
      ['🐻', 'bear'],
      ['🐼', 'panda'],
      ['🐨', 'koala'],
      ['🐯', 'tiger'],
      ['🦁', 'lion'],
      ['🐮', 'cow'],
      ['🐷', 'pig'],
      ['🐸', 'frog'],
      ['🙈', 'cover eyes'],
      ['🙉', 'cover ears'],
      ['🙊', 'cover mouth'],
      ['🐵', 'monkey'],
      ['🐔', 'chicken'],
      ['🐧', 'penguin'],
      ['🐦', 'bird'],
      ['🦆', 'duck'],
      ['🦉', 'owl'],
      ['🦇', 'bat'],
      ['🐺', 'wolf'],
      ['🐴', 'horse'],
      ['🦄', 'unicorn'],
      ['🐝', 'bee'],
      ['🦋', 'butterfly'],
      ['🐌', 'snail'],
      ['🐞', 'ladybug'],
      ['🐢', 'turtle'],
      ['🐍', 'snake'],
      ['🦎', 'lizard'],
      ['🐙', 'octopus'],
      ['🦑', 'squid'],
      ['🦀', 'crab'],
      ['🐠', 'tropical fish'],
      ['🐬', 'dolphin'],
      ['🐳', 'whale'],
      ['🦈', 'shark'],
      ['🐊', 'crocodile'],
      ['🦓', 'zebra'],
      ['🦍', 'gorilla'],
      ['🐘', 'elephant'],
      ['🐪', 'camel'],
      ['🦒', 'giraffe'],
      ['🐕', 'dog face'],
      ['🐈', 'cat face'],
      ['🐓', 'rooster'],
      ['🦜', 'parrot'],
      ['🦢', 'swan'],
      ['🕊️', 'dove'],
      ['🐾', 'paw prints'],
      ['🐉', 'dragon'],
      ['🌵', 'cactus'],
      ['🌲', 'tree'],
      ['🌴', 'palm tree'],
      ['🌱', 'seedling'],
      ['🌿', 'herb'],
      ['☘️', 'clover'],
      ['🍀', 'four leaf clover'],
      ['🍁', 'maple leaf'],
      ['🍂', 'fallen leaf'],
      ['🍃', 'leaves'],
      ['🌷', 'tulip'],
      ['🌹', 'rose'],
      ['🥀', 'wilted rose'],
      ['🌺', 'hibiscus'],
      ['🌸', 'cherry blossom'],
      ['🌼', 'blossom'],
      ['🌻', 'sunflower'],
      ['🌞', 'sun face'],
      ['🌙', 'moon'],
      ['⭐', 'star'],
      ['🌟', 'sparkle star'],
      ['✨', 'sparkles'],
      ['⚡', 'lightning'],
      ['🌈', 'rainbow'],
      ['☀️', 'sun'],
      ['🌧️', 'rain'],
      ['❄️', 'snowflake'],
      ['🔥', 'fire'],
      ['💧', 'droplet'],
      ['🌊', 'ocean'],
      ['💫', 'dizzy'],
      ['🌍', 'earth'],
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      ['🍏', 'green apple'],
      ['🍎', 'apple'],
      ['🍐', 'pear'],
      ['🍊', 'orange'],
      ['🍋', 'lemon'],
      ['🍌', 'banana'],
      ['🍉', 'watermelon'],
      ['🍇', 'grapes'],
      ['🍓', 'strawberry'],
      ['🫐', 'blueberries'],
      ['🍈', 'melon'],
      ['🍒', 'cherries'],
      ['🍑', 'peach'],
      ['🥭', 'mango'],
      ['🍍', 'pineapple'],
      ['🥥', 'coconut'],
      ['🥑', 'avocado'],
      ['🍆', 'eggplant'],
      ['🥔', 'potato'],
      ['🥕', 'carrot'],
      ['🌽', 'corn'],
      ['🌶️', 'pepper'],
      ['🥒', 'cucumber'],
      ['🧄', 'garlic'],
      ['🧅', 'onion'],
      ['🍄', 'mushroom'],
      ['🥜', 'peanuts'],
      ['🌰', 'chestnut'],
      ['🍞', 'bread'],
      ['🥐', 'croissant'],
      ['🥖', 'baguette'],
      ['🥨', 'pretzel'],
      ['🥞', 'pancakes'],
      ['🧇', 'waffle'],
      ['🧀', 'cheese'],
      ['🍖', 'meat'],
      ['🍗', 'chicken leg'],
      ['🌭', 'hotdog'],
      ['🍕', 'pizza'],
      ['🍔', 'burger'],
      ['🍟', 'fries'],
      ['🥪', 'sandwich'],
      ['🌮', 'taco'],
      ['🌯', 'burrito'],
      ['🥗', 'salad'],
      ['🍜', 'noodles'],
      ['🍝', 'spaghetti'],
      ['🍲', 'stew'],
      ['🍛', 'curry'],
      ['🍱', 'bento'],
      ['🍚', 'rice'],
      ['🍙', 'rice ball'],
      ['🍦', 'ice cream'],
      ['🍩', 'donut'],
      ['🍰', 'cake'],
      ['🧁', 'cupcake'],
      ['🥧', 'pie'],
      ['🎂', 'birthday cake'],
      ['🍫', 'chocolate'],
      ['🍬', 'candy'],
      ['🍭', 'lollipop'],
      ['🍮', 'custard'],
      ['🍯', 'honey'],
      ['🍿', 'popcorn'],
      ['🧂', 'salt'],
      ['🥛', 'milk'],
      ['☕', 'coffee'],
      ['🍵', 'tea'],
      ['🧋', 'bubble tea'],
      ['🍺', 'beer'],
      ['🍻', 'cheers'],
      ['🍷', 'wine'],
      ['🥂', 'cheers glasses'],
      ['🍸', 'cocktail'],
      ['🍹', 'tropical drink'],
      ['🥤', 'soda'],
    ],
  },
  {
    label: 'Activity & Travel',
    emojis: [
      ['⚽', 'soccer'],
      ['🏀', 'basketball'],
      ['🏈', 'football'],
      ['⚾', 'baseball'],
      ['🎾', 'tennis'],
      ['🏐', 'volleyball'],
      ['🏉', 'rugby'],
      ['🎱', '8ball'],
      ['🏓', 'ping pong'],
      ['🏸', 'badminton'],
      ['🥅', 'goal'],
      ['🏒', 'hockey'],
      ['🥊', 'boxing'],
      ['🥋', 'martial arts'],
      ['🎿', 'skiing'],
      ['🏹', 'archery'],
      ['🎣', 'fishing'],
      ['🏃', 'running'],
      ['🚶', 'walking'],
      ['🧘', 'yoga'],
      ['🏆', 'trophy'],
      ['🏅', 'medal'],
      ['🥇', 'gold medal'],
      ['🥈', 'silver medal'],
      ['🥉', 'bronze medal'],
      ['🎯', 'bullseye'],
      ['🎮', 'gaming'],
      ['🎲', 'dice'],
      ['🎰', 'slots'],
      ['🧩', 'puzzle'],
      ['♟️', 'chess'],
      ['🎭', 'theater'],
      ['🎨', 'art'],
      ['🎬', 'film'],
      ['🎤', 'microphone'],
      ['🎧', 'headphones'],
      ['🎼', 'music'],
      ['🎹', 'piano'],
      ['🥁', 'drum'],
      ['🎸', 'guitar'],
      ['🎺', 'trumpet'],
      ['🎻', 'violin'],
      ['🎫', 'ticket'],
      ['🏠', 'house'],
      ['🚗', 'car'],
      ['🚕', 'taxi'],
      ['🚌', 'bus'],
      ['🏎️', 'race car'],
      ['🏍️', 'motorcycle'],
      ['🚲', 'bicycle'],
      ['✈️', 'airplane'],
      ['🚀', 'rocket'],
      ['🛸', 'ufo'],
      ['⛵', 'sailboat'],
      ['🚢', 'ship'],
      ['🗺️', 'map'],
      ['🏔️', 'mountain'],
      ['🌋', 'volcano'],
      ['🏕️', 'camping'],
      ['🏖️', 'beach'],
      ['🎡', 'ferris wheel'],
      ['🎢', 'roller coaster'],
      ['🏰', 'castle'],
    ],
  },
  {
    label: 'Objects & Symbols',
    emojis: [
      ['⌚', 'watch'],
      ['📱', 'phone'],
      ['💻', 'computer'],
      ['🖥️', 'desktop'],
      ['⌨️', 'keyboard'],
      ['🖱️', 'mouse'],
      ['🖨️', 'printer'],
      ['📷', 'camera'],
      ['📸', 'camera flash'],
      ['📹', 'video camera'],
      ['🎥', 'movie camera'],
      ['📞', 'phone call'],
      ['💡', 'idea'],
      ['🔦', 'flashlight'],
      ['🕯️', 'candle'],
      ['💰', 'money'],
      ['💵', 'dollar'],
      ['💳', 'credit card'],
      ['💎', 'gem'],
      ['🧧', 'lucky envelope'],
      ['✉️', 'envelope'],
      ['📦', 'package'],
      ['📁', 'folder'],
      ['📅', 'calendar'],
      ['📌', 'pin'],
      ['📍', 'location'],
      ['📎', 'paperclip'],
      ['✂️', 'scissors'],
      ['🔒', 'locked'],
      ['🔓', 'unlocked'],
      ['🔑', 'key'],
      ['🔨', 'hammer'],
      ['🛠️', 'tools'],
      ['⚙️', 'gear'],
      ['⚔️', 'swords'],
      ['🛡️', 'shield'],
      ['🚑', 'ambulance'],
      ['🚒', 'fire truck'],
      ['🚚', 'truck'],
      ['🚄', 'train'],
      ['🛒', 'shopping'],
      ['🧳', 'luggage'],
      ['⏰', 'alarm'],
      ['⌛', 'hourglass'],
      ['✅', 'check'],
      ['❌', 'no'],
      ['⭕', 'circle'],
      ['❗', 'exclamation'],
      ['❓', 'question'],
      ['‼️', 'bangbang'],
      ['⁉️', 'question exclamation'],
      ['🔔', 'bell'],
      ['🔕', 'mute'],
      ['📢', 'announce'],
      ['📣', 'cheer'],
      ['💬', 'speech'],
      ['💭', 'thought'],
      ['🗯️', 'anger'],
      ['💤', 'zzz'],
      ['💦', 'splashing'],
      ['💨', 'running away'],
      ['♻️', 'recycle'],
      ['©️', 'copyright'],
      ['™️', 'trademark'],
    ],
  },
]
