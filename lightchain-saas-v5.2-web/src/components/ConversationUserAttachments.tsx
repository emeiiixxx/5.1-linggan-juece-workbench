import { useState } from "react";
import { FigmaIcon } from "./FigmaIcon";
import { ImageLightbox } from "./ImageSelection";
import { TagChip } from "./TagChip";

export type ConversationUserAttachment = {
  name: string;
  previewUrl?: string;
};

export function ConversationUserAttachments({
  attachments,
}: {
  attachments: readonly ConversationUserAttachment[];
}) {
  const [preview, setPreview] = useState<ConversationUserAttachment | null>(null);

  if (!attachments.length) return null;

  return (
    <>
      <span className="conversation-user-attachments" aria-label="已上传的参考资料">
        {attachments.map((attachment, index) => (
          <TagChip
            className="conversation-user-attachment"
            label={attachment.name}
            leftSlot={attachment.previewUrl
              ? <img src={attachment.previewUrl} alt="" />
              : <FigmaIcon name="file" size={16} />}
            title={attachment.previewUrl ? `放大查看：${attachment.name}` : attachment.name}
            onClick={attachment.previewUrl ? () => setPreview(attachment) : undefined}
            key={`${attachment.name}-${attachment.previewUrl ?? "file"}-${index}`}
          />
        ))}
      </span>
      {preview?.previewUrl ? (
        <ImageLightbox src={preview.previewUrl} alt={preview.name} onClose={() => setPreview(null)} />
      ) : null}
    </>
  );
}
