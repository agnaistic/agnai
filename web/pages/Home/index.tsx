import { Component, For, Suspense } from 'solid-js'
import { AppSchema } from '../../../srv/db/schema'
import CharacterCard from '../../shared/CharacterCard'
import PageHeader from '../../shared/PageHeader'
import { userStore } from '../../store'

const CharacterGroup: Component<{
  title: string
  description: string
  characters: AppSchema.Character[]
}> = (props) => (
  <>
    <PageHeader title={props.title} subtitle={props.description} />

    <div class="flex flex-wrap gap-3 max-sm:gap-2">
      <For each={props.characters}>
        {(character) => (
          <CharacterCard character={character} href={`/characters/${character._id}`} />
        )}
      </For>
    </div>
  </>
)

const HomePage: Component = () => {
  const { jwt } = userStore.getState()

  return (
    <Suspense fallback="Loading">
      <CharacterGroup
        title="New Characters"
        description="Recent creations from the community."
        characters={[]}
      />
    </Suspense>
  )
}
export default HomePage
