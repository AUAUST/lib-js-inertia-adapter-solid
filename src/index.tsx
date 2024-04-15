export { router } from "@inertiajs/core";
export { default as Link } from "./Link";
export { default as createInertiaApp } from "./createInertiaApp";
export { default as useForm } from "./useForm";
export { default as usePage } from "./usePage";
export { default as useRemember } from "./useRemember";

export function test() {
  return (
    <div>
      <h1>Test</h1>
      Hello World
    </div>
  );
}
