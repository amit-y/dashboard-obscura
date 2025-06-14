import { NextResponse } from "next/server";

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
  } = requestData;

  // 1. Input Validation
  if (!apiUrl) {
    return errorResponse("Missing 'apiUrl' in request body.", 400);
  }
  if (!dataType) {
    return errorResponse("Missing 'dataType' in request body.", 400);
  }
  if (dataType !== "json") {
    return errorResponse(`Invalid 'dataType'. Expected 'json', got '${dataType}'.`, 400);
  }

  // Prepare fetch options
  const fetchOptions = {
    method,
    headers: {
      "Content-Type": "application/json", // Default, can be overridden by customHeaders
      ...customHeaders, // User-provided headers can override defaults
    },
  };

  // 2. Authentication
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
          // btoa is not available in Node.js runtime by default on Next.js Edge/serverless
          // Using Buffer for broader compatibility.
          fetchOptions.headers["Authorization"] = `Basic ${Buffer.from(
            `${credentials.username}:${credentials.password}`
          ).toString("base64")}`;
          break;
        // case "oauth2": // Placeholder for future OAuth2 implementation
        //   return errorResponse("'oauth2' authentication is not yet implemented.", 501);
        default:
          return errorResponse(`Unsupported authentication type: '${type}'.`, 400);
      }
    } catch (authError) {
        console.error("Authentication setup error:", authError);
        return errorResponse("Failed to configure authentication.", 500, authError.message);
    }
  }

  // Add body for methods that support it
  if (requestBody && (method === "POST" || method === "PUT" || method === "PATCH")) {
    try {
        // If body is already a string, use it directly. Otherwise, stringify.
        fetchOptions.body = typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody);
    } catch (stringifyError) {
        return errorResponse("Failed to stringify request body.", 400, stringifyError.message);
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
      502, // Bad Gateway, indicates an issue with an upstream server
      networkError.message
    );
  }

  // Check if the external API responded successfully
  if (!externalApiResponse.ok) {
    let errorBody = null;
    try {
        // Try to get more details from the external API's response body
        errorBody = await externalApiResponse.text();
    } catch (e) {
        // Ignore if reading body fails
    }
    console.error(`External API error: ${externalApiResponse.status} ${externalApiResponse.statusText}`, errorBody);
    // Determine if it's an authentication error based on status codes
    if (externalApiResponse.status === 401 || externalApiResponse.status === 403) {
         return errorResponse(
            "Authentication failed with external API.",
            externalApiResponse.status, // 401 or 403
            {
                originalStatus: externalApiResponse.status,
                originalStatusText: externalApiResponse.statusText,
                originalBody: errorBody
            }
        );
    }
    return errorResponse(
      "External API request failed.",
      502, // Bad Gateway
      {
        originalStatus: externalApiResponse.status,
        originalStatusText: externalApiResponse.statusText,
        originalBody: errorBody
      }
    );
  }

  // 4. Parsing the JSON response
  let jsonData;
  try {
    jsonData = await externalApiResponse.json();
  } catch (parsingError) {
    console.error("Failed to parse JSON response from external API:", parsingError);
    return errorResponse(
      "Failed to parse JSON response from external API.",
      422, // Unprocessable Entity
      parsingError.message
    );
  }

  // 5. Returning the parsed JSON data
  return NextResponse.json({ success: true, data: jsonData });
}
