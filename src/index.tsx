import { Component } from "solid-js";
import { render } from "solid-js/web";

import { Router } from "@solidjs/router";
import { QueryClient, QueryClientProvider } from "@tanstack/solid-query";

import App from "./App";
import { AppStoreProvider } from "./providers/AppStoreProvider";

const queryClient = new QueryClient();

const AppContainer: Component = () => (
  <Router>
    <AppStoreProvider>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </AppStoreProvider>
  </Router>
);

render(() => <AppContainer />, document.getElementById("root") as HTMLElement);
