import { setupProgress, type Page, type PageResolver } from "@inertiajs/core";
import { Component } from "solid-js";
import {
  generateHydrationScript,
  getAssets,
  isServer,
  renderToString,
} from "solid-js/web";
import { App, type InertiaAppProps } from "./App";

type CreateInertiaBaseOptions = {
  id?: string;
  page?: Page;
  resolve: PageResolver;
};

type CreateInertiaCSROptions = CreateInertiaBaseOptions & {
  setup: (props: {
    el: Element;
    App: typeof App;
    props: InertiaAppProps;
  }) => void;
  progress?:
    | false
    | {
        delay?: number;
        color?: string;
        includeCSS?: boolean;
        showSpinner?: boolean;
      };
};
export type CreateInertiaCSRReturnType = ReturnType<
  CreateInertiaCSROptions["setup"]
>;

type CreateInertiaSSROptions = CreateInertiaBaseOptions & {
  setup?: never;
  progress?: never;
};
export type CreateInertiaSSRReturnType = { head: string[]; body: string };

export async function createInertiaApp(
  options: CreateInertiaCSROptions
): Promise<CreateInertiaCSRReturnType>;
export async function createInertiaApp(
  options: CreateInertiaSSROptions
): Promise<CreateInertiaSSRReturnType>;
export async function createInertiaApp({
  id = "app",
  page = undefined,
  resolve,
  setup,
  progress = {},
}: CreateInertiaCSROptions | CreateInertiaSSROptions): Promise<
  CreateInertiaCSRReturnType | CreateInertiaSSRReturnType
> {
  const el = isServer ? null : document.getElementById(id);
  const initialPage = page || JSON.parse(el.dataset.page);
  const resolveComponent = (name: string) =>
    Promise.resolve(resolve(name)).then(
      (module: { default: Component } | Component) => {
        if (!module) return null;
        return "default" in module ? module.default : module;
      }
    );

  const props: InertiaAppProps = {
    initialPage,
    initialComponent: await resolveComponent(initialPage.component),
    resolveComponent,
  };

  if (isServer) {
    const body = renderToString(() => (
      <div id={id} data-page={JSON.stringify(initialPage)}>
        <App {...props} />
      </div>
    ));

    const head = [getAssets(), generateHydrationScript()];

    return { head, body };
  }

  !isServer && progress && setupProgress(progress);

  setup({
    el,
    App,
    props,
  });
}
