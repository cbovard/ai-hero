import ReactMarkdown, { type Components } from "react-markdown";
import type { Message } from "ai";

export type MessagePart = NonNullable<Message["parts"]>[number];

interface ChatMessageProps {
  parts?: MessagePart[];
  content?: string;
  role: string;
  userName: string;
}

const components: Components = {
  // Override default elements with custom styling
  p: ({ children }) => <p className="mb-4 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-4 list-disc pl-4">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 list-decimal pl-4">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  code: ({ className, children, ...props }) => (
    <code className={`${className ?? ""}`} {...props}>
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg bg-gray-700 p-4">
      {children}
    </pre>
  ),
  a: ({ children, ...props }) => (
    <a
      className="text-blue-400 underline"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  ),
};

const Markdown = ({ children }: { children: string }) => {
  return <ReactMarkdown components={components}>{children}</ReactMarkdown>;
};

const renderMessagePart = (part: MessagePart) => {
  switch (part.type) {
    case "text":
      return <Markdown>{part.text}</Markdown>;

    case "tool-invocation":
      const { toolInvocation } = part;
      return (
        <div className="mb-4 rounded-lg border border-gray-600 bg-gray-700 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-blue-400">
              {toolInvocation.state === "partial-call" && "🔄 Calling..."}
              {toolInvocation.state === "call" && "🔧 Tool Called"}
              {toolInvocation.state === "result" && "✅ Tool Result"}
            </span>
            <span className="text-xs text-gray-400">
              {toolInvocation.toolName}
            </span>
          </div>

          {toolInvocation.state === "partial-call" ||
          toolInvocation.state === "call" ? (
            <div className="text-sm text-gray-300">
              <div className="mb-1">
                <span className="text-gray-400">Arguments:</span>
              </div>
              <pre className="overflow-x-auto rounded bg-gray-800 p-2 text-xs">
                {JSON.stringify(toolInvocation.args, null, 2)}
              </pre>
            </div>
          ) : null}

          {toolInvocation.state === "result" ? (
            <div className="text-sm text-gray-300">
              <div className="mb-1">
                <span className="text-gray-400">Result:</span>
              </div>
              <pre className="overflow-x-auto rounded bg-gray-800 p-2 text-xs">
                {JSON.stringify(toolInvocation.result, null, 2)}
              </pre>
            </div>
          ) : null}
        </div>
      );

    case "step-start":
      return (
        <div className="mb-2 text-sm text-gray-400">
          <span className="italic">🔄 Starting new step...</span>
        </div>
      );

    case "reasoning":
      return (
        <div className="mb-4 rounded-lg border border-gray-600 bg-gray-700 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium text-blue-400">
              🧠 Reasoning
            </span>
          </div>
          <div className="text-sm text-gray-300">
            <div className="mb-2">{part.reasoning}</div>
            {part.details && part.details.length > 0 && (
              <div>
                <div className="mb-1 text-gray-400">Details:</div>
                {part.details.map((detail, index) => (
                  <div key={index} className="mb-1 ml-2">
                    {"type" in detail && detail.type === "text" ? (
                      <div className="text-gray-300">{detail.text}</div>
                    ) : "type" in detail && detail.type === "redacted" ? (
                      <div className="italic text-gray-500">
                        [Redacted: {detail.data}]
                      </div>
                    ) : (
                      <div className="italic text-gray-500">
                        Unknown detail type
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );

    default:
      return (
        <div className="mb-2 text-sm text-gray-400">
          <span className="italic">
            Unsupported message part type: {part.type}
          </span>
        </div>
      );
  }
};

export const ChatMessage = ({
  parts,
  content,
  role,
  userName,
}: ChatMessageProps) => {
  const isAI = role === "assistant";

  // Debug logging
  console.log("ChatMessage props:", { parts, content, role, userName });
  if (parts && parts.length > 0) {
    console.log("Message parts:", parts);
    parts.forEach((part, index) => {
      console.log(`Part ${index}:`, part);
    });
  }

  return (
    <div className="mb-6">
      <div
        className={`rounded-lg p-4 ${
          isAI ? "bg-gray-800 text-gray-300" : "bg-gray-900 text-gray-300"
        }`}
      >
        <p className="mb-2 text-sm font-semibold text-gray-400">
          {isAI ? "AI" : userName}
        </p>

        {/* Debug info - remove this later */}
        <div className="mb-2 border-t border-gray-600 pt-2 text-xs text-gray-500">
          <details>
            <summary className="cursor-pointer">
              Debug: Message Structure
            </summary>
            <div className="mt-2 space-y-1">
              <div>Has parts: {parts ? "Yes" : "No"}</div>
              <div>Parts length: {parts?.length || 0}</div>
              <div>Has content: {content ? "Yes" : "No"}</div>
              {parts && parts.length > 0 && (
                <div>
                  <div>Part types:</div>
                  <ul className="ml-2 list-inside list-disc">
                    {parts.map((part, i) => (
                      <li key={i}>{part.type}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>

        <div className="prose prose-invert max-w-none">
          {parts && parts.length > 0 ? (
            parts.map((part, index) => (
              <div key={index}>{renderMessagePart(part)}</div>
            ))
          ) : content ? (
            <Markdown>{content}</Markdown>
          ) : (
            <div className="text-sm text-gray-300">
              <span className="italic">No message content available</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
