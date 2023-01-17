// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from "solid-js/web";
import { Component, lazy } from "solid-js";
import { Router, Routes, Route } from "@solidjs/router";

import NavBar from "./shared/NavBar";

const ChatPage = lazy(() => import("./pages/Chat"));
const CharacterSettings = lazy(() => import("./pages/CharacterSettings"));

const Home: Component = () => <h1>haven't made a homepage</h1>;

const App: Component = () => (
  <Router>
    <div class="flex h-[100vh] flex-col justify-between">
      <NavBar />
      <div class="flex-grow overflow-y-scroll max-sm:px-3 px-8 pt-8 w-full">
        <div class="max-w-4xl mx-auto h-full">
          <Routes>
            <Route path="/chat" component={ChatPage} />
            <Route path="/character" component={CharacterSettings} />
            <Route path="/" component={Home} />
          </Routes>
        </div>
      </div>
    </div>
  </Router>
);

render(() => <App />, document.getElementById("root") as HTMLElement);
