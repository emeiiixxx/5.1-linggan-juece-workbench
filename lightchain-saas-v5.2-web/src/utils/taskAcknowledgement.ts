type AcknowledgementAttachment = {
  name: string;
};

export function buildConditionAcknowledgement({
  message,
  attachments = [],
  ignoredMessages = [],
}: {
  message?: string;
  attachments?: readonly AcknowledgementAttachment[];
  ignoredMessages?: readonly string[];
}) {
  const trimmedMessage = message?.trim() ?? "";
  const includesCondition = Boolean(trimmedMessage && !ignoredMessages.includes(trimmedMessage));
  const attachmentCount = attachments.length;

  if (!includesCondition && !attachmentCount) return null;
  if (includesCondition && attachmentCount) {
    return `已收到你补充的条件：“${trimmedMessage}”，并已读取 ${attachmentCount} 份附件。后续步骤会将这些信息一并纳入处理。`;
  }
  if (includesCondition) {
    return `已收到你补充的条件：“${trimmedMessage}”。后续步骤会按此继续处理。`;
  }
  return `已收到你补充的 ${attachmentCount} 份附件。后续步骤会将这些资料一并纳入处理。`;
}
