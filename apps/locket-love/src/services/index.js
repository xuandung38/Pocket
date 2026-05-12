// Public surface for @/services.
//
// Phase 2: auth flows (login/logout/refresh, getUserLocket).
// Phase 3: friend graph, moments, fetch, action-moments.
// Phase 6: chat + socket realtime. socket-service is intentionally NOT
//          re-exported here — its lifecycle is module-scoped (singleton),
//          consumers import from "@/services/socket-service" directly to make
//          the side-effectful intent obvious at call sites.
// Phase 7: friend-request flow aliases + findFriendByUserName (request-services).
export * from "./auth-services";
export * from "./friend-services";
export * from "./request-services";
export * from "./moment-services";
export * from "./fetch-services";
export * from "./action-moments";
export * from "./chat-services";
