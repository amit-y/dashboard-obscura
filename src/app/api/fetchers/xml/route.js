import { NextResponse } from "next/server";
import { XMLParser, XMLValidator } from "fast-xml-parser";

// Helper function to create standardized error responses
function errorResponse(message, status = 500, details = null) {
  const responseBody = { success: false, error: message };
  if (details) {
    responseBody.details = details;
  }
  return NextResponse.json(responseBody, { status });
}

export async function POST(request) {
  let requestData;
  try {
    requestData = await request.json();
  } catch (e) {
    return errorResponse("Invalid JSON in request body.", 400, e.message);
  }

  const {
    apiUrl,
    authentication,
    dataType,
    method = "GET", // Default to GET
    headers: customHeaders = {},
    body: requestBody,
    // XML specific options for fast-xml-parser
    xmlParserOptions = {} // e.g., { ignoreAttributes: false, attributeNamePrefix: "@_" }
  } = requestData;

  // 1. Input Validation
  if (!apiUrl) {
    return errorResponse("Missing 'apiUrl' in request body.", 400);
  }
  if (!dataType) {
    return errorResponse("Missing 'dataType' in request body.", 400);
  }
  if (dataType !== "xml") {
    return errorResponse(`Invalid 'dataType'. Expected 'xml', got '${dataType}'.`, 400);
  }

  // Prepare fetch options
  const fetchOptions = {
    method,
    headers: {
      // For XML, we might expect 'application/xml' or 'text/xml'.
      // However, Content-Type for the request being SENT might still be JSON if `requestBody` is an object.
      // The external API's Content-Type in RESPONSE is what matters for parsing.
      // Let user override via customHeaders if needed for the request.
      "Content-Type": "application/json",
      ...customHeaders,
    },
  };

  // 2. Authentication - This section remains identical to the JSON fetcher
  if (authentication) {
    const { type, credentials } = authentication;
    if (!type || !credentials) {
      return errorResponse("Invalid 'authentication' object. Missing 'type' or 'credentials'.", 400);
    }

    try {
      switch (type) {
        case "apiKey":
          if (!credentials.key || !credentials.headerName) {
            return errorResponse("Invalid 'apiKey' credentials. Missing 'key' or 'headerName'.", 400);
          }
          const prefix = credentials.prefix ? credentials.prefix : "";
          fetchOptions.headers[credentials.headerName] = `${prefix}${credentials.key}`;
          break;
        case "bearerToken":
          if (!credentials.token) {
            return errorResponse("Invalid 'bearerToken' credentials. Missing 'token'.", 400);
          }
          fetchOptions.headers["Authorization"] = `Bearer ${credentials.token}`;
          break;
        case "basicAuth":
          if (!credentials.username || typeof credentials.password === 'undefined') {
            return errorResponse("Invalid 'basicAuth' credentials. Missing 'username' or 'password'.", 400);
          }
          fetchOptions.headers["Authorization"] = `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString("base64")}`;
          break;
        default:
          return errorResponse(`Unsupported authentication type: '${type}'.`, 400);
      }
    } catch (authError) {
        console.error("Authentication setup error:", authError);
        return errorResponse("Failed to configure authentication.", 500, authError.message);
    }
  }

  // Add body for methods that support it
  // If the user intends to send XML in the body, they should set Content-Type header to application/xml
  // and provide requestBody as a string.
  if (requestBody && (method === "POST" || method === "PUT" || method === "PATCH")) {
    if (typeof requestBody === 'string') {
        fetchOptions.body = requestBody;
    } else if (fetchOptions.headers['Content-Type'] && fetchOptions.headers['Content-Type'].toLowerCase().includes('json')) {
        // If Content-Type is JSON (default or user-set), stringify the object.
        try {
            fetchOptions.body = JSON.stringify(requestBody);
        } catch (stringifyError) {
            return errorResponse("Failed to stringify JSON request body.", 400, stringifyError.message);
        }
    } else {
        // For other content types (like XML) where body is an object, this is ambiguous.
        // We'll forbid it for now to avoid unexpected behavior. User should pre-stringify.
        return errorResponse("Request body must be a string for non-JSON content types, or if 'Content-Type' is not 'application/json'.", 400);
    }
  }


  // 3. Make the HTTP request to the external API
  let externalApiResponse;
  try {
    externalApiResponse = await fetch(apiUrl, fetchOptions);
  } catch (networkError) {
    console.error("External API request failed (network error):", networkError);
    return errorResponse(
      "External API request failed (network error).",
      502,
      networkError.message
    );
  }

  // Check if the external API responded successfully
  if (!externalApiResponse.ok) {
    let errorBody = null;
    try {
        errorBody = await externalApiResponse.text(); // Get text for any error type
    } catch (e) { /* Ignore */ }

    console.error(`External API error: ${externalApiResponse.status} ${externalApiResponse.statusText}`, errorBody);
    if (externalApiResponse.status === 401 || externalApiResponse.status === 403) {
         return errorResponse(
            "Authentication failed with external API.",
            externalApiResponse.status,
            { originalStatus: externalApiResponse.status, originalStatusText: externalApiResponse.statusText, originalBody: errorBody }
        );
    }
    return errorResponse(
      "External API request failed.",
      502,
      { originalStatus: externalApiResponse.status, originalStatusText: externalApiResponse.statusText, originalBody: errorBody }
    );
  }

  // 4. Fetching the response as text for XML parsing
  let xmlText;
  try {
    xmlText = await externalApiResponse.text();
  } catch (textError) {
    console.error("Failed to read text response from external API:", textError);
    return errorResponse(
      "Failed to read text response from external API for XML parsing.",
      500,
      textError.message
    );
  }

  // 5. Parsing the XML response
  let parsedXmlData;
  try {
    // Validate XML structure before parsing
    const validationResult = XMLValidator.validate(xmlText);
    if (validationResult !== true) {
        console.error("XML validation failed:", validationResult.err);
        return errorResponse(
            "Failed to validate XML response: Malformed XML.",
            422, // Unprocessable Entity
            validationResult.err
        );
    }
    // Options can be passed to the parser, e.g., to control attribute handling
    const parser = new XMLParser(xmlParserOptions);
    parsedXmlData = parser.parse(xmlText);
  } catch (parsingError) {
    console.error("Failed to parse XML response from external API:", parsingError);
    return errorResponse(
      "Failed to parse XML response from external API.",
      422, // Unprocessable Entity
      parsingError.message
    );
  }

  // 6. Returning the parsed XML data (now a JavaScript object)
  return NextResponse.json({ success: true, data: parsedXmlData });
}
