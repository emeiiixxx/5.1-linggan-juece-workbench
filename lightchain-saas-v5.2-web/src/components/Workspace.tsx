import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { quickStartCards } from "../data/workspace";
import { assetUrl } from "../utils/assets";
import { FigmaIcon } from "./FigmaIcon";
import { ArchiveHeaderMotion } from "./GlassMotion";
import { IconControl } from "./IconControl";
import { QuickStartCard } from "./QuickStartCard";
import { primaryPageEntrance, primaryPageEntranceItem, primaryPageEntranceMediaItem } from "../utils/pageMotion";

const tabs = ["选品测款", "新品方向探索", "客户提案生成"];
const composerPlaceholders = [
  "描述你想调研的市场、品类或款式方向...",
  "描述下一季的市场,人群,品类和经营目标...",
  "输入客户需求,或上传brief、邮件和会议纪要...",
];
const tabMetrics = [
  { x: 0, width: 80 },
  { x: 84, width: 104 },
  { x: 192, width: 104 },
];

type ProfileOption = { id: number; name: string };
type ProjectOption = { id: number; name: string };
type Attachment = { id: string; name: string; kind: "file" | "image"; previewUrl?: string };

const profileOptions: ProfileOption[] = [
  { id: 1001, name: "日本通勤女装" },
  { id: 1002, name: "灭霸毁灭宇宙回忆录" },
  { id: 1003, name: "卡宾童装" },
];

const projectOptions: ProjectOption[] = [
  { id: 0, name: "GG酱的灵感" },
  { id: 1, name: "冬季大促营销策划" },
  { id: 2, name: "Untitled" },
  { id: 3, name: "Untitled" },
  { id: 4, name: "Untitled" },
  { id: 5, name: "Untitled" },
];

export function Workspace({ theme, selectedProfile, onSelectedProfileChange, selectedProject, onSelectedProjectChange, onCreateTask }: {
  theme: "dark" | "light";
  selectedProfile?: ProfileOption | null;
  onSelectedProfileChange?: (profile: ProfileOption | null) => void;
  selectedProject?: ProjectOption | null;
  onSelectedProjectChange?: (project: ProjectOption | null) => void;
  onCreateTask?: (task: { title: string; projectId: number | null }) => void;
}) {
  const [activeTab, setActiveTab] = useState(0);
  const [quickStartOpen, setQuickStartOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [message, setMessage] = useState("");
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const projectMenuRef = useRef<HTMLDivElement>(null);
  const attachmentMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const attachmentUrlsRef = useRef(new Set<string>());
  const reduceMotion = useReducedMotion();
  const quickStartExpandTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, duration: 0.5, bounce: 0.24 };
  const quickStartCollapseTransition = reduceMotion
    ? { duration: 0 }
    : { type: "tween" as const, duration: 0.3, ease: "easeOut" as const };
  const quickStartLayoutTransition = quickStartOpen
    ? quickStartExpandTransition
    : quickStartCollapseTransition;

  useEffect(() => () => {
    attachmentUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    attachmentUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!profileMenuOpen && !projectMenuOpen && !attachmentMenuOpen) return;
    const dismissSelectMenus = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!profileMenuRef.current?.contains(target)) setProfileMenuOpen(false);
      if (!projectMenuRef.current?.contains(target)) setProjectMenuOpen(false);
      if (!attachmentMenuRef.current?.contains(target)) setAttachmentMenuOpen(false);
    };
    const dismissSelectMenusOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
        setProjectMenuOpen(false);
        setAttachmentMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismissSelectMenus);
    document.addEventListener("keydown", dismissSelectMenusOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissSelectMenus);
      document.removeEventListener("keydown", dismissSelectMenusOnEscape);
    };
  }, [attachmentMenuOpen, profileMenuOpen, projectMenuOpen]);

  const send = () => {
    const taskMessage = message.trim();
    if (!taskMessage) return;
    const title = Array.from(taskMessage).slice(0, 10).join("");
    onCreateTask?.({ title, projectId: selectedProject?.id ?? null });
    attachments.forEach((attachment) => {
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
    });
    setAttachments([]);
    setMessage("");
  };

  const addAttachments = (event: ChangeEvent<HTMLInputElement>, kind: Attachment["kind"]) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (!files.length) return;
    const created = files.map((file, index) => {
      const previewUrl = kind === "image" ? URL.createObjectURL(file) : undefined;
      if (previewUrl) attachmentUrlsRef.current.add(previewUrl);
      return {
        id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
        name: file.name,
        kind,
        previewUrl,
      } satisfies Attachment;
    });
    setAttachments((current) => [...current, ...created]);
    event.currentTarget.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((current) => current.filter((attachment) => {
      if (attachment.id !== id) return true;
      if (attachment.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
        attachmentUrlsRef.current.delete(attachment.previewUrl);
      }
      return false;
    }));
  };

  const onComposerKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  return (
    <main className="workspace-region">
      <motion.div
        className="workspace-shell"
        data-node-id="140:6876"
        variants={primaryPageEntrance}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.section className="workspace-header" data-node-id="163:984" variants={primaryPageEntranceMediaItem}>
          <div className="workspace-copy">
            <h1>今天想从哪里开始？</h1>
            <p>选择一个业务场景，描述你的目标，Agent 会带你完成后续步骤。</p>
          </div>

          <div className="mode-tabs" role="tablist" aria-label="业务场景">
            <motion.span
              className="mode-tabs__indicator"
              animate={tabMetrics[activeTab]}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            {tabs.map((tab, index) => (
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === index}
                className={activeTab === index ? "is-active" : ""}
                onClick={() => setActiveTab(index)}
                key={tab}
              >
                {tab}
              </button>
            ))}
          </div>

          <ArchiveHeaderMotion theme={theme} />
        </motion.section>

        <motion.section className="composer" aria-label="新建任务" data-node-id="140:6883" variants={primaryPageEntranceItem}>
          <div className={`composer__input ${attachments.length ? "has-attachments" : ""}`} data-node-id="457:95352">
            <div className="composer__content">
              <AnimatePresence initial={false}>
                {attachments.length > 0 && (
                  <motion.div
                    className="composer-attachment-list"
                    initial={reduceMotion ? false : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    {attachments.map((attachment) => (
                      <motion.span
                        className="composer-attachment-chip"
                        layout
                        initial={reduceMotion ? false : { opacity: 0, scale: 0.94 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.94 }}
                        transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                        key={attachment.id}
                      >
                        {attachment.previewUrl ? (
                          <img className="composer-attachment-chip__thumbnail" src={attachment.previewUrl} alt="" />
                        ) : (
                          <img className="composer-attachment-chip__file" src={assetUrl("assets/figma-icons/file-pdf.svg")} alt="" />
                        )}
                        <span title={attachment.name}>{attachment.name}</span>
                        <button type="button" aria-label={`移除${attachment.name}`} onClick={() => removeAttachment(attachment.id)}>
                          <FigmaIcon name="close" size={16} />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="composer__text-wrap">
                <AnimatePresence mode="wait" initial={false}>
                  {!message && (
                    <motion.span
                      className="composer__placeholder"
                      key={activeTab}
                      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
                      transition={{ duration: reduceMotion ? 0 : 0.16, ease: "easeOut" }}
                      aria-hidden="true"
                    >
                      {composerPlaceholders[activeTab]}
                    </motion.span>
                  )}
                </AnimatePresence>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={onComposerKeyDown}
                  placeholder=""
                  aria-label={composerPlaceholders[activeTab]}
                />
              </div>
            </div>
            <div className="composer-attachment" ref={attachmentMenuRef}>
              <IconControl
                className="composer-attachment__button"
                label="添加附件"
                tooltipPlacement="top"
                selected={attachmentMenuOpen}
                aria-haspopup="menu"
                aria-expanded={attachmentMenuOpen}
                onClick={() => {
                  setAttachmentMenuOpen((open) => !open);
                  setProfileMenuOpen(false);
                  setProjectMenuOpen(false);
                }}
              >
                <FigmaIcon name="plus" size={20} />
              </IconControl>
              <AnimatePresence>
                {attachmentMenuOpen && (
                  <motion.div
                    className="composer-attachment-menu"
                    role="menu"
                    aria-label="添加附件"
                    data-node-id="453:94648"
                    initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }}>
                      <FigmaIcon name="add-file" size={16} />
                      <span>文件</span>
                    </button>
                    <button type="button" role="menuitem" onClick={() => { setAttachmentMenuOpen(false); imageInputRef.current?.click(); }}>
                      <FigmaIcon name="add-image" size={16} />
                      <span>图片</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
              <input ref={fileInputRef} className="composer-attachment__input" type="file" multiple onChange={(event) => addAttachments(event, "file")} />
              <input ref={imageInputRef} className="composer-attachment__input" type="file" accept="image/*" multiple onChange={(event) => addAttachments(event, "image")} />
            </div>
            <div className="composer__send-hint">Enter 发送 · Shift + Enter 换行</div>
            <IconControl
              className="composer__send"
              label="发送"
              tooltipPlacement="top"
              disabled={!message.trim()}
              onClick={send}
            >
              <FigmaIcon name="arrow-up" size={24} />
            </IconControl>
          </div>
          <div className="composer__footer">
            <div className="composer-profile-select" ref={profileMenuRef}>
              <button
                type="button"
                className={`composer-select composer-select--profile ${profileMenuOpen ? "is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setProjectMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
              >
                <FigmaIcon name="company-info" size={16} />
                <span title={selectedProfile?.name}>{selectedProfile?.name ?? "业务偏好档案"}</span>
                <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
              </button>
              <AnimatePresence>
                {profileMenuOpen && (
                  <motion.div
                    className="composer-profile-menu"
                    role="listbox"
                    aria-label="选择业务偏好档案"
                    data-node-id="453:93991"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <span className="composer-profile-menu__label">选择业务偏好档案</span>
                    <div className="composer-profile-menu__options">
                      {profileOptions.map((profile) => {
                        const selected = selectedProfile?.id === profile.id;
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={selected ? "is-selected" : ""}
                            key={profile.id}
                            onClick={() => {
                              onSelectedProfileChange?.(selected ? null : profile);
                              setProfileMenuOpen(false);
                            }}
                          >
                            <span>{profile.name}</span>
                            {selected && <FigmaIcon name="check" size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="composer-project-select" ref={projectMenuRef}>
              <button
                type="button"
                className={`composer-select composer-select--project ${projectMenuOpen ? "is-open" : ""}`}
                aria-haspopup="listbox"
                aria-expanded={projectMenuOpen}
                onClick={() => {
                  setProjectMenuOpen((open) => !open);
                  setProfileMenuOpen(false);
                  setAttachmentMenuOpen(false);
                }}
              >
                <FigmaIcon name="project" size={16} />
                <span title={selectedProject?.name}>{selectedProject?.name ?? "选择项目"}</span>
                <FigmaIcon name="chevron-right" size={16} className="composer-select__chevron" />
              </button>
              <AnimatePresence>
                {projectMenuOpen && (
                  <motion.div
                    className="composer-profile-menu composer-project-menu"
                    role="listbox"
                    aria-label="选择项目"
                    initial={reduceMotion ? false : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.98 }}
                    transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }}
                  >
                    <span className="composer-profile-menu__label">选择项目</span>
                    <div className="composer-profile-menu__options composer-project-menu__options">
                      {projectOptions.map((project) => {
                        const selected = selectedProject?.id === project.id;
                        return (
                          <button
                            type="button"
                            role="option"
                            aria-selected={selected}
                            className={selected ? "is-selected" : ""}
                            key={project.id}
                            onClick={() => {
                              onSelectedProjectChange?.(selected ? null : project);
                              setProjectMenuOpen(false);
                            }}
                          >
                            <span>{project.name}</span>
                            {selected && <FigmaIcon name="check" size={16} />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.section>

        <motion.section className={`quick-start ${quickStartOpen ? "is-open" : ""}`} variants={primaryPageEntranceItem}>
          <motion.button
            className="quick-start__toggle"
            type="button"
            onClick={() => setQuickStartOpen((value) => !value)}
            aria-expanded={quickStartOpen}
            layout
            transition={quickStartLayoutTransition}
          >
            <motion.span
              className="quick-start__title"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              <FigmaIcon name="idea" size={20} />
              <strong>快速开始</strong>
            </motion.span>
            <motion.span
              className="quick-start__hint"
              layout="position"
              transition={quickStartLayoutTransition}
            >
              不知道从何开始？试试这些模板
              <FigmaIcon
                name="chevron-down"
                size={16}
                className={quickStartOpen ? "" : "is-closed"}
              />
            </motion.span>
          </motion.button>

          <AnimatePresence initial={false}>
            {quickStartOpen && (
              <motion.div
                className="quick-start__grid"
                initial={{ height: 0, opacity: 0, y: -6 }}
                animate={{ height: "auto", opacity: 1, y: 0 }}
                exit={{
                  height: 0,
                  opacity: 0,
                  y: -6,
                  transition: quickStartCollapseTransition,
                }}
                transition={quickStartExpandTransition}
              >
                {quickStartCards.map((card) => (
                  <QuickStartCard
                    title={card.title}
                    description={card.description}
                    image={card.image}
                    key={card.title}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>
      </motion.div>
    </main>
  );
}
