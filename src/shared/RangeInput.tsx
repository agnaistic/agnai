import { Component } from "solid-js";

const RangeInput: Component = () => (
  <div class="relative pt-1">
    <label for="customRange2" class="form-label">
      Example range
    </label>
    <input
      type="range"
      class="
      form-range
      h-6
      w-full
      appearance-none
      bg-transparent
      p-0
      focus:shadow-none focus:outline-none focus:ring-0
    "
      min="0"
      max="5"
      id="customRange2"
    />
  </div>
);

export default RangeInput;
