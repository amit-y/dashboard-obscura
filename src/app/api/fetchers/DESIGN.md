# Generic and Modular Data Fetcher Design

This document outlines the design for a generic and modular system of data fetchers, reflecting the final implementation.

## 1. Directory Structure

All fetcher-related API routes reside within the `src/app/api/fetchers/` directory.
Each data type has its own subdirectory:

```
src/app/api/fetchers/
├── DESIGN.md
├── json/
│   └── route.js  // Handles JSON data fetching
├── xml/
│   └── route.js   // Handles XML data fetching
└── rdf/
    └── route.js   // Handles RDF data fetching
```

## 2. Common Request Body Structure

All fetcher API routes (`/api/fetchers/<type>`) expect a POST request with a JSON body. The general structure is:

```json
{
  "apiUrl": "string", // Required: The URL of the external API to fetch data from.
  "method": "string", // Optional: HTTP method (e.g., "GET", "POST", "PUT"). Defaults to "GET".
  "headers": {        // Optional: Key-value pairs for custom HTTP headers.
    "Key": "Value"
  },
  "body": "any",      // Optional: Request body for methods like POST or PUT.
                      // For JSON, can be an object. For XML/RDF, should be a pre-stringified string.
  "dataType": "string", // Required: Specifies the expected data type from the external API.
                        // Must match the endpoint type: "json", "xml", or "rdf".
  "authentication": { // Optional: Details for authenticating with the external API.
    "type": "string",   // Required if "authentication" object is present.
                        // Supported types: "apiKey", "bearerToken", "basicAuth".
    "credentials": {    // Required if "authentication" object is present.
                        // Structure depends on "type".
    }
  },
  // Data-type specific options:
  "xmlParserOptions": {}, // Optional (for dataType="xml"): Options for 'fast-xml-parser'.
                          // Example: { "ignoreAttributes": false, "attributeNamePrefix": "@_" }
  "rdf": {                // Optional (for dataType="rdf"): Options for RDF parsing.
    "contentType": "string", // Optional: Override the Content-Type for RDF parsing
                             // (e.g., "text/turtle", "application/rdf+xml").
    "baseIRI": "string"      // Optional: Base IRI for resolving relative IRIs in RDF data.
  }
}
```

### Authentication Credentials Structure:

*   **For `type: "apiKey"`:**
    ```json
    "credentials": {
      "key": "string",        // Required: The API key value.
      "headerName": "string", // Required: The name of the HTTP header to place the key in.
                                // (e.g., "X-API-Key", "Authorization")
      "prefix": "string"      // Optional: A prefix for the key in the header.
                                // (e.g., "ApiKey ", "Bearer ") - note the trailing space if needed.
    }
    ```
    *Note: The implementation currently only supports API keys in headers. Query parameter support was initially considered but not implemented in the final version for simplicity.*

*   **For `type: "bearerToken"`:**
    ```json
    "credentials": {
      "token": "string" // Required: The bearer token.
    }
    ```
    *(This will set the `Authorization: Bearer <token>` header).*

*   **For `type: "basicAuth"`:**
    ```json
    "credentials": {
      "username": "string", // Required: The username.
      "password": "string"  // Required: The password.
    }
    ```
    *(This will set the `Authorization: Basic <base64_encoded_credentials>` header).*


### Examples:

**JSON Fetcher Example:**
```json
{
  "apiUrl": "https://api.example.com/data.json",
  "dataType": "json",
  "method": "GET",
  "authentication": {
    "type": "bearerToken",
    "credentials": {
      "token": "your-secret-token"
    }
  }
}
```

**XML Fetcher Example:**
```json
{
  "apiUrl": "https://api.example.com/data.xml",
  "dataType": "xml",
  "xmlParserOptions": {
    "ignoreAttributes": true
  }
}
```

**RDF Fetcher Example (fetching Turtle data):**
```json
{
  "apiUrl": "https://ontology.example.org/data.ttl",
  "dataType": "rdf",
  "rdf": {
    "contentType": "text/turtle", // Explicitly state content type if server might not send it
    "baseIRI": "https://ontology.example.org/"
  }
}
```

## 3. Response Structure

*   **Success Response (HTTP 200 OK):**
    ```json
    {
      "success": true,
      "data": "<parsed_data>" // Parsed data (JSON object, object from XML, or array of RDF quads)
    }
    ```

*   **Error Response (HTTP 4xx or 5xx):**
    ```json
    {
      "success": false,
      "error": "A descriptive error message.",
      "details": "object|string" // Optional: Further details or the original error message/stack.
                                 // For external API errors, this often includes
                                 // { originalStatus, originalStatusText, originalBody }.
    }
    ```

## 4. Data Type Specifics

*   **JSON (`json/route.js`)**:
    *   Parses the external API response using `response.json()`.
    *   If sending a JSON body via POST/PUT/PATCH, it can be a JavaScript object (will be stringified) if `Content-Type` request header is `application/json`.

*   **XML (`xml/route.js`)**:
    *   Uses `fast-xml-parser` (specifically `XMLValidator` and `XMLParser`) to parse the XML response text into a JavaScript object.
    *   `xmlParserOptions` can be passed in the request to customize parsing behavior.
    *   **Sending XML in Request Body**: If you need to POST/PUT XML, provide the XML as a pre-stringified string in the `body` field of the request, and set the `Content-Type` header to `application/xml` (or appropriate XML type) in the `headers` field.

*   **RDF (`rdf/route.js`)**:
    *   Uses `rdf-parse`, `streamify-string`, and `arrayify-stream`. The external API response text is streamed and parsed into an array of RDF quad objects.
    *   **Content Type Handling**: The `contentType` for parsing is determined in this order:
        1.  `rdf.contentType` from the request body.
        2.  `Content-Type` header from the external API's response.
        3.  If neither is available, `rdf-parse` attempts auto-detection (a warning is logged).
    *   `rdf.baseIRI` can be provided to resolve relative IRIs.
    *   **Supported Formats**: `rdf-parse` supports common RDF serializations like Turtle (`text/turtle`), RDF/XML (`application/rdf+xml`), JSON-LD (`application/ld+json`), N-Triples (`application/n-triples`), N-Quads (`application/n-quads`), and others. The correct `Content-Type` is crucial.
    *   **Sending RDF in Request Body**: If you need to POST/PUT RDF, provide it as a pre-stringified string in the `body` field, and set the `Content-Type` header appropriately (e.g., `text/turtle`) in the `headers` field.

## 5. Error Handling Strategy

The fetchers implement the following error handling:

*   **Invalid JSON in Request Body (HTTP 400)**: If the POST request body to the fetcher itself is not valid JSON.
    *   `{ "success": false, "error": "Invalid JSON in request body.", "details": "<parse_error_message>" }`
*   **Input Validation Errors (HTTP 400)**: Missing or invalid required fields like `apiUrl`, `dataType`, or malformed `authentication` object.
    *   `{ "success": false, "error": "<specific_validation_message>" }`
*   **Unsupported Authentication Type (HTTP 400)**.
*   **Server-Side Configuration Issues (HTTP 500)**: e.g., if a required parsing library (like `rdf-parse`) is not correctly initialized.
*   **External API Network Error (HTTP 502)**: If `fetch` fails to reach the `apiUrl`.
    *   `{ "success": false, "error": "External API request failed (network error).", "details": "<network_error_message>" }`
*   **External API Non-OK Response (HTTP 502 for general errors, or specific 401/403 for auth failures from external API)**:
    *   General: `{ "success": false, "error": "External API request failed.", "details": { "originalStatus": ..., "originalStatusText": ..., "originalBody": ... } }`
    *   Auth: `{ "success": false, "error": "Authentication failed with external API.", "details": { ... } }` (propagates 401/403 as the response status from our fetcher)
*   **Data Parsing Errors (HTTP 422 - Unprocessable Entity)**: If the data from the external API cannot be parsed as the specified `dataType` (e.g., malformed JSON, XML, or RDF).
    *   JSON: `{ "success": false, "error": "Failed to parse JSON response...", "details": "<json_parse_error>" }`
    *   XML: `{ "success": false, "error": "Failed to validate/parse XML response...", "details": "<xml_parse_error_details>" }`
    *   RDF: `{ "success": false, "error": "Failed to parse RDF response...", "details": "<rdf_parse_error_stack>" }`
*   **Internal Fetcher Errors (HTTP 500)**: Other unexpected errors within the fetcher logic (e.g., failure to read response text before parsing).

## 6. Notes for Users

*   Ensure the `dataType` field correctly matches the endpoint type (e.g., `/api/fetchers/json` for `dataType: "json"`). The fetcher validates this.
*   When sending data in the `body` for POST/PUT requests to external APIs (especially for XML or RDF), it's recommended to pre-stringify the data and set the appropriate `Content-Type` in the `headers` of the fetcher request. The default `Content-Type` for the request *to the external API* is `application/json` unless overridden by custom headers.
*   The `authentication.apiKey.prefix` should include a trailing space if one is needed between the prefix and the key itself (e.g., "Bearer ").
*   For RDF, providing an accurate `rdf.contentType` or ensuring the external API sends a correct `Content-Type` header is vital for successful parsing.
```
