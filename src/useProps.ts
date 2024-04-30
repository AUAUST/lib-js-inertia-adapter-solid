import { type Page, type PageProps } from "@inertiajs/core";
import { createContext, useContext } from "solid-js";
import { type SetStoreFunction, type Store } from "solid-js/store";

type PropsStore<P extends object = Page["props"]> = [
  get: Store<P>,
  set: SetStoreFunction<P>
];

export const PropsContext = createContext<PropsStore>();

/**
 * Better avoided, this hook allows to update the props from the frontend.
 * If you only need to read the props, use `usePage().props` instead.
 *
 * It exposes a Solid store, as [getter, setter].
 *
 * @example ```tsx
 * import { useProps } from "@auaust/inertia-adapter-solid";
 *
 * function MyComponent() {
 *   const [props, setProps] = useProps();
 *
 *   return (
 *     <button
 *       onClick={async () => {
 *         const res = await fetch("/some-endpoint");
 *         if (res.ok) setProps("key", res.json());
 *       }
 *     />
 *   );
 * }
 */
export function useProps<P extends PageProps = Page["props"]>(): PropsStore<P> {
  const props = useContext(PropsContext);

  if (!props) {
    throw new Error("useProps must be used within the Inertia component.");
  }

  // @ts-expect-error
  return props;
}
