import { router, type Page, type PageResolver } from "@inertiajs/core";
import { MetaProvider } from "@solidjs/meta";
import {
  type Component,
  type ParentComponent,
  type ParentProps,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { isServer } from "solid-js/web";
import { PageContext } from "./PageContext";

export type InertiaAppProps = {
  initialPage: Page;
  initialComponent?: Component<Page["props"]> & {
    layout?: ParentComponent<any> | ParentComponent<any>[];
  };
  resolveComponent?: PageResolver;
};

type InertiaAppState = {
  component: InertiaAppProps["initialComponent"] | null;
  layouts: ParentComponent<any>[];
  page: InertiaAppProps["initialPage"];
  key: any;
};

function extractLayouts(component) {
  if (!component) {
    return [];
  }

  if (typeof component.layout === "function") {
    return [component.layout];
  }

  if (Array.isArray(component.layout)) {
    return component.layout;
  }

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

    if (!Layout) {
      return <current.component key={current.key} {...current.page.props} />;
    }

    return <Layout {...current.page.props}>{children(i + 1)}</Layout>;
  };

  return (
    <MetaProvider>
      <PageContext.Provider value={current.page}>
        {children()}
      </PageContext.Provider>
    </MetaProvider>
  );
}
