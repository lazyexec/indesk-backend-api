/**
 * Creates an object composed of the picked object properties.
 *
 * @template T The type of the source object.
 * @template K The union of keys to pick from the source object.
 * @param {T} object The source object.
 * @param {K[]} keys The property paths to pick.
 * @returns {Pick<T, K>} A new object with only the specified properties.
 */
const pick = <T extends object, K extends keyof T>(
  object: T,
  keys: K[]
): Pick<T, K> => {
  // The function will return an empty object if:
  // 1. The 'keys' array is empty.
  // 2. None of the keys in the 'keys' array are own properties of the 'object'.
  //    'Object.hasOwn' specifically checks for direct properties, not inherited ones.
  return keys.reduce((obj, key) => {
    if (Object.hasOwn(object, key)) {
      if (key === "sort" && typeof object[key] === "string") {
        const [field, order] = (object[key] as string).split(" ");
        if (field) {
          const parsedOrder =
            parseInt(order as string) || (order === "desc" ? -1 : 1);
          Object.assign(obj, {
            [key]: { [field]: parsedOrder },
          });
        }
      } else {
        obj[key] = object[key];
      }
    }
    return obj;
  }, {} as Pick<T, K>);
};
//ISSUE: Need to fix -1 being removed
export default pick;
