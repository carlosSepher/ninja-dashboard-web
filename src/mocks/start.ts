export async function enableMocking() {
  if (typeof window === "undefined") return;
  const enable = import.meta.env.VITE_ENABLE_MSW === "true";

  if (!enable) {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations
          .filter((registration) => registration.active?.scriptURL.includes("mockServiceWorker"))
          .map((registration) => registration.unregister()),
      );
    }
    return;
  }

  const { worker } = await import("@/mocks/browser");
  await worker.start({
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
    onUnhandledRequest: "bypass",
  });
}
