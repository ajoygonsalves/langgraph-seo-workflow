import { tool } from "@langchain/core/tools";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import {
  StateGraph,
  StateGraphArgs,
  END,
  START,
  MemorySaver,
  Annotation,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { NextResponse } from "next/server";
import dotenv from "dotenv";

dotenv.config();

export async function GET(req) {
  try {
    const GraphState = Annotation.Root({
      messages: Annotation({
        reducer: (state: string[], update: string[]) => state.concat(update),
      }),
    });

    const search = new TavilySearchResults({
      maxResults: 10,
      apiKey: process.env.TAVILY_API_KEY,
      kwargs: {
        search_depth: "advanced",
      },
    });

    const tools = [search];

    const toolNode = new ToolNode(tools);

    const model = new ChatOpenAI({
      model: "gpt-4-turbo",
      maxTokens: 4096,
      apiKey: process.env.OPENAI_API_KEY,
    }).bindTools(tools);

    const shouldContinue = (state) => {
      const messages = state.messages;
      const lastMessage = state.messages[messages.length - 1];

      if (lastMessage.tool_calls?.length) {
        console.log("TEST");
        console.log("Last Message.tool_calls = ", lastMessage.tool_calls);
        return "tools";
      }
      return END;
    };

    const callLLM = async (state) => {
      const messages = state.messages;
      const response = await model.invoke(messages);

      return { messages: [response] };
    };

    const workflow = new StateGraph(GraphState)
      .addNode("callLLM", callLLM)
      .addNode("tools", toolNode)
      .addEdge(START, "callLLM")
      .addConditionalEdges("callLLM", shouldContinue)
      .addEdge("tools", "callLLM");

    const checkpointer = new MemorySaver();

    const app = workflow.compile({ checkpointer });

    const topic =
      "What is a Gemba Walk and how to do a gemba walk and why is it important?";
    const language = "English";
    const wordCount = 4000;
    const aboutUser =
      "The content is for Capptions, a leading EHS software from Rotterdam with a marketplace for safety and compliance templates made by industry experts";
    const additionalInfo =
      "In the Capptions marketplace we have a 8-step Gemba Walk Guide, please add that seamless in the blog post and link to it seamlessly too: https://capptions.direct/marketplace/capptionsdirect/product/gembawalk";

    const finalState = await app.invoke(
      {
        messages: [
          new HumanMessage(`${aboutUser}. Given the following information, generate a ${wordCount} word ${language} blog post that will rank well on Google for the following topic: ${topic}
                      
            Instructions:
            Search the internet for top performing blog articles on the topic.
            The blog title should be SEO optimized.
            The blog article should include relevant valuable links - the links should not be from companies that could be competitors of Capptions (EHS and ESG Software).
            The blog title, should be crafted with the relevant keywords in mind and should be catchy and engaging. But not overly expressive.
            Each sub-section should have at least 3 paragraphs.
            Each section should have at least three subsections.
            Please include the specific painpoints or challenges faced by the target audience (related EHS or ESG professionals).
            Sub-section headings should be clearly marked.
            Clearly indicate the title, headings, and sub-headings using markdown.
            Make sure the content is also seamlessly optimized for Google Feature Snippets.
            Each section should cover the specific aspects as outlined.
            For each section, generate detailed content that aligns with the provided subtopics. Ensure that the content is informative and covers the key points.
            Ensure that the content flows logically from one section to another, maintaining coherence and readability.
            Where applicable, include examples, case studies, or insights that can provide a deeper understanding of the topic. If needed, consider searching the internet again for such case studies and/or insights, then link them in the blog post.
            Always include discussions on ethical considerations, especially in sections dealing with data privacy, bias, and responsible use. Only add this where it is applicable.
            In the final section, provide a forward-looking perspective on the topic and a conclusion.
            End with a CTA seamlessly encouraging users to use Capptions EHS Software and Marketplace for Compliance templates, linking to its website https://www.capptions.com
            Please ensure proper beautiful and standard markdown formatting always.
            Make the blog post sound as human and as engaging as possible, add real world examples and make it as informative as possible.
            You are a professional blog post writer and SEO expert.
            Here is additional info: ${additionalInfo}`),
        ],
      },
      { configurable: { thread_id: "10" } }
    );

    const representation = app.getGraph();
    const image = await representation.drawMermaidPng();
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    return NextResponse.json({
      response: finalState.messages[finalState.messages.length - 1].content,
      finalstate: finalState,
      image: `data:image/png;base64,${base64Image}`,
    });
  } catch (e) {
    console.log("Error: ", e);
    return NextResponse.json(e.message);
  }
}
