import { Component, Show } from "solid-js";

import Divider from "./Divider";

const PageHeader: Component<{ title: string; subtitle?: string }> = (props) => (
  <>
    <h1 class="text-4xl">{props.title}</h1>
    <Show when={!!props.subtitle}>
      <p class="text-white/50">{props.subtitle}</p>
    </Show>
    <Divider />
  </>
);

export default PageHeader;
