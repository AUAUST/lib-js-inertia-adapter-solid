import { A, F } from "@auaust/primitive-kit";
import { router, type Page, type PageResolver } from "@inertiajs/core";
import { MetaProvider } from "@solidjs/meta";
import {
  type Component,
  type ParentComponent,
  type ParentProps,
} from "solid-js";
import { SetStoreFunction, createStore, reconcile } from "solid-js/store";
import { isServer } from "solid-js/web";
import { PageContext } from "./usePage";
import { PropsContext } from "./useProps";

export type InertiaAppProps = {
  initialPage: Page;
  initialComponent?: Component<Page["props"]> & {
    layout?: ParentComponent<Page> | ParentComponent<Page>[];
  };
  resolveComponent?: PageResolver;
};

type InertiaAppState = {
  component: InertiaAppProps["initialComponent"] | null;
  layouts: ParentComponent<any>[];
  page: InertiaAppProps["initialPage"];
  key: any;
};

function extractLayouts(component: unknown) {
  const layout = (component as any).layout;

  if (!layout) return [];

  if (F.is(layout)) return [layout];
  if (A.is(layout)) return layout;

  return [];
}

export function App(props: ParentProps<InertiaAppProps>) {
  const [current, setCurrent] = createStore<InertiaAppState>({
    component: props.initialComponent || null,
    layouts: extractLayouts(props.initialComponent || null),
    page: props.initialPage,
    key: null,
  });

  if (!isServer) {
    router.init({
      initialPage: props.initialPage,
      resolveComponent: props.resolveComponent,
      async swapComponent({ component, page, preserveState }) {
        setCurrent(
          reconcile({
            component: component as Component,
            layouts: extractLayouts(component),
            page,
            key: preserveState ? current.key : Date.now(),
          })
        );
      },
    });
  }

  const children = (i = 0) => {
    const Layout = current.layouts[i];

    // When there is no more wrapper layout, render the component
    if (!Layout)
      return <current.component key={current.key} {...current.page.props} />;

    return <Layout {...current.page}>{children(i + 1)}</Layout>;
  };

  const updateProps: SetStoreFunction<Page["props"]> = (...args: any[]) =>
    // @ts-expect-error
    setCurrent("page", "props", ...args);

  return (
    <MetaProvider>
      <PropsContext.Provider value={[current.page.props, updateProps]}>
        <PageContext.Provider value={current.page}>
          {children()}
        </PageContext.Provider>
      </PropsContext.Provider>
    </MetaProvider>
  );
}
