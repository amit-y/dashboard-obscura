// Polyfill fetch globally if needed (whatwg-fetch was installed)
// However, jest-fetch-mock often handles this or modern Node environments for Jest might have it.
// import 'whatwg-fetch'; // Uncomment if you face 'fetch is not defined' errors.

// Import and setup jest-fetch-mock
const fetchMock = require("jest-fetch-mock");
fetchMock.enableMocks();

// Mock NextResponse.json
jest.mock('next/server', () => {
  const actualNextServer = jest.requireActual('next/server');
  return {
    ...actualNextServer,
    NextResponse: {
      ...actualNextServer.NextResponse,
      json: jest.fn((body, init) => {
        // This mock should return an object that behaves like a Response object
        // specifically, it needs a json() method that returns a Promise resolving to the body,
        // and a status property.
        return {
          json: async () => body, // The body is already an object, so just return it
          status: init?.status || 200,
          ok: (init?.status || 200) >= 200 && (init?.status || 200) < 300,
          headers: new Headers(init?.headers),
          text: async () => JSON.stringify(body), // Add text() method as well
        };
      }),
    },
  };
});

// Any other global setups can go here.
// For example, if you need to mock environment variables for tests:
// process.env.MY_ENV_VAR = 'test_value';
