import { A, F } from "@auaust/primitive-kit";
import { router, type Page, type PageResolver } from "@inertiajs/core";
import { MetaProvider } from "@solidjs/meta";
import {
  type Component,
  type ParentComponent,
  type ParentProps,
} from "solid-js";
import { createMutable, createStore, reconcile } from "solid-js/store";
import { Dynamic, isServer } from "solid-js/web";
import { PageContext } from "./usePage";

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
  if (!component) return [];

  // @ts-expect-error
  const layout = component.layout;

  if (!layout) return [];
  if (F.is(layout)) return [layout];
  if (A.is(layout)) return layout;

  return [];
}

export function App(props: ParentProps<InertiaAppProps>) {
  const currentProps = createMutable<InertiaAppState["page"]["props"]>(
    props.initialPage.props
  );
  const [current, setCurrent] = createStore<InertiaAppState>({
    component: props.initialComponent || null,
    layouts: extractLayouts(props.initialComponent || null),
    page: {
      ...props.initialPage,
      props: currentProps,
    },
    key: null,
  });

  if (!isServer) {
    router.init({
      initialPage: props.initialPage,
      resolveComponent: props.resolveComponent!,
      async swapComponent({ component, page, preserveState }) {
        setCurrent(
          reconcile({
            component: component as Component,
            layouts: extractLayouts(component),
            page, // the inner props mutable is correctly updated by `reconcile`
            key: preserveState ? current.key : Date.now(),
          })
        );
      },
    });
  }

  const children = (i = 0) => {
    const Layout = current.layouts[i];

    // When there is no more wrapper layout, render the component
    if (!Layout) {
      return (
        <Dynamic
          component={current.component!}
          key={current.key}
          {...current.page.props}
        />
      );
    }

    return <Layout {...current.page}>{children(i + 1)}</Layout>;
  };

  return (
    <MetaProvider>
      <PageContext.Provider value={current.page}>
        {children()}
      </PageContext.Provider>
    </MetaProvider>
  );
}
