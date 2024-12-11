import { S } from "@auaust/primitive-kit";
import {
  mergeDataIntoQueryString,
  router,
  shouldIntercept,
  type FormDataConvertible,
  type Method,
  type PreserveStateOption,
  type Progress,
} from "@inertiajs/core";
import {
  mergeProps,
  splitProps,
  type ComponentProps,
  type JSX,
  type ParentProps,
} from "solid-js";
import { Dynamic, isServer } from "solid-js/web";

type InertiaLinkProps = {
  as?: keyof JSX.IntrinsicElements;
  data?: Record<string, FormDataConvertible>;
  href: string;
  method?: Method;
  preserveScroll?: PreserveStateOption;
  preserveState?: PreserveStateOption;
  replace?: boolean;
  only?: string[];
  headers?: Record<string, string>;
  queryStringArrayFormat?: "indices" | "brackets";
  onClick?: (event: MouseEvent) => void;
  onCancelToken?: (cancelToken: any) => void;
  onBefore?: () => void;
  onStart?: () => void;
  onProgress?: (progress?: Progress) => void;
  onFinish?: () => void;
  onCancel?: () => void;
  onSuccess?: () => void;
  onError?: () => void;
};

const noop = () => {};

export function Link(
  props: ParentProps<InertiaLinkProps> &
    ComponentProps<NonNullable<InertiaLinkProps["as"]>>
) {
  let [local, attributes] = splitProps(props, [
    "children",
    "as",
    "data",
    "href",
    "method",
    "preserveScroll",
    "preserveState",
    "replace",
    "only",
    "headers",
    "queryStringArrayFormat",
    "onClick",
    "onCancelToken",
    "onBefore",
    "onStart",
    "onProgress",
    "onFinish",
    "onCancel",
    "onSuccess",
    "onError",
  ]);

  // Set default prop values
  local = mergeProps(
    {
      as: "a" as const,
      data: {},
      method: "get" as const,
      preserveScroll: false,
      replace: false,
      only: [],
      headers: {},
      queryStringArrayFormat: "brackets" as const,
      async: false,
      cacheFor: 0,
      prefetch: false,
    },
    local
  );

  const [href, data] = mergeDataIntoQueryString(
    S.lower(local.method) || "get",
    S(local.href),
    local.data!,
    local.queryStringArrayFormat
  );

  local = mergeProps(local, { data });

  if (local.as === "a") {
    attributes = mergeProps(attributes, { href });

    if (local.method !== "get") {
      console.warn(
        `Creating POST/PUT/PATCH/DELETE <a> links is discouraged as it causes "Open Link in New Tab/Window" accessibility issues. Use 'as="button"' instead.`
      );
    }
  }

  const visit = (event: MouseEvent) => {
    if (isServer) return;

    local.onClick?.(event);

    // @ts-expect-error
    if (shouldIntercept(event)) {
      event.preventDefault();

      router.visit(local.href, {
        data: local.data,
        method: local.method,
        preserveScroll: local.preserveScroll,
        preserveState: local.preserveState ?? local.method === "get",
        replace: local.replace,
        only: local.only,
        headers: local.headers,
        onCancelToken: local.onCancelToken || noop,
        onBefore: local.onBefore || noop,
        onStart: local.onStart || noop,
        onProgress: local.onProgress || noop,
        onFinish: local.onFinish || noop,
        onCancel: local.onCancel || noop,
        onSuccess: local.onSuccess || noop,
        onError: local.onError || noop,
      });
    }
  };

  return (
    <Dynamic
      {...attributes}
      component={local.as}
      onClick={visit}
      children={local.children}
    />
  );
}
