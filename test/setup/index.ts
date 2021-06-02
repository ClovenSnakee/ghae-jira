import nock from "nock";
import dotenv from "dotenv";
import "./matchers/to-have-sent-metrics";

beforeEach(() => {
  dotenv.config();
  // Assign defaults to process.env, but don't override existing values if they
  // are already set in the environment.
  process.env = {
    ...process.env,
    NODE_ENV: "test",
    APP_URL: "https://test-github-app-instance.com",
    ATLASSIAN_URL: "https://test-atlassian-instance.net",
    HYDRO_BASE_URL: "https://hydro-base-url.com/api/v1/events",
    ATLASSIAN_SECRET: "test-secret",
    // Generated for tests
    HYDRO_APP_SECRET: "2dd220c366ec5b86104efd7324c2d405",
    PRIVATE_KEY_PATH: "./test/setup/test-key.pem",
    GITHUB_CLIENT_SECRET: "test-github-secret",
    LOG_LEVEL: "fatal",
    // Don't worry about this key. It is just for testing.
    STORAGE_SECRET: "8cad66340bc92edbae2ae3a792d351f48c61d1d8efe7b2d9408b0025c1f7f845",
    SETUP: "yes", // indicates that the setup did run
    TRACKING_DISABLED: "true"
  };
});

afterEach(() => {
  nock.isDone(); // Checks to make sure there's no extra HTTP mocks waiting
  nock.cleanAll(); // removes HTTP mocks
  jest.resetAllMocks(); // Removes jest mocks
});
