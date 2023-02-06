import { Component, JSX } from "solid-js";

type ButtonSchema = "primary" | "secondary";

const schemaNameToClass: Record<ButtonSchema, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
};

const Button: Component<{ children: JSX.Element; schema?: ButtonSchema;}> = (
  props
) => (
  <button class={schemaNameToClass[props.schema || "primary"]}>
    {props.children}
  </button>
);

export default Button;
