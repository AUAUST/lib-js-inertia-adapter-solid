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
  createMemo,
  mergeProps,
  splitProps,
  type JSX,
  type ParentProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";

export type InertiaLinkProps = {
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

const noop = () => undefined;

/**
 * The `Link` component is used to navigate to Inertia.js pages.
 *
 * If it is not explicitly specified, the `as` prop will default
 * to `"a"` for `GET` requests and `"button"` for all other requests.
 */
export function Link(
  props: ParentProps<InertiaLinkProps> & JSX.IntrinsicElements["a"]
) {
  const [local, attributes] = splitProps(props, [
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

  const defaulted = mergeProps(
    {
      method: "get" as const,
      data: {},
      preserveScroll: false,
      replace: false,
      only: [],
      headers: {},
      queryStringArrayFormat: "brackets" as const,
      onClick: noop,
      onCancelToken: noop,
      onBefore: noop,
      onStart: noop,
      onProgress: noop,
      onFinish: noop,
      onCancel: noop,
      onSuccess: noop,
      onError: noop,
    },
    local
  );

  const sanitized = mergeProps(defaulted, {
    method: S.lower(defaulted.method) as Method,
    preserveState: defaulted.preserveState ?? defaulted.method !== "get",
  });

  const as = createMemo(
    () => S.lower(sanitized.as) || (sanitized.method === "get" ? "a" : "button")
  );

  const visitData = createMemo(() => {
    const [href, data] = mergeDataIntoQueryString(
      sanitized.method,
      S(sanitized.href),
      sanitized.data,
      sanitized.queryStringArrayFormat
    );

    return { href, data };
  });

  const click = (event: MouseEvent) => {
    sanitized.onClick(event);

    if (shouldIntercept(event)) {
      event.preventDefault();

      router.visit(visitData().href, {
        ...sanitized,
        data: visitData().data,
      });
    }
  };

  return (
    <Dynamic
      {...attributes}
      component={as()}
      href={as() === "a" ? visitData().href : undefined}
      children={sanitized.children}
      onClick={click}
    />
  );
}
