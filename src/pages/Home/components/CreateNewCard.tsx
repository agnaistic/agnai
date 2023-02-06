import { A } from "@solidjs/router"
import { Plus } from "lucide-solid"
import { Component } from "solid-js"


const CreateNewCard: Component = (props) => {
    return <A href="/character">
        <div class="border-white/80 text-white/80 border-4 rounded-lg h-40 w-40 drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)] transition hover:-translate-y-1 hover:scale-105 flex items-center justify-center hover:text-white hover:border-white">
        <Plus size={48}/>
        </div>
    </A>
}

export default CreateNewCard