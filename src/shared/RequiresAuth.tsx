import { Component, createEffect, JSX, Show } from "solid-js";

import { useLocation, useNavigate } from "@solidjs/router";

import useAuth from "../hooks/auth";

const RequiresAuth: Component<{ children: JSX.Element }> = (props) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  createEffect(() => {
    if (isAuthenticated()) {
      return;
    }

    navigate("/account/login", {
      replace: true,
      state: { redirectTo: location.pathname },
    });
  });

  return <Show when={isAuthenticated()}>{props.children}</Show>;
};

export default RequiresAuth;
