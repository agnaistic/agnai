import { Component, For, Suspense } from "solid-js";

import { createQuery } from "@tanstack/solid-query";

import { fetchCharacters } from "../../api/characters/list";
import Character from "../../models/Character";
import CharacterCard from "../../shared/CharacterCard";
import PageHeader from "../../shared/PageHeader";
import useAuth from "../../hooks/auth";
import RequiresAuth from "../../shared/RequiresAuth";

const CharacterGroup: Component<{
  title: string;
  description: string;
  characters: Character[];
}> = (props) => (
  <>
    <PageHeader title={props.title} subtitle={props.description} />

    <div class="flex flex-wrap gap-3 max-sm:gap-2">
      <For each={props.characters}>
        {(character: Character) => (
          <CharacterCard
            character={character}
            href={`/characters/${character.id}`}
          />
        )}
      </For>
    </div>
  </>
);

const HomePage: Component = () => {
  const { jwt } = useAuth();
  const query = createQuery(
    () => ["characters"],
    () => fetchCharacters(jwt()!)
  );

  return (
    <RequiresAuth>
      <Suspense fallback="Loading">
        <CharacterGroup
          title="New Characters"
          description="Recent creations from the community."
          characters={query.data}
        />
      </Suspense>
    </RequiresAuth>
  );
};
export default HomePage;
