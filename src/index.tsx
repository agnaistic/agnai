// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from "solid-js/web";
import { Component } from "solid-js";

import ChatPage from "./pages/Chat";
import NavBar from "./shared/NavBar";

const App: Component = () => (
  <div class="flex h-[100vh] flex-col justify-between">
    <NavBar />
    <div class="flex-grow overflow-y-scroll">
      <ChatPage />
    </div>
  </div>
);

render(() => <App />, document.getElementById("root") as HTMLElement);
