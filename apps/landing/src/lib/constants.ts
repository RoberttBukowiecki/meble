import { APP_NAME } from "@meble/constants";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const THEME_STORAGE_KEY = `${slugify(APP_NAME)}-theme`;
