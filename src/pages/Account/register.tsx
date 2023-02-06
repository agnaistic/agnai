import Button from "../../shared/Button";
import TextInput from "../../shared/TextInput";

const Register = () => {

    return <>
        <div class="flex justify-center w-full">
            <div class="my-4 border-b border-white/5" />
            <div class="max-w-xl w-full">
                <h1 class="text-4xl">Register</h1>
                <div class="my-4 border-b border-white/5 mb-2" />
                <TextInput fieldName="" placeholder="ID" class="mb-2" />
                <TextInput fieldName="" placeholder="Password" type="password" class="mb-2"/>
                <TextInput fieldName="" placeholder="Repeat Password" type="password" class="mb-4"/>
                <div class="flex gap-2">
                    <Button>Continue</Button>
                    <Button schema="secondary">Login</Button>

                </div>
            </div>
        </div>
    </>
}

export default Register