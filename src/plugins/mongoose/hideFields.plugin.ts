import { Schema } from "mongoose";

export default function hideFieldsPlugin(
  schema: Schema,
  fields: string[] = []
) {
  // Default fields to hide
  const defaultHidden = [
    "__v",
    "password",
    "oneTimeCode",
    "oneTimeCodeExpires",
  ];
  const hiddenFields = [...new Set([...defaultHidden, ...fields])];

  function transform(_: any, ret: any) {
    if (ret._id) ret.id = ret._id.toString();
    // delete ret._id;
    hiddenFields.forEach((path) => {
      const parts = path.split(".");
      const last = parts.pop();
      let current = ret;
      for (const p of parts) {
        if (!current[p]) return; // path doesn't exist → stop
        current = current[p];
      }

      if (last && current[last] !== undefined) {
        delete current[last];
      }
    });

    return ret;
  }

  schema.set("toJSON", { virtuals: true, transform });
  schema.set("toObject", { virtuals: true, transform });
}
