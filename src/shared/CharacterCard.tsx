import { Component, Show } from "solid-js";

const CharacterCard: Component<{ displayName: string; avatarUrl?: string }> = (
  props
) => (
    <div
      style={{ "background-image": `url("${props.avatarUrl}")` }}
      class="relative h-40 w-40 rounded-lg bg-white bg-cover drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)] transition hover:-translate-y-1 hover:scale-105"
    >
      <div class="h-full w-full rounded-lg bg-gradient-to-t from-gray-700" />
      <span class="text-shadow absolute bottom-2 left-3">
        {props.displayName}
      </span>
    </div>
  );

export default CharacterCard;
