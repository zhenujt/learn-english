self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.registration.unregister(),
      self.clients.claim().then(async () => {
        const rootPath = new URL(self.registration.scope).pathname;
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.all(
          clients
            .filter((client) => new URL(client.url).pathname === rootPath)
            .map((client) => client.navigate(`${rootPath}anki/`)),
        );
      }),
    ]),
  );
});