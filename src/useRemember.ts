import { router } from "@inertiajs/core";
import { createEffect, createSignal, on, type Signal } from "solid-js";
import { isServer } from "solid-js/web";

export function useRemember<State = unknown>(
  initialState: State,
  key?: string
): Signal<State> {
  // @ts-expect-error
  const restored: State = isServer ? undefined! : router.restore(key);

  const [state, setState] = createSignal<State>(
    restored === undefined ? initialState : restored
  );

  createEffect(on(state, (value) => router.remember(value, key)));

  return [state, setState];
}
