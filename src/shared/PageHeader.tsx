import { Component, Show } from "solid-js";

const PageHeader: Component<{ title: string; subtitle?: string }> = (props) => (
  <>
    <h1 class="text-4xl">{props.title}</h1>
    <Show when={!!props.subtitle}>
      <p class="text-white/50">{props.subtitle}</p>
    </Show>
    <div class="my-4 border-b border-white/5" />
  </>
);

export default PageHeader;
