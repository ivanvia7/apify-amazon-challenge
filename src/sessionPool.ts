import { SessionPool } from "crawlee";

export const sessionPool = await SessionPool.open({
    maxPoolSize: 25,
    sessionOptions: {
        maxUsageCount: 5,
    },
    persistStateKeyValueStoreId: "my-key-value-store-for-sessions",
    persistStateKey: "my-session-pool",
});
