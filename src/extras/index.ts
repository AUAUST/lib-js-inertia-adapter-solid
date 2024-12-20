import { router } from "@inertiajs/core";
import { isDev, isServer } from "solid-js/web";

/**
 * Can be called once to automatically expose the Inertia page and props state
 * under to `$page` and `$props` window properties. A boolean can be passed to
 * conditionally enable the feature. Will only be enabled in the browser.
 */
export function exposeInertiaState(enabled: boolean = true) {
  if (!enabled || isServer || typeof window === "undefined") return;

  router.on("navigate", (e) => {
    // @ts-expect-error
    window.$page = e?.detail?.page;
    // @ts-expect-error
    window.$props = e?.detail?.page?.props;

    isDev && console.info("Navigation event, `$page` and `$props` updated.");
  });
}
