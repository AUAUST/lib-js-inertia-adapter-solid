import { call } from "@auaust/primitive-kit/functions";
import { clone, equals, keys } from "@auaust/primitive-kit/objects";
import { isString } from "@auaust/primitive-kit/strings";
import {
  router,
  type GlobalEventsMap,
  type Method,
  type RequestPayload,
  type VisitOptions,
} from "@inertiajs/core";
import { batch, createMemo, createSignal } from "solid-js";
import {
  createStore,
  reconcile,
  unwrap,
  type SetStoreFunction,
  type Store,
} from "solid-js/store";
import { isServer } from "solid-js/web";
import { useRemember } from "./useRemember";

type FormState = Record<string, unknown>;
type FormErrors<TForm extends FormState> = Partial<Record<keyof TForm, string>>;

interface InertiaFormProps<TForm extends FormState> {
  get isDirty(): boolean;
  defaults(): this;
  defaults(field: keyof TForm, value: unknown): this;
  defaults(fields: TForm): this;
  reset(...fields: string[]): this;

  transform(callback: (data: TForm) => RequestPayload): this;

  get errors(): FormErrors<TForm>;
  get hasErrors(): boolean;
  setError(field: keyof TForm, value: string): this;
  setError(fields: Record<keyof TForm, string>): this;
  clearErrors(...fields: string[]): this;

  get processing(): boolean;
  get progress(): GlobalEventsMap["progress"]["parameters"][0];
  get wasSuccessful(): boolean;
  get recentlySuccessful(): boolean;

  get(url: string, options?: Partial<VisitOptions>): void;
  post(url: string, options?: Partial<VisitOptions>): void;
  put(url: string, options?: Partial<VisitOptions>): void;
  patch(url: string, options?: Partial<VisitOptions>): void;
  delete(url: string, options?: Partial<VisitOptions>): void;
  submit(method: Method, url: string, options: Partial<VisitOptions>): void;
  cancel(): void;
}

function createRememberStore<TValue extends object>(
  value: TValue | undefined,
  key: string | undefined,
  keySuffix: string
): ReturnType<typeof createStore<TValue>> {
  let restored = undefined;

  if (!isServer && key !== undefined) {
    key = `${key}:${keySuffix}`;
    restored = router.restore(key);
  }

  const [store, setStore] = createStore<TValue>((restored ?? value) as TValue);

  function setStoreTrap(...args: any[]) {
    // @ts-expect-error
    setStore(...args);

    if (!isServer && key !== undefined) {
      router.remember(unwrap(store), key);
    }
  }

  return [store, setStoreTrap];
}

export type InertiaForm<TForm extends FormState> = [
  get: Store<TForm> & InertiaFormProps<TForm>,
  set: SetStoreFunction<TForm>
];

export function useForm<TForm extends FormState>(
  initialValues?: TForm
): InertiaForm<TForm>;
export function useForm<TForm extends FormState>(
  rememberKey: string,
  initialValues?: TForm
): InertiaForm<TForm>;
export function useForm<TForm extends FormState>(
  rememberKeyOrInitialValues?: string | TForm,
  maybeInitialValues?: TForm
): InertiaForm<TForm> {
  const rememberKey = isString(rememberKeyOrInitialValues)
    ? rememberKeyOrInitialValues
    : undefined;

  // @ts-expect-error
  let cancelToken = null,
    // @ts-expect-error
    recentlySuccessfulTimeout = null,
    transform: (data: TForm) => RequestPayload = (data) =>
      data as RequestPayload;

  const [defaults, setDefaults] = createSignal<TForm | undefined>(
      isString(rememberKeyOrInitialValues)
        ? maybeInitialValues
        : rememberKeyOrInitialValues
    ),
    [data, setData] = createRememberStore<TForm>(
      clone(defaults()),
      rememberKey,
      "data"
    );

  const dataMemo = createMemo(() =>
      unwrap(
        keys(defaults()).reduce<TForm>((acc, key) => {
          (acc as any)[key] = data[key];
          return acc;
        }, {} as TForm)
      )
    ),
    isDirty = createMemo(() => !equals(dataMemo(), defaults()));

  const [errors, setErrors] = rememberKey
      ? useRemember<FormErrors<TForm>>({}, `${rememberKey}:errors`)
      : createSignal<FormErrors<TForm>>({}),
    hasErrors = createMemo(() => Object.keys(errors()).length > 0);

  const [processing, setProcessing] = createSignal<boolean>(false),
    [progress, setProgress] =
      createSignal<GlobalEventsMap["progress"]["parameters"][0]>(undefined),
    [wasSuccessful, setWasSuccessful] = createSignal<boolean>(false),
    [recentlySuccessful, setRecentlySuccessful] = createSignal<boolean>(false);

  const store = {
    get isDirty() {
      return isDirty();
    },

    defaults(
      fieldOrFields?: keyof TForm | Record<keyof TForm, unknown>,
      maybeValue?: unknown
    ) {
      if (typeof fieldOrFields === "undefined") {
        // @ts-expect-error
        setDefaults((defaults) => Object.assign(defaults, clone(data)));

        return this;
      }

      if (isString(fieldOrFields)) {
        fieldOrFields = { [fieldOrFields]: maybeValue } as Record<
          keyof TForm,
          unknown
        >;
      }

      // @ts-expect-error
      setDefaults((defaults) => Object.assign(defaults, fieldOrFields));

      return this;
    },

    reset(...fields: string[]) {
      if (fields.length === 0) {
        // @ts-expect-error
        setData(reconcile(defaults()));

        return this;
      }

      setData(
        // @ts-expect-error
        Object.keys(defaults())
          .filter((key) => fields.includes(key))
          .reduce((carry, key) => {
            // @ts-expect-error
            carry[key] = defaults()[key];
            return carry;
          }, {}) as TForm
      );

      return this;
    },

    transform(callback: typeof transform) {
      transform = callback;

      return this;
    },

    get errors() {
      return errors();
    },
    get hasErrors() {
      return hasErrors();
    },
    setError(
      fieldOrFields: keyof TForm | Record<keyof TForm, string>,
      maybeValue?: string
    ) {
      if (typeof fieldOrFields === "string") {
        // @ts-expect-error
        fieldOrFields = { [fieldOrFields]: maybeValue };
      }

      setErrors((errors) => Object.assign(errors, fieldOrFields));

      return this;
    },
    clearErrors(...fields: string[]) {
      if (fields.length === 0) {
        setErrors({});

        return this;
      }

      setErrors((errors) =>
        // @ts-expect-error
        Object.keys(defaults()).reduce(
          (carry, field) =>
            Object.assign(
              carry,
              !fields.includes(field) ? { [field]: errors[field] } : {}
            ),
          {}
        )
      );

      return this;
    },

    get processing() {
      return processing();
    },
    get progress() {
      return progress();
    },
    get wasSuccessful() {
      return wasSuccessful();
    },
    get recentlySuccessful() {
      return recentlySuccessful();
    },

    get(url: string, options?: Partial<VisitOptions>) {
      this.submit("get", url, options);
    },
    post(url: string, options?: Partial<VisitOptions>) {
      this.submit("post", url, options);
    },
    put(url: string, options?: Partial<VisitOptions>) {
      this.submit("put", url, options);
    },
    patch(url: string, options?: Partial<VisitOptions>) {
      this.submit("patch", url, options);
    },
    delete(url: string, options?: Partial<VisitOptions>) {
      this.submit("delete", url, options);
    },
    submit(method: Method, url: string, options: Partial<VisitOptions> = {}) {
      if (isServer) return;

      const store = this,
        data = transform(dataMemo()),
        _options: VisitOptions = {
          ...options,
          onCancelToken(token) {
            cancelToken = token;

            return call(options.onCancelToken, undefined, token);
          },
          onBefore(visit) {
            batch(() => {
              setWasSuccessful(false);
              setRecentlySuccessful(false);
            });
            // @ts-expect-error
            clearTimeout(recentlySuccessfulTimeout);

            return call(options.onBefore, undefined, visit);
          },
          onStart(visit) {
            setProcessing(true);

            return call(options.onStart, undefined, visit);
          },
          onProgress(event) {
            setProgress(event);

            return call(options.onProgress, undefined, event);
          },
          onSuccess(page) {
            batch(() => {
              setProcessing(false);
              setProgress(undefined);
              setWasSuccessful(true);
              setRecentlySuccessful(true);

              store.clearErrors();
            });

            recentlySuccessfulTimeout = setTimeout(
              () => setRecentlySuccessful(false),
              2000
            );

            // setDefaults(() => dataMemo())

            return call(options.onSuccess, undefined, page);
          },
          onError(errors) {
            batch(() => {
              setProcessing(false);
              setProgress(undefined);

              // @ts-expect-error
              store.clearErrors().setError(errors);
            });

            return call(options.onError, undefined, errors);
          },
          onCancel() {
            batch(() => {
              setProcessing(false);
              setProgress(undefined);
            });

            return call(options.onCancel);
          },
          onFinish(visit) {
            batch(() => {
              setProcessing(false);
              setProgress(undefined);
            });
            cancelToken = null;

            return call(options.onFinish, undefined, visit);
          },
        };

      if (method === "delete") {
        router.delete(url, { ..._options, data });
      } else {
        router[method](url, data, _options);
      }
    },

    cancel() {
      // @ts-expect-error
      cancelToken && cancelToken.cancel();
    },
  };

  const proxy = new Proxy(store, {
    get(target, property) {
      if (property in target) {
        // @ts-expect-error
        return target[property];
      }

      // @ts-expect-error
      return data[property];
    },
  });

  // @ts-expect-error
  return [proxy, setData];
}
