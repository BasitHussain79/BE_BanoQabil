import express from "express";

export function createApp() {
  const app = express();

  /**
   * GET, POST, PUT, PATCH, DELETE
   */
  app.get("/health", (req, res) => res.json({ status: "OK" }));

  app.use((req, res) => res.status(404).json({ error: "Route not found" }));

  return app;
}
