import { taskWorkflowLabels, type TaskSourceLabel, type TaskStatus, type TaskWorkflow } from "../data/workspace";
import { useI18n } from "../i18n";

export type TaskListItemContentProps = {
  title: string;
  workflow: TaskWorkflow;
  sourceLabel?: TaskSourceLabel;
  status: TaskStatus;
  updatedAt?: string;
};

function formatMonthDay(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${month}-${day}`;
}

export function TaskListItemContent({
  title,
  workflow,
  sourceLabel,
  status,
  updatedAt,
}: TaskListItemContentProps) {
  const { t } = useI18n();
  const modifiedDate = status === "completed" ? formatMonthDay(updatedAt) : null;
  const statusLabel = status === "completed"
    ? "已完成"
    : status === "pending"
      ? "待完成"
      : "进行中";

  return (
    <span className="task-list-item-content">
      <span className="task-list-item-content__title" title={title}>{title}</span>
      <span className="task-list-item-content__meta">
        <span className="task-list-item-content__type">{t(sourceLabel ?? taskWorkflowLabels[workflow])}</span>
        <span className={`task-list-item-content__status is-${status}`}>
          {t(statusLabel)}
        </span>
        {modifiedDate ? (
          <span className="task-list-item-content__date">·{modifiedDate}</span>
        ) : null}
      </span>
    </span>
  );
}
