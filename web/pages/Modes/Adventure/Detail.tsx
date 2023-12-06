import { Component, createEffect, createSignal, onMount } from 'solid-js'
import { ModeDetail } from '/web/shared/Mode/Detail'
import { AdventureInput } from './Input'
import { msgsApi } from '/web/store/data/messages'
import { neat } from '/common/util'

export const AdventureDetail: Component = (props) => {
  const [result, setResult] = createSignal({})
  const [pane, setPane] = createSignal(false)

  const send = async (text: string) => {
    const result = await msgsApi.guidance({
      prompt: prompt(text),
    })

    setResult(result)
    console.log(result)
  }

  return (
    <ModeDetail loading={false} header={<Header />}>
      <div>Hello world!</div>
      <pre class="flex flex-wrap">{JSON.stringify(result(), null, 2)}</pre>
      <AdventureInput onEnter={send} />
    </ModeDetail>
  )
}

const Header = () => {
  return <div class="bg-800 w-full rounded-md px-1 py-2">Hello Header!</div>
}

const prompt = (text: string) => neat`
Generate the game details for a ${text || 'detective who-dunnit'} RPG:

Real first and last name of the main character: "[main_char | temp=0.4 | stop="]"

Real first and last name of the main character's closest friend: "[main_friend | temp=0.4 | stop="]"

Real first and last name of the main character's wife or husband: "[partner | temp=0.4 | stop="]"

Real first and last name of the villain of the RPG: "[villin | temp=0.4 | stop="]"

Where does the game take place?: "[location | tokens=50 | stop=" | temp=0.4]"

What is the villain trying to accomplish in this RPG?: "[evil_goal | temp=0.4 | stop="]"

What is the villian's back story?: "[villain_story | temp=0.4 | stop="]"

Write the introduction to the game: "You are [intro | temp=0.4 | stop="]"
`
