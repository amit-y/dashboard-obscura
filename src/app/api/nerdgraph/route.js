import { NextResponse } from "next/server";

const ACCOUNT_ID = process.env.ACCOUNT_ID;
const NR_USER_KEY = process.env.NR_USER_KEY;

const query = (visualizations) => `{
  actor {
    ${visualizations.map(
      ({ query }, i) => `
    v${i}: nrql(accounts: [${ACCOUNT_ID}], query: "${query}") {
      results
    }`,
    )}
  }
}`;

export async function POST(request) {
  if (!ACCOUNT_ID || !NR_USER_KEY)
    return NextResponse.json(
      { success: false },
      { status: 500, statusText: "NO_INIT" },
    );

  const { visualizations } = await request?.json?.();
  if (!visualizations)
    return NextResponse.json(
      { success: false },
      { status: 500, statusText: "NO_INPUT" },
    );

  const response = await fetch("https://api.newrelic.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "API-Key": NR_USER_KEY,
    },
    body: JSON.stringify({ query: query(visualizations) }),
  });

  if (response.ok) {
    const json = await response?.json?.();
    return NextResponse.json({ json });
  } else {
    return NextResponse.json(
      {},
      { status: response.status, statusText: response.statusText },
    );
  }
}
