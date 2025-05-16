import { NextResponse } from "next/server";

import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OAI_KEY,
});

const ASSISTANT_ID = process.env.ASSISTANT_ID;

export async function POST(request) {
  if (!openai || !ASSISTANT_ID)
    return NextResponse.json(
      { success: false },
      { status: 500, statusText: "NO_INIT" },
    );

  const { message } = await request?.json?.();
  if (!message)
    return NextResponse.json(
      { success: false },
      { status: 500, statusText: "NO_INPUT" },
    );

  const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);

  const thread = await openai.beta.threads.create();

  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: message,
  });

  let run = await openai.beta.threads.runs.createAndPoll(thread.id, {
    assistant_id: assistant.id,
  });

  if (run.status === "completed") {
    const messages = await openai.beta.threads.messages.list(run.thread_id);

    const data = messages?.data
      ?.reverse?.()
      ?.map(({ role, content = [] } = {}) => ({
        role,
        content: content[0]?.text?.value,
      }));
    return NextResponse.json({ data });
  } else {
    return NextResponse.json({ status: run.status });
  }
}
