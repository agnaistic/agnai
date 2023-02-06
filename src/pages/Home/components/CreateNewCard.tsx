import { A } from "@solidjs/router";
import { Plus } from "lucide-solid";
import { Component } from "solid-js";

const CreateNewCard: Component = (props) => (
    <A href="/character">
      <div class="flex h-40 w-40 items-center justify-center rounded-lg border-4 border-white/80 text-white/80 drop-shadow-[0_1px_2px_rgba(255,255,255,0.1)] transition hover:-translate-y-1 hover:scale-105 hover:border-white hover:text-white">
        <Plus size={48} />
      </div>
    </A>
  );

export default CreateNewCard;
