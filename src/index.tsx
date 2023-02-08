// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from "solid-js/web";
import { Component, lazy } from "solid-js";
import { Router, Routes, Route } from "@solidjs/router";

import NavBar from "./shared/NavBar";

const ChatPage = lazy(() => import("./pages/Chat"));
const CharacterSettings = lazy(() => import("./pages/CharacterSettings"));
const Home = lazy(() => import("./pages/Home"));
const Account = lazy(() => import("./pages/Account"));
const Register = lazy(() => import("./pages/Account/register"));

const App: Component = () => (
  <Router>
    <div class="flex h-[100vh] flex-col justify-between">
      <NavBar />
      <div class="w-full grow overflow-y-scroll px-8 pt-8 max-sm:px-3">
        <div class="mx-auto h-full max-w-4xl">
          <Routes>
            <Route path="/chat" component={ChatPage} />
            <Route path="/character" component={CharacterSettings} />
            <Route path="/" component={Home} />
            <Route path="/account" component={Account} />
            <Route path="/account/register" component={Register} />
          </Routes>
        </div>
      </div>
    </div>
  </Router>
);

render(() => <App />, document.getElementById("root") as HTMLElement);
