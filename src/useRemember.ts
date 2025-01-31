import { router } from "@inertiajs/core";
import {
  createEffect,
  createSignal,
  on,
  SignalOptions,
  type Signal,
} from "solid-js";
import { isServer } from "solid-js/web";

export function useRemember<State = unknown>(
  initialState: State,
  key?: string,
  options?: SignalOptions<State>
): Signal<State> {
  // @ts-expect-error
  const restored: State = isServer ? undefined! : router.restore(key);

  const [state, setState] = createSignal<State>(
    restored === undefined ? initialState : restored,
    options
  );

  createEffect(on(state, (value) => router.remember(value, key)));

  return [state, setState];
}
