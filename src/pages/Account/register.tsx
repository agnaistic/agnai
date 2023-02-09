import Button from "../../shared/Button";
import TextInput from "../../shared/TextInput";

const Register = () => (
  <div class="flex w-full justify-center">
    <div class="my-4 border-b border-white/5" />
    <div class="w-full max-w-xl">
      <h1 class="text-4xl">Register</h1>
      <div class="my-4 mb-2 border-b border-white/5" />
      <TextInput fieldName="" placeholder="ID" />
      <TextInput fieldName="" placeholder="Password" type="password" />
      <TextInput fieldName="" placeholder="Repeat Password" type="password" />
      <div class="flex gap-2">
        <Button>Continue</Button>
        <Button schema="secondary">Login</Button>
      </div>
    </div>
  </div>
);

export default Register;
