import { FileWarning } from "lucide-solid";
import { Component, JSX, createMemo } from "solid-js";

type AlertSchema = "error";

const schemaToClasses: Record<AlertSchema, string> = {
  error: "bg-red-500/10 bg-gray-800 text-red-400",
};

const Alert: Component<{
  title: JSX.Element;
  children: JSX.Element;
  schema: AlertSchema;
}> = (props) => {
  const classes = createMemo(() =>
    [
      schemaToClasses[props.schema || "error"],
      "rounded-lg p-4 text-sm flex gap-2",
    ].join(" ")
  );

  return (
    <div class={classes()} role="alert">
      <div class="w-fit rounded-full bg-red-600/10 p-3">
        <FileWarning size={16} />
      </div>
      <div>
        <b>{props.title}</b>
        <p>{props.children}</p>
      </div>
    </div>
  );
};

export default Alert;
