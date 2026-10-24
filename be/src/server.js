import mongoose from "mongoose";
import { createApp } from "./app.js";
import { adapters } from "./config/adapter.js";
import { loadEnv } from "./config/env.js";

const config = loadEnv();

try {
  await mongoose.connect(config.mongoUri);
  console.log("MongoDB connected");
} catch (err) {
  console.log(err.message);
}

const server = createApp({ config, ...adapters() }).listen(config.port, () =>
  console.log(`Marketplace listening on ${config.port}`),
);

for (const signal of ["SIGINT", "SIGTERM"])
  process.once(signal, () => {
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
