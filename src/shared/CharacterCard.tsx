import { Component, Show } from "solid-js";

const CharacterCard: Component<{ displayName: string, avatarUrl?:string }> = (props) => {
    return <div
        style={{"background-image": `url("${props.avatarUrl}")`}}
        class="bg-white rounded-lg h-40 w-40 bg-cover drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)] relative transition hover:-translate-y-1 hover:scale-105">
        <div class="bg-gradient-to-t from-gray-700 w-full h-full rounded-lg">
        </div>
        <span class="absolute bottom-2 left-3 text-shadow">{props.displayName}</span>
    </div>
}

export default CharacterCard