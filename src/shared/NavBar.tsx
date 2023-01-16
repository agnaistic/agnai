import { Component, JSX } from "solid-js";
import { ChevronLeft, Menu } from "lucide-solid";

const IconButton: Component<{ children: JSX.Element }> = (props) => (
  <button type="button" class="visibly-focusable p-1 rounded">
    {props.children}
  </button>
);

const NavBar: Component = () => (
  <span class="max-sm:p-3 px-8 py-5 flex gap-4 justify-between shadow-xl">
    <span class="font-semibold flex gap-2 items-center">
      <IconButton>
        <ChevronLeft />
      </IconButton>
      <span>
        Pygmalion<span class="text-purple-400">AI</span>
      </span>
    </span>
    <span class="flex gap-4">
      <IconButton>
        <Menu />
      </IconButton>
    </span>
  </span>
);

export default NavBar;
