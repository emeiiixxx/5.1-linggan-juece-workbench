import { useState } from "react";
import type { TaskConversationAttachment } from "./TaskConversationComposer";
import { ConversationFollowUpExchange } from "./ConversationPrimitives";

export const directionResearchRevisionUi = {
  actionLabel: "调整或补充",
  placeholder: "请输入要调整或补充的内容...",
  hint: "输入调整或补充内容",
  points: 999,
} as const;

export type DirectionResearchRevisionContext = {
  selectedLabels: string[];
  feedback: string;
  attachmentCount: number;
};

type DirectionResearchRevisionMessage = {
  id: string;
  request: string;
  attachments: TaskConversationAttachment[];
  response: string;
};

export function useDirectionResearchRevision() {
  const [context, setContext] = useState<DirectionResearchRevisionContext | null>(null);
  const [messages, setMessages] = useState<DirectionResearchRevisionMessage[]>([]);

  const startRevision = ({
    selectedLabels,
    feedback,
    attachments,
  }: {
    selectedLabels: string[];
    feedback: string;
    attachments: TaskConversationAttachment[];
  }) => {
    const revisionContext = {
      selectedLabels,
      feedback,
      attachmentCount: attachments.length,
    };
    const revisionInputs = [
      selectedLabels.length ? `已选方向“${selectedLabels.join("、")}”` : "",
      feedback ? `补充要求“${feedback}”` : "",
      attachments.length ? `${attachments.length} 份补充资料` : "",
    ].filter(Boolean).join("、");

    setContext(revisionContext);
    setMessages((current) => [...current, {
      id: `direction-research-revision-${Date.now()}`,
      request: feedback,
      attachments,
      response: `已将${revisionInputs}合并为本轮调研条件，正在重新执行调研并整理新的方向。`,
    }]);
    return revisionContext;
  };

  return { context, messages, startRevision };
}

export function DirectionResearchRevisionHistory({ messages }: {
  messages: DirectionResearchRevisionMessage[];
}) {
  return messages.map((message, index) => (
    <ConversationFollowUpExchange
      request={message.request}
      attachments={message.attachments}
      response={message.response}
      key={message.id || `${message.request}-${index}`}
    />
  ));
}
