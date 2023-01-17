import { Component } from "solid-js";

const FileUpload: Component = () => (
  <div class="flex">
    <label class="w-64 flex flex-col items-center px-4 py-6 rounded-lg cursor-pointer focusable-field text-white/50">
      <svg
        class="w-8 h-8"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
      >
        <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4-4-4 4h3v3h2v-3z" />
      </svg>
      <span class="mt-2 text-base leading-normal uppercase tracking-wide">
        Select a file
      </span>
      <input type="file" class="hidden" />
    </label>
  </div>
);

export default FileUpload;
