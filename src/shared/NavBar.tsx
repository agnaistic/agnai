import { Component, JSX } from "solid-js";
import { A } from "@solidjs/router";
import {
  ChevronLeft,
  Home,
  Menu,
  MessageCircle,
  Settings,
  Users,
} from "lucide-solid";

const NavBar: Component = () => (
  <span class="max-sm:p-3 px-8 py-5 flex gap-4 justify-between shadow-xl">
    <span class="font-semibold flex gap-2 items-center">
      <A href="/">
        Pygmalion<span class="text-purple-400">AI</span>
      </A>
    </span>
    <span class="flex gap-4">
      <A
        aria-label="Character Settings"
        class="focusable-icon-button p-1 rounded"
        href="/character"
      >
        <Users />
      </A>

      <A
        aria-label="Chat"
        class="focusable-icon-button p-1 rounded"
        href="/chat"
      >
        <MessageCircle />
      </A>

      <A
        aria-label="Generation Settings"
        class="focusable-icon-button p-1 rounded"
        href="/generation-settings"
      >
        <Settings />
      </A>
    </span>
  </span>
);

export default NavBar;
