// Web keeps using the foreground queue; native background APIs are unavailable here.
export async function registerBackgroundSync(): Promise<void> {}
