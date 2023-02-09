import { MessageCircle, Settings, User, Users } from "lucide-solid";
import { Component } from "solid-js";

import { A } from "@solidjs/router";

const NavBar: Component = () => (
  <span class="flex justify-between gap-4 bg-background-lighter px-8 py-5 shadow-xl max-sm:p-3">
    <span class="flex items-center gap-2 font-semibold">
      <A href="/">
        Pygmalion<span class="text-purple-400">AI</span>
      </A>
    </span>
    <span class="flex gap-4">
      <A
        aria-label="Character Settings"
        class="focusable-icon-button rounded p-1"
        href="/account"
      >
        <User />
      </A>

      <A
        aria-label="Character Settings"
        class="focusable-icon-button rounded p-1"
        href="/character"
      >
        <Users />
      </A>

      <A
        aria-label="Chat"
        class="focusable-icon-button rounded p-1"
        href="/chat"
      >
        <MessageCircle />
      </A>

      <A
        aria-label="Generation Settings"
        class="focusable-icon-button rounded p-1"
        href="/generation-settings"
      >
        <Settings />
      </A>
    </span>
  </span>
);

export default NavBar;
