import { taskWorkflowLabels, type TaskSourceLabel, type TaskStatus, type TaskWorkflow } from "../data/workspace";
import { useI18n } from "../i18n";

export type TaskListItemContentProps = {
  title: string;
  workflow: TaskWorkflow;
  sourceLabel?: TaskSourceLabel;
  status: TaskStatus;
  updatedAt?: string;
};

function formatShortDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function TaskListItemContent({
  title,
  workflow,
  sourceLabel,
  updatedAt,
}: TaskListItemContentProps) {
  const { t } = useI18n();
  const modifiedDate = formatShortDate(updatedAt);

  return (
    <span className="task-list-item-content">
      <span className="task-list-item-content__title" title={title}>{title}</span>
      <span className="task-list-item-content__meta">
        <span className="task-list-item-content__type">{t(sourceLabel ?? taskWorkflowLabels[workflow])}</span>
        {modifiedDate ? (
          <span className="task-list-item-content__date">·{modifiedDate}</span>
        ) : null}
      </span>
    </span>
  );
}
