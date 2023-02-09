import { Component, createEffect, createMemo, Show } from "solid-js";

import { useLocation, useNavigate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";

import { performLogin } from "../../api/users/login";
import useAuth from "../../hooks/auth";
import Alert from "../../shared/Alert";
import Divider from "../../shared/Divider";
import PageHeader from "../../shared/PageHeader";
import LoginForm from "./LoginForm";

const LoginPage: Component = () => {
  const { login } = useAuth();
  const { state } = useLocation();
  const navigate = useNavigate();
  const mutation = createMutation(performLogin);

  /** Friendly error message passed out of the mutation, if it exists. */
  const loginError = createMemo(() => {
    if (mutation.data) {
      if ("error" in mutation.data) {
        return mutation.data.error;
      }
    }

    if (mutation.error) {
      const err = mutation.error as Error;
      if (err.message.includes("NetworkError")) {
        return "We couldn't reach our servers.";
      }
      return "Something went wrong.";
    }

    return null;
  });

  /** Form submission callback to handle POSTing to the back-end. */
  const onSubmit = (evt: Event) => {
    evt.preventDefault();
    if (!evt.target) {
      return;
    }

    const form = new FormData(evt.target as HTMLFormElement);
    mutation.mutate({
      email: form.get("email")?.valueOf() as string,
      password: form.get("password")?.valueOf() as string,
    });
  };

  /** Side-effect to take care of a successful login. */
  createEffect(() => {
    if (!mutation.data || !("jwt" in mutation.data)) return;

    login(mutation.data.jwt);

    let redirectTo = "/";
    if (state && "redirectTo" in state) {
      redirectTo = state.redirectTo as string;
    }
    navigate(redirectTo, { replace: true });
  });

  return (
    <div class="flex w-full justify-center">
      <div class="my-4 border-b border-white/5" />
      <div class="w-full max-w-sm">
        <PageHeader
          title="Welcome."
          subtitle="Please log in to your account."
        />

        <LoginForm onSubmit={onSubmit} isLoading={mutation.isLoading} />

        <Show when={loginError()}>
          <Divider />
          <Alert schema="error" title="Failed to log in.">
            {loginError()}
          </Alert>
        </Show>
      </div>
    </div>
  );
};

export default LoginPage;
