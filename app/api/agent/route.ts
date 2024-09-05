import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createToolCallingAgent } from "langchain/agents";
import { AgentExecutor } from "langchain/agents";
import { NextResponse } from "next/server";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import dotenv from "dotenv";

dotenv.config();

export async function GET(req) {
  try {
    const search = new TavilySearchResults({
      maxResults: 2,
      //   apiKey: process.env.TAVILT_API_KEY,
    });

    const magicTool = tool(
      async ({ input }) => {
        return `${input * 10}`;
      },
      {
        name: "magic_function",
        description: "Applies magic function to input",
        schema: z.object({
          input: z.number(),
        }),
      }
    );

    const tools = [search, magicTool];

    const llm = new ChatOpenAI({
      model: "gpt-3.5-turbo-0125",
      maxTokens: 4096,
      //   apiKey: process.env.OPENAI_API_KEY,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      [
        "system",
        "You are a helpful assistant that answers the following questions as best as you can. You have access to the following tools",
      ],
      ["placeholder", "{chat_history}"],
      ["human", "{input}"],
      ["placeholder", "{agent_scratchpad}"],
    ]);

    const agent = createToolCallingAgent({ llm, tools, prompt });

    const agentExecutor = new AgentExecutor({
      agent,
      tools,
    });

    const result = await agentExecutor.invoke({
      input: "What is magic_function(4)?",
    });

    return NextResponse.json(result);
  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json(error.message);
  }
}
