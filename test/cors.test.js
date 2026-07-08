const test = require("node:test");
const assert = require("node:assert/strict");

const resetModules = () => {
  delete require.cache[require.resolve("../src/app")];
  delete require.cache[require.resolve("../src/config/env")];
};

test("allows localhost frontend origin for CORS preflight", async () => {
  process.env.DB_HOST = process.env.DB_HOST || "localhost";
  process.env.DB_USER = process.env.DB_USER || "root";
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || "";
  process.env.DB_NAME = process.env.DB_NAME || "test";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  delete process.env.FRONTEND_URLS;

  resetModules();
  const app = require("../src/app");
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    const address = server.address();
    const response = await fetch(`http://127.0.0.1:${address.port}/api/properties`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:5173",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "content-type",
      },
    });

    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetModules();
  }
});
