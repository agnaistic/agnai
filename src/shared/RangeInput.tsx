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
      appearance-none
      w-full
      h-6
      p-0
      bg-transparent
      focus:outline-none focus:ring-0 focus:shadow-none
    "
      min="0"
      max="5"
      id="customRange2"
    />
  </div>
);

export default RangeInput;
