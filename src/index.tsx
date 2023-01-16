// eslint-disable-next-line import/no-extraneous-dependencies
import { render } from "solid-js/web";
import type { Component } from "solid-js";

const App: Component = () => <h1>Hello world!</h1>;

render(() => <App />, document.getElementById("root") as HTMLElement);
