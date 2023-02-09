/* eslint-disable import/prefer-default-export */
import { camelCase, isArray, transform, isObject } from "lodash";

/** Recursively transforms all object keys into camelCase. */
export const camelize = (
  obj: Record<string, unknown>
): Record<string, unknown> =>
  transform(
    obj,
    (
      result: Record<string, unknown>,
      value: unknown,
      key: string,
      target: unknown
    ) => {
      const camelKey = isArray(target) ? key : camelCase(key);
      // eslint-disable-next-line no-param-reassign
      result[camelKey] = isObject(value)
        ? camelize(value as Record<string, unknown>)
        : value;
    }
  );
