import { type Page, type PageProps } from "@inertiajs/core";
import { createContext, useContext } from "solid-js";

export const PageContext = createContext<Page>();

/**
 * Returns the current page object.
 */
export function usePage<P extends PageProps = PageProps>(): Page<P> {
  const page = useContext(PageContext);

  if (!page) {
    throw new Error("usePage must be used within the Inertia component.");
  }

  // @ts-expect-error
  return page;
}

/**
 * Returns the current page props.
 *
 * @note This function is not part of the official Inertia.js API.
 */
export function useProps<P extends PageProps = PageProps>(): P {
  // @ts-expect-error
  return usePage().props;
}
