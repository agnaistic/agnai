import { Component } from "solid-js";

import Button from "../../shared/Button";
import TextInput from "../../shared/TextInput";

const LoginForm: Component<{
  isLoading: boolean;
  onSubmit: (evt: Event) => void;
}> = (props) => (
  <form onSubmit={(evt) => props.onSubmit(evt)} class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <TextInput fieldName="email" placeholder="Email" type="email" required />
      <TextInput
        fieldName="password"
        placeholder="Password"
        type="password"
        required
      />
    </div>

    <Button type="submit" disabled={props.isLoading}>
      {props.isLoading ? "Logging in..." : "Log in"}
    </Button>
  </form>
);

export default LoginForm;
