import Cookies from "js-cookie";
import { Component, createEffect, lazy } from "solid-js";

import { Route, Routes } from "@solidjs/router";

import { parseJWT } from "./api";
import { useAppStore } from "./providers/AppStoreProvider";
import NavBar from "./shared/NavBar";

const ChatPage = lazy(() => import("./pages/Chat"));
const CharacterSettings = lazy(() => import("./pages/CharacterSettings"));
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));

const App: Component = () => {
  const [store, updateStore] = useAppStore();

  createEffect(() => {
    // If we don't have a logged in User object, attempt to fetch from the
    // browser's cookies.
    if (store.user) {
      return;
    }

    const jwt = Cookies.get("jwt");
    if (!jwt) {
      return;
    }

    const user = parseJWT(jwt);
    updateStore("user", user);
  });

  return (
    <div class="flex h-[100vh] flex-col justify-between">
      <NavBar />
      <div class="w-full grow overflow-y-scroll px-8 pt-8 max-sm:px-3">
        <div class="mx-auto h-full max-w-4xl">
          <Routes>
            <Route path="/chat" component={ChatPage} />
            <Route path="/character" component={CharacterSettings} />
            <Route path="/" component={Home} />
            <Route path="/account/login" component={Login} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default App;
