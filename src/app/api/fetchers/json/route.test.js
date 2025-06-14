import { POST } from "./route"; // Assuming your handler is exported as POST
import { NextResponse } from "next/server"; // To check response instance if needed, and for status codes

// Mock NextRequest and its json() method for simulating requests
const mockRequest = (body, headers = {}) => ({
  json: async () => body,
  headers: new Headers(headers), // Use Headers class for consistency
});

describe("API Route: /api/fetchers/json", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
    // Reset any environment variables if they were mocked for specific tests
    // e.g. delete process.env.SOME_KEY;
  });

  describe("Successful JSON Fetching", () => {
    it("should fetch JSON data with a GET request successfully", async () => {
      const mockData = { message: "Success!" };
      fetchMock.mockResponseOnce(JSON.stringify(mockData));

      const request = mockRequest({
        apiUrl: "https://api.example.com/data",
        dataType: "json",
        method: "GET",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/data", expect.objectContaining({ method: "GET" }));
      expect(response.status).toBe(200);
      expect(responseBody).toEqual({ success: true, data: mockData });
    });

    it("should fetch JSON data with a POST request successfully", async () => {
      const requestPayload = { key: "value" };
      const mockApiResponse = { received: true, data: requestPayload };
      fetchMock.mockResponseOnce(JSON.stringify(mockApiResponse));

      const request = mockRequest({
        apiUrl: "https://api.example.com/submit",
        dataType: "json",
        method: "POST",
        body: requestPayload,
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/submit", expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestPayload)
      }));
      expect(response.status).toBe(200);
      expect(responseBody).toEqual({ success: true, data: mockApiResponse });
    });
  });

  describe("Authentication", () => {
    it("should include API Key in headers when type is apiKey", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "ok" }));
      const request = mockRequest({
        apiUrl: "https://api.example.com/secure",
        dataType: "json",
        authentication: {
          type: "apiKey",
          credentials: { key: "test-key", headerName: "X-API-KEY" },
        },
      });

      await POST(request);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/secure",
        expect.objectContaining({
          headers: expect.objectContaining({ "X-API-KEY": "test-key" }),
        })
      );
    });

    it("should include API Key in headers with prefix when type is apiKey and prefix is provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "ok" }));
      const request = mockRequest({
        apiUrl: "https://api.example.com/secure",
        dataType: "json",
        authentication: {
          type: "apiKey",
          credentials: { key: "test-key", headerName: "Authorization", prefix: "ApiKey " },
        },
      });

      await POST(request);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/secure",
        expect.objectContaining({
          headers: expect.objectContaining({ "Authorization": "ApiKey test-key" }),
        })
      );
    });

    it("should include Bearer Token in Authorization header when type is bearerToken", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "ok" }));
      const request = mockRequest({
        apiUrl: "https://api.example.com/secure",
        dataType: "json",
        authentication: {
          type: "bearerToken",
          credentials: { token: "test-token" },
        },
      });

      await POST(request);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/secure",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
        })
      );
    });

    it("should include Basic Auth in Authorization header when type is basicAuth", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ data: "ok" }));
      const request = mockRequest({
        apiUrl: "https://api.example.com/secure",
        dataType: "json",
        authentication: {
          type: "basicAuth",
          credentials: { username: "user", password: "pass" },
        },
      });

      await POST(request);
      const expectedAuthHash = Buffer.from("user:pass").toString("base64");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/secure",
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Basic ${expectedAuthHash}` }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("should return 400 if apiUrl is missing", async () => {
      const request = mockRequest({ dataType: "json" });
      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(400);
      expect(responseBody).toEqual({ success: false, error: "Missing 'apiUrl' in request body." });
    });

    it("should return 400 if dataType is missing", async () => {
      const request = mockRequest({ apiUrl: "https://api.example.com/data" });
      const response = await POST(request);
      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody).toEqual({ success: false, error: "Missing 'dataType' in request body." });
    });

    it("should return 400 if dataType is not 'json'", async () => {
        const request = mockRequest({ apiUrl: "https://api.example.com/data", dataType: "xml" });
        const response = await POST(request);
        const responseBody = await response.json();
        expect(response.status).toBe(400);
        expect(responseBody).toEqual({ success: false, error: "Invalid 'dataType'. Expected 'json', got 'xml'." });
    });

    it("should return 502 if external API returns non-2xx status", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: "API Error" }), { status: 500 });
      const request = mockRequest({
        apiUrl: "https://api.example.com/error",
        dataType: "json",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(502);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("External API request failed.");
      expect(responseBody.details.originalStatus).toBe(500);
    });

    it("should return 401 if external API returns 401 (auth failure)", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      const request = mockRequest({
        apiUrl: "https://api.example.com/unauthorized",
        dataType: "json",
        authentication: { type: "bearerToken", credentials: {token: "wrong"}}
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(401);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("Authentication failed with external API.");
      expect(responseBody.details.originalStatus).toBe(401);
    });

    it("should return 422 if external API returns malformed JSON", async () => {
      fetchMock.mockResponseOnce("This is not JSON", {
        headers: { "Content-Type": "application/json" },
      });
      const request = mockRequest({
        apiUrl: "https://api.example.com/malformed",
        dataType: "json",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(422);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("Failed to parse JSON response from external API.");
    });

    it("should return 502 if fetch throws a network error", async () => {
      fetchMock.mockRejectOnce(new Error("Network failure"));
      const request = mockRequest({
        apiUrl: "https://api.example.com/network-error",
        dataType: "json",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(502);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("External API request failed (network error).");
      expect(responseBody.details).toBe("Network failure");
    });

    it("should return 400 for invalid authentication object", async () => {
      const request = mockRequest({
        apiUrl: "https://api.example.com/data",
        dataType: "json",
        authentication: { type: "apiKey" } // Missing credentials
      });
      const response = await POST(request);
      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody.error).toContain("Invalid 'authentication' object");
    });

    it("should return 400 for invalid apiKey credentials", async () => {
      const request = mockRequest({
        apiUrl: "https://api.example.com/data",
        dataType: "json",
        authentication: { type: "apiKey", credentials: { /* key or headerName missing */ } }
      });
      const response = await POST(request);
      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody.error).toContain("Invalid 'apiKey' credentials");
    });
  });
});
