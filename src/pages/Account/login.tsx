import { A } from "@solidjs/router";
import Button from "../../shared/Button";
import TextInput from "../../shared/TextInput";

const Account = () => (
  <div class="flex w-full justify-center">
    <div class="my-4 border-b border-white/5" />
    <div class="w-full max-w-xl">
      <h1 class="text-4xl">Log in</h1>
      <div class="my-4 mb-2 border-b border-white/5" />
      <TextInput fieldName="" placeholder="ID" class="mb-2" />
      <TextInput
        fieldName=""
        placeholder="Password"
        type="password"
        class="mb-4"
      />
      <div class="flex gap-2">
        <Button>Continue</Button>
        <A href="/account/register">
          <Button schema="secondary">Register</Button>
        </A>
      </div>
    </div>
  </div>
);

export default Account;
