import { call } from "@auaust/primitive-kit/functions";
import {
  clone,
  equals,
  hasKeys,
  keys as objectKeys,
  omit,
  pick,
} from "@auaust/primitive-kit/objects";
import { isString } from "@auaust/primitive-kit/strings";
import {
  router,
  type FormDataConvertible,
  type Method,
  type Progress,
  type RequestPayload,
  type VisitOptions,
} from "@inertiajs/core";
import { batch, createMemo, createSignal, Signal } from "solid-js";
import {
  createStore,
  produce,
  unwrap,
  type SetStoreFunction,
  type Store,
} from "solid-js/store";
import { isServer } from "solid-js/web";
import { useRemember } from "./useRemember";

type StringRecord = Record<string, unknown>;
type FormErrors<Data extends StringRecord> = Partial<
  Record<keyof Data, string>
>;
type FormOptions = Omit<VisitOptions, "data">;
type DataSetter<Data extends StringRecord> =
  | ((data: Data) => void)
  | ((data: (previous: Data) => Data) => void)
  | (<K extends keyof Data>(key: K, value: Data[K]) => void);
type CancelToken = { cancel: VoidFunction };

export interface InertiaFormProps<Data extends StringRecord> {
  data: Data;
  isDirty: boolean;
  errors: Partial<Record<keyof Data, string>>;
  hasErrors: boolean;
  processing: boolean;
  progress: Progress | null;
  wasSuccessful: boolean;
  recentlySuccessful: boolean;
  setData: DataSetter<Data>;
  transform: (callback: (data: Data) => object) => void;
  setDefaults(): void;
  setDefaults(field: keyof Data, value: FormDataConvertible): void;
  setDefaults(fields: Partial<Data>): void;
  reset: (...fields: (keyof Data)[]) => void;
  clearErrors: (...fields: (keyof Data)[]) => void;
  setError(field: keyof Data, value: string): void;
  setError(errors: Record<keyof Data, string>): void;
  submit: (method: Method, url: string, options?: FormOptions) => void;
  get: (url: string, options?: FormOptions) => void;
  patch: (url: string, options?: FormOptions) => void;
  post: (url: string, options?: FormOptions) => void;
  put: (url: string, options?: FormOptions) => void;
  delete: (url: string, options?: FormOptions) => void;
  cancel: () => void;
}

export type InertiaForm<Data extends StringRecord> = [
  get: Store<Data> & InertiaFormProps<Data>,
  set: SetStoreFunction<Data>
];

function useForm<Data extends StringRecord>(
  initialValues?: Data
): InertiaForm<Data>;
function useForm<Data extends StringRecord>(
  rememberKey: string,
  initialValues?: Data
): InertiaForm<Data>;
function useForm<Data extends StringRecord>(
  keyOrValues?: string | Data,
  values?: Data
): InertiaForm<Data> {
  type FieldName = keyof Data;

  const key = isString(keyOrValues) ? keyOrValues : undefined;

  let cancelToken: CancelToken | undefined = undefined;

  let recentlySuccessfulTimeout: ReturnType<typeof setTimeout> | undefined =
    undefined;

  let transformer: (data: Data) => RequestPayload = (data: Data) =>
    data as RequestPayload;

  const [defaults, setDefaults] = createSignal<Data | undefined>(
    isString(keyOrValues) ? values : keyOrValues
  );

  const [rawData, setData] = ((value) => {
    const rememberKey = !isServer && isString(key) ? `${key}:data` : undefined;

    const [store, setStore] = createStore<Data>(
      ((rememberKey ? router.restore(rememberKey) : null) ?? value) as Data
    );

    const trap: SetStoreFunction<Data> = rememberKey
      ? // @ts-expect-error
        (...args) => (setStore(...args), router.remember(unwrap(store), rememberKey)) // prettier-ignore
      : setStore;

    return [store, trap];
  })(defaults());

  // The allowlist of form keys, based on the initial values
  const keys = createMemo(() => objectKeys(defaults()) as FieldName[]);

  const data = createMemo(() => pick(rawData, keys()));

  const isDirty = createMemo(() => !equals(data(), defaults()));

  const [errors, setErrors]: Signal<FormErrors<Data>> = key
    ? useRemember({}, `${key}:errors`, { equals: false })
    : createSignal({}, { equals: false }); // We want to update the errors even when we keep the same object reference

  const hasErrors = createMemo(() => hasKeys(errors()));

  const [processing, setProcessing] = createSignal(false);

  const [progress, setProgress] = createSignal<Progress | undefined>();

  const [wasSuccessful, setWasSuccessful] = createSignal(false);

  const [recentlySuccessful, setRecentlySuccessful] = createSignal(false);

  const form = {
    /** The form data. */
    get data(): Data {
      return data();
    },

    /** Whether any of the form field was changed. */
    get isDirty() {
      return isDirty();
    },

    /** Set the default values for the form fields. */
    setDefaults(
      fieldOrFields?: FieldName | Record<FieldName, unknown>,
      maybeValue?: unknown
    ) {
      if (fieldOrFields === undefined) {
        setDefaults(() => clone(rawData));
      } else {
        const newDefaults = isString(fieldOrFields)
          ? { [fieldOrFields]: maybeValue }
          : fieldOrFields;

        setDefaults(
          produce((defaults) => {
            for (const field of objectKeys(newDefaults)) {
              // @ts-expect-error
              defaults[field] = newDefaults[field];
            }
          })
        );
      }

      return this;
    },

    reset(...fields: string[]) {
      if (fields.length === 0) {
        setData(clone(defaults())!);
      } else {
        setData(
          produce((data) => {
            const initial = defaults();

            for (const field of fields) {
              // @ts-expect-error
              data[field] = initial?.[field];
            }

            return data;
          })
        );
      }

      return this;
    },

    /** Provide a callback to transform the form data before submission. */
    transform(callback: typeof transformer) {
      transformer = callback;
      return this;
    },

    /** The error messages for the form fields. */
    get errors() {
      return errors();
    },

    /** Whether the form has any errors. */
    get hasErrors() {
      return hasErrors();
    },

    /** Set the error message for the given field. */
    setError(
      fieldOrFields: FieldName | Record<FieldName, string>,
      maybeValue?: string
    ) {
      const newErrors = isString(fieldOrFields)
        ? { [fieldOrFields]: maybeValue }
        : fieldOrFields;

      setErrors((errors) => Object.assign(errors, newErrors));

      return this;
    },

    /** Clear the error messages for the given fields, or all fields if none are provided. */
    clearErrors(...fields: FieldName[]) {
      setErrors(() => (fields.length === 0 ? {} : omit(errors(), fields)));

      return this;
    },

    /** Whether a form submission is in progress. */
    get processing() {
      return processing();
    },

    /** While a form submission is in progress, the Axios progress event. */
    get progress() {
      return progress();
    },

    /** Whether the last form submission was successful. */
    get wasSuccessful() {
      return wasSuccessful();
    },

    /** Whether a form submission was successful within the last 2 seconds. */
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

      const payload = transformer(data());
      const _options: VisitOptions = {
        ...options,
        onCancelToken: (token) => (
          (cancelToken = token), call(options.onCancelToken, undefined, token)
        ),
        onBefore(visit) {
          batch(() => {
            setWasSuccessful(false);
            setRecentlySuccessful(false);
          });
          clearTimeout(recentlySuccessfulTimeout);

          return call(options.onBefore, undefined, visit);
        },
        onStart: (visit) => (
          setProcessing(true), call(options.onStart, undefined, visit)
        ),
        onProgress: (event) => (
          setProgress(event), call(options.onProgress, undefined, event)
        ),
        onSuccess(page) {
          batch(() => {
            setProcessing(false);
            setProgress(undefined);
            setWasSuccessful(true);
            setRecentlySuccessful(true);

            form.clearErrors();
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

            form.clearErrors();
            // @ts-expect-error
            form.setError(errors);
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
          cancelToken = undefined;

          return call(options.onFinish, undefined, visit);
        },
      };

      if (method === "delete") {
        router.delete(url, { ..._options, data: payload });
      } else {
        router[method](url, payload, _options);
      }
    },

    cancel: () => (cancelToken && cancelToken.cancel(), undefined),
  };

  const proxy = new Proxy<InertiaForm<Data>[0]>(
    // @ts-expect-error
    form,
    {
      get(target, property) {
        if (Reflect.has(target, property)) {
          return Reflect.get(target, property);
        }

        return Reflect.get(data(), property); // Provided the property wasn't a property of the store, forward it as a getter of the data store
      },
    }
  );

  return [proxy, setData];
}

export { useForm as default, useForm };
