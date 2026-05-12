// instanceData.js
// Local data service (CONFIG.api.data) — auxiliary lookups served outside the
// primary backend (e.g. timeline cache, regional configs).
import { CONFIG } from "@/config";
import { createHttpClient } from "./createBase";

const BASE_URL = CONFIG.api.data;

export const instanceBaseData = createHttpClient(BASE_URL);
