import { type Page, type PageProps } from "@inertiajs/core";
import { createContext, useContext } from "solid-js";

export const PageContext = createContext<Page>();

export function usePage<P extends PageProps = PageProps>(): Page<P> {
  const page = useContext(PageContext);

  if (!page) {
    throw new Error("usePage must be used within the Inertia component.");
  }

  // @ts-expect-error
  return page;
}
