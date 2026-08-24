import { motion } from "motion/react";
import { getBusinessProfileSummary } from "../utils/businessProfile";

export function AppliedBusinessProfileMessage({ profileName, reduceMotion = false, dataNodeId }: {
  profileName: string;
  reduceMotion?: boolean | null;
  dataNodeId?: string;
}) {
  return (
    <motion.article
      className="conversation-message conversation-message--assistant conversation-profile-read"
      data-message-actions="true"
      data-node-id={dataNodeId}
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <p className="conversation-profile-read__label">
        <span className="conversation-streaming-text">已读取到有应用业务偏好档案</span>
      </p>
      <motion.div
        className="conversation-profile-card"
        initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.38, delay: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        <strong>{profileName}</strong>
        <span>{getBusinessProfileSummary(profileName)}</span>
      </motion.div>
    </motion.article>
  );
}
