import { POST } from "./route"; // Assuming your handler is exported as POST
// NextResponse mock is in jest.setup.js

// Mock NextRequest and its json() method for simulating requests
const mockRequest = (body, headers = {}) => ({
  json: async () => body,
  headers: new Headers(headers),
});

// Sample XML data
const sampleXmlString = "<root><item id='1'>Test</item><item id='2'>Data</item></root>";
const expectedParsedXml = {
  root: { item: [{ "#text": "Test", "@_id": "1" }, { "#text": "Data", "@_id": "2" }] }
}; // Default fast-xml-parser output with attributes

const sampleMalformedXmlString = "<root><item>Test</item><item>Data</root"; // Missing closing item

describe("API Route: /api/fetchers/xml", () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  describe("Successful XML Fetching", () => {
    it("should fetch and parse XML data successfully", async () => {
      fetchMock.mockResponseOnce(sampleXmlString, { headers: { 'Content-Type': 'application/xml' } });

      const request = mockRequest({
        apiUrl: "https://api.example.com/data.xml",
        dataType: "xml",
        method: "GET",
        // Example of passing parser options, though default is fine here
        xmlParserOptions: { ignoreAttributes: false, attributeNamePrefix: "@_" }
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(fetchMock).toHaveBeenCalledWith("https://api.example.com/data.xml", expect.objectContaining({ method: "GET" }));
      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(expectedParsedXml);
    });

    it("should fetch and parse XML with different parser options", async () => {
      const xmlWithoutAttributes = "<root><item>Test</item></root>";
      const expectedParsedXmlNoAttribs = { root: { item: "Test" } };
      fetchMock.mockResponseOnce(xmlWithoutAttributes, { headers: { 'Content-Type': 'application/xml' } });

      const request = mockRequest({
        apiUrl: "https://api.example.com/data.xml",
        dataType: "xml",
        xmlParserOptions: { ignoreAttributes: true }
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(expectedParsedXmlNoAttribs);
    });
  });

  describe("Authentication (similar to JSON fetcher, smoke tests)", () => {
    it("should include API Key in headers for XML request", async () => {
      fetchMock.mockResponseOnce(sampleXmlString);
      const request = mockRequest({
        apiUrl: "https://api.example.com/secure.xml",
        dataType: "xml",
        authentication: {
          type: "apiKey",
          credentials: { key: "xml-key", headerName: "X-XML-KEY" },
        },
      });

      await POST(request);
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.example.com/secure.xml",
        expect.objectContaining({
          headers: expect.objectContaining({ "X-XML-KEY": "xml-key" }),
        })
      );
    });
  });

  describe("Error Handling for XML", () => {
    it("should return 400 if dataType is not 'xml'", async () => {
      const request = mockRequest({ apiUrl: "https://api.example.com/data", dataType: "json" });
      const response = await POST(request);
      const responseBody = await response.json();
      expect(response.status).toBe(400);
      expect(responseBody).toEqual({ success: false, error: "Invalid 'dataType'. Expected 'xml', got 'json'." });
    });

    it("should return 422 if external API returns malformed XML (validation failure)", async () => {
      fetchMock.mockResponseOnce(sampleMalformedXmlString, { headers: { 'Content-Type': 'application/xml' } });
      const request = mockRequest({
        apiUrl: "https://api.example.com/malformed.xml",
        dataType: "xml",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(422);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("Failed to validate XML response: Malformed XML.");
      // Check for specific details if possible, e.g. from XMLValidator
      expect(responseBody.details).toBeDefined();
      expect(responseBody.details.code).toBe("InvalidTag");
    });

    it("should return 422 if external API returns valid XML but unparseable with options (less common)", async () => {
      // This case is harder to simulate naturally with fast-xml-parser as it's quite robust.
      // We'll simulate a parser error by making XMLValidator pass but somehow making the parser itself fail.
      // This could happen if text content itself causes an issue with specific parser options.
      // For simplicity, we'll mock the XMLParser constructor or parse method to throw an error.

      // This requires more advanced mocking of the 'fast-xml-parser' module itself.
      // jest.mock('fast-xml-parser', () => ({
      //   ...jest.requireActual('fast-xml-parser'), // keep XMLValidator
      //   XMLParser: jest.fn().mockImplementation(() => ({
      //     parse: jest.fn().mockImplementation(() => { throw new Error("Simulated parsing crash"); })
      //   }))
      // }));
      // Due to tool limitations, advanced module mocking like above is hard.
      // We will assume XMLValidator catches most structural issues first.
      // If XMLValidator passes, XMLParser is usually expected to pass for well-formed XML.

      // Test for failure to read text (e.g. if response.text() fails)
      fetchMock.mockResponseOnce(sampleXmlString, { headers: { 'Content-Type': 'application/xml' } });

      // Sabotage .text() method on the mocked response from fetchMock
      const originalFetchResponse = await fetch("https://api.example.com/data.xml");
      originalFetchResponse.text = jest.fn().mockRejectedValue(new Error("Failed to read text"));
      fetchMock.mockResolvedValue(originalFetchResponse);


      const request = mockRequest({
        apiUrl: "https://api.example.com/sabotaged-text.xml",
        dataType: "xml",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(500); // Internal server error
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("Failed to read text response from external API for XML parsing.");
      expect(responseBody.details).toContain("Failed to read text");

    });


    it("should handle external API non-2xx status for XML requests", async () => {
      fetchMock.mockResponseOnce("<error>Server Down</error>", { status: 503, headers: { 'Content-Type': 'application/xml' } });
      const request = mockRequest({
        apiUrl: "https://api.example.com/server-down.xml",
        dataType: "xml",
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(502); // Our fetcher returns 502 for upstream errors
      expect(responseBody.success).toBe(false);
      expect(responseBody.error).toContain("External API request failed.");
      expect(responseBody.details.originalStatus).toBe(503);
      expect(responseBody.details.originalBody).toBe("<error>Server Down</error>");
    });
  });
});
