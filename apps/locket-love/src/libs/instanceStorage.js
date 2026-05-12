// instanceStorage.js
// Storage service client (CONFIG.api.storage) — media upload + CDN proxy ops.
import { CONFIG } from "@/config";
import { createHttpClient } from "./createBase";

const BASE_URL = CONFIG.api.storage;

export const instanceBaseStorage = createHttpClient(BASE_URL);
