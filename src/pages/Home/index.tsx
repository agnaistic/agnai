import { createSignal, For, onMount } from "solid-js"
import CharacterCard from "../../shared/CharacterCard"
import CreateNewCard from "./components/CreateNewCard"

const HomePage = () => {
    const testTemplate = [
        {
            name: 'Ibuki-chan',
            avatarUrl: '',
            description: ''
        },
        {
            name: 'Ibuki-chan',
            avatarUrl: '',
            description: ''
        },
        {
            name: 'Ibuki-chan',
            avatarUrl: '',
            description: ''
        },
        {
            name: 'Ibuki-chan',
            avatarUrl: '',
            description: ''
        },
        {
            name: 'Ibuki-chan',
            avatarUrl: '',
            description: ''
        }
    ] as Character[]


    const [recentlyChatedCharacters, setRecentlyChatedCharacters] = createSignal(testTemplate);
    const [recommendedCharacters, setRecommendedCharacters] = createSignal(testTemplate);
    const [popularCharacters, setPopularCharacters] = createSignal(testTemplate);
    const [recentlyCreatedCharacters, setRecentlyCreatedCharacters] = createSignal(testTemplate);

    return <>
        <h1 class="text-3xl mt-10">Recently Chatted Characters</h1>
        <p class="text-white/50">Characters that you recently chatted.</p>
        <div class="my-4 border-b border-white/5" />
        <div class="flex flex-wrap gap-4 justify-center">
            <For each={recentlyChatedCharacters()}>{(e:Character) => {
                return <CharacterCard displayName={e.name} avatarUrl={e.avatarUrl} />
            }}</For>
        </div>

        <h1 class="text-3xl mt-10">Recommended Characters</h1>
        <p class="text-white/50">Characters that are recommended for you</p>
        <div class="my-4 border-b border-white/5" />
        <div class="flex flex-wrap gap-4 justify-center">
        <For each={recommendedCharacters()}>{(e:Character) => {
                return <CharacterCard displayName={e.name} avatarUrl={e.avatarUrl} />
            }}</For>
        </div>

        <h1 class="text-3xl mt-10">Popular characters</h1>
        <p class="text-white/50">Characters that are popular in the community.</p>
        <div class="my-4 border-b border-white/5" />
        <div class="flex flex-wrap gap-4 justify-center">
        <For each={popularCharacters()}>{(e:Character) => {
                return <CharacterCard displayName={e.name} avatarUrl={e.avatarUrl} />
            }}</For>
        </div>

        <h1 class="text-3xl mt-10">Recently Created Characters</h1>
        <p class="text-white/50">Characters that are made recently.</p>
        <div class="my-4 border-b border-white/5" />
        <div class="flex flex-wrap gap-4 justify-center">
        <For each={recentlyCreatedCharacters()}>{(e:Character) => {
                return <CharacterCard displayName={e.name} avatarUrl={e.avatarUrl} />
            }}</For>
        </div>
    </>
}
export default HomePage