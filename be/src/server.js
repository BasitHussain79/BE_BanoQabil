import { createApp } from "./app.js";

const PORT = Number(process.env.PORT || 4000);

const server = createApp().listen(PORT, () =>
  console.log(`PORT running on ${PORT}`),
);

process.once("SIGTERM", () => server.close());
