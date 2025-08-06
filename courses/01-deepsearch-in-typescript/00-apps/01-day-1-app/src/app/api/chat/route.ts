import type { Message } from "ai";
import { streamText, createDataStreamResponse } from "ai";
import { model } from "~/model";
import { auth } from "~/server/auth";
import { searchSerper } from "~/serper";

export const maxDuration = 60;

// Custom search function
async function performWebSearch(query: string) {
  try {
    console.log("Performing web search for:", query);
    const results = await searchSerper({ q: query, num: 5 }, undefined);

    if (!results?.organic?.length) {
      return "No search results found.";
    }

    const formattedResults = results.organic
      .slice(0, 3)
      .map(
        (result, index) =>
          `${index + 1}. **${result.title}**\n   ${result.snippet}\n   Source: [${result.title}](${result.link})`,
      )
      .join("\n\n");

    return `Search results for "${query}":\n\n${formattedResults}`;
  } catch (error) {
    console.error("Search error:", error);
    return "Sorry, I encountered an error while searching.";
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = (await request.json()) as {
      messages: Array<Message>;
    };

    console.log("Chat request received:", {
      messageCount: body.messages.length,
    });

    return createDataStreamResponse({
      execute: async (dataStream: any) => {
        try {
          const { messages } = body;

          console.log("Processing messages:", messages.length);

          // Check if the last message is asking for current information
          const lastMessage = messages[messages.length - 1];
          const needsSearch =
            lastMessage &&
            lastMessage.role === "user" &&
            (lastMessage.content.toLowerCase().includes("latest") ||
              lastMessage.content.toLowerCase().includes("current") ||
              lastMessage.content.toLowerCase().includes("news") ||
              lastMessage.content.toLowerCase().includes("today") ||
              lastMessage.content.toLowerCase().includes("recent"));

          if (needsSearch && process.env.SERPER_API_KEY) {
            console.log("Detected search need, performing search...");
            const searchResults = await performWebSearch(lastMessage.content);

            // Add search results to the conversation
            const messagesWithSearch = [
              ...messages,
              {
                role: "assistant" as const,
                content: `I'll search for current information about that.\n\n${searchResults}`,
              },
            ];

            const result = streamText({
              model,
              messages: messagesWithSearch,
              system: `You are a helpful AI assistant with access to web search results. 

IMPORTANT: When using information from search results, you MUST include the source links in your response. Use markdown format: [source name](link).

For example, if you mention information from a Reuters article, include [Reuters](link) in your response.

Always cite your sources with clickable links when providing information from search results.`,
            });

            result.mergeIntoDataStream(dataStream);
          } else {
            // Normal conversation without search
            const result = streamText({
              model,
              messages,
              system: `You are a helpful AI assistant. You can help with general questions and conversations.

If users ask about current events, recent news, or information that might be time-sensitive, let them know that you don't have access to real-time information but you can help with general knowledge questions.`,
            });

            result.mergeIntoDataStream(dataStream);
          }
        } catch (error) {
          console.error("Execute error:", error);
          throw error;
        }
      },
      onError: (e: any) => {
        console.error("Chat error:", e);
        return "Oops, an error occurred!";
      },
    });
  } catch (error) {
    console.error("POST error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
