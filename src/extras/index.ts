import { P } from "@auaust/primitive-kit";
import { router } from "@inertiajs/core";
import { hydrate, isDev, isServer, render } from "solid-js/web";

/**
 * Can be called once to automatically expose the Inertia page and props state
 * under to `$page` and `$props` window properties. A boolean can be passed to
 * conditionally enable the feature. Will only be enabled in the browser.
 */
export const exposeInertiaState = (enabled: boolean = true) => {
  if (!enabled || isServer || typeof window === "undefined") return;

  router.on("navigate", (e) => {
    // @ts-expect-error
    window.$page = e?.detail?.page;
    // @ts-expect-error
    window.$props = e?.detail?.page?.props;

    isDev && console.info("Navigation event, `$page` and `$props` updated.");
  });
};

/**
 * Returns a boolean indicating if the document has been server-rendered.
 * Always returns `false` in the server.
 */
export const isServerRendered = () => {
  return (
    !isServer &&
    typeof window !== "undefined" &&
    // @ts-ignore - This key is set by the hydration script the backend adds when server-rendering.
    P.isSet(window._$HY)
  );
};

/**
 * Returns either `hydrate` or `render` depending on if the document has been
 * server-rendered. Always returns `render` in the server.
 *
 * This is useful to handle the possibility of the backend failing to render.
 */
export const hydrateOrRender: typeof hydrate = (...args) => {
  const method = isServerRendered() ? hydrate : render;

  if (isDev) {
    if (method === render) {
      console.warn("The application is being client-side rendered.");
    } else {
      console.info("The application is being hydrated.");
    }
  }

  return method(...args);
};
