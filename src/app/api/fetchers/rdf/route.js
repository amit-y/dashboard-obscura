import { NextResponse } from "next/server";
import * as RdfParseModule from "rdf-parse";
import streamifyString from "streamify-string";
const arrayifyStreamImport = require("arrayify-stream");

// Helper function to create standardized error responses
function errorResponse(message, status = 500, details = null) {
  const responseBody = { success: false, error: message };
  if (details) {
    responseBody.details = details;
  }
  return NextResponse.json(responseBody, { status });
}

let rdfParserInstance;
if (RdfParseModule && RdfParseModule.rdfParser && typeof RdfParseModule.rdfParser.parse === 'function') {
  rdfParserInstance = RdfParseModule.rdfParser;
} else {
  console.error("Critical: Failed to assign rdfParserInstance for RDF parsing.");
}

let actualUsableArrayifyStream;
// Based on logs: require("arrayify-stream") returns an object { arrayifyStream: [Function] }
if (arrayifyStreamImport && typeof arrayifyStreamImport.arrayifyStream === 'function') {
  actualUsableArrayifyStream = arrayifyStreamImport.arrayifyStream;
  console.log("Using arrayifyStreamImport.arrayifyStream as function");
} else {
  console.error("Critical: Could not determine usable arrayifyStream function from import. Type of import:", typeof arrayifyStreamImport);
  if(arrayifyStreamImport) console.error("Keys:", Object.keys(arrayifyStreamImport));
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
    method = "GET",
    headers: customHeaders = {},
    body: requestBody,
    rdf: rdfOptions = {},
  } = requestData;

  if (!apiUrl) return errorResponse("Missing 'apiUrl' in request body.", 400);
  if (!dataType) return errorResponse("Missing 'dataType' in request body.", 400);
  if (dataType !== "rdf") return errorResponse(`Invalid 'dataType'. Expected 'rdf', got '${dataType}'.`, 400);
  if (!rdfParserInstance) return errorResponse("RDF parser instance not available.", 500);
  if (typeof actualUsableArrayifyStream !== 'function') return errorResponse("actualUsableArrayifyStream function not available.", 500);


  const fetchOptions = { method, headers: { "Content-Type": "application/json", ...customHeaders }};

  if (authentication) {
    const { type, credentials } = authentication;
    if (!type || !credentials) return errorResponse("Invalid 'authentication' object.", 400);
    try {
      switch (type) {
        case "apiKey":
          if (!credentials.key || !credentials.headerName) return errorResponse("Invalid 'apiKey' credentials.", 400);
          fetchOptions.headers[credentials.headerName] = `${credentials.prefix || ""}${credentials.key}`;
          break;
        case "bearerToken":
          if (!credentials.token) return errorResponse("Invalid 'bearerToken' credentials.", 400);
          fetchOptions.headers["Authorization"] = `Bearer ${credentials.token}`;
          break;
        case "basicAuth":
          if (!credentials.username || typeof credentials.password === 'undefined') return errorResponse("Invalid 'basicAuth' credentials.", 400);
          fetchOptions.headers["Authorization"] = `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64")}`;
          break;
        default: return errorResponse(`Unsupported authentication type: '${type}'.`, 400);
      }
    } catch (authError) {
      console.error("Authentication setup error:", authError);
      return errorResponse("Failed to configure authentication.", 500, authError.message);
    }
  }

  if (requestBody && (method === "POST" || method === "PUT" || method === "PATCH")) {
    if (typeof requestBody === 'string') {
      fetchOptions.body = requestBody;
    } else if (fetchOptions.headers['Content-Type']?.toLowerCase().includes('json')) {
      try { fetchOptions.body = JSON.stringify(requestBody); }
      catch (stringifyError) { return errorResponse("Failed to stringify JSON request body.", 400, stringifyError.message); }
    } else {
      return errorResponse("Request body must be a string for non-JSON content types or if 'Content-Type' is not 'application/json'.", 400);
    }
  }

  let externalApiResponse;
  try {
    externalApiResponse = await fetch(apiUrl, fetchOptions);
  } catch (networkError) {
    console.error("External API request failed (network error):", networkError);
    return errorResponse("External API request failed (network error).", 502, networkError.message);
  }

  if (!externalApiResponse.ok) {
    let errorBody = null;
    try { errorBody = await externalApiResponse.text(); } catch (e) { /* Ignore */ }
    console.error(`External API error: ${externalApiResponse.status} ${externalApiResponse.statusText}`, errorBody);
    const status = (externalApiResponse.status === 401 || externalApiResponse.status === 403) ? externalApiResponse.status : 502;
    const message = status === 502 ? "External API request failed." : "Authentication failed with external API.";
    return errorResponse(message, status, { originalStatus: externalApiResponse.status, originalStatusText: externalApiResponse.statusText, originalBody: errorBody });
  }

  let rdfText;
  try {
    rdfText = await externalApiResponse.text();
  } catch (textError) {
    console.error("Failed to read text response from external API:", textError);
    return errorResponse("Failed to read text response from external API for RDF parsing.", 500, textError.message);
  }

  let rdfQuadsArray;
  try {
    const rdfStream = streamifyString(rdfText);
    const contentType = rdfOptions?.contentType || externalApiResponse.headers.get("content-type") || undefined;
    if (!contentType) {
      console.warn("Content-Type for RDF parsing is not explicitly set and not found in response headers. rdf-parse will attempt auto-detection.");
    }
    const parseOptions = { contentType, baseIRI: rdfOptions?.baseIRI };

    rdfQuadsArray = await new Promise((resolve, reject) => {
      const quadStream = rdfParserInstance.parse(rdfStream, parseOptions);
      quadStream.on('error', (error) => {
        console.error("Error event on quadStream:", error.message);
        reject(error);
      });
      actualUsableArrayifyStream(quadStream).then(resolve).catch(reject);
    });

  } catch (parsingError) {
    console.error("Failed to parse RDF response from external API (caught promise rejection):", parsingError.message);
    return errorResponse(
      `Failed to parse RDF response from external API: ${parsingError.message}`,
      422,
      parsingError.stack
    );
  }

  return NextResponse.json({ success: true, data: rdfQuadsArray });
}
