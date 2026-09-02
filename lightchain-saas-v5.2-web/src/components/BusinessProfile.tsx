import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "motion/react";
import { createPortal } from "react-dom";
import { FigmaIcon } from "./FigmaIcon";
import { assetUrl } from "../utils/assets";
import { fileIconAssetPath } from "../utils/fileIcon";
import { primaryPageEntrance, primaryPageEntranceFadeItem, primaryPageEntranceItem } from "../utils/pageMotion";
import { useI18n } from "../i18n";
import { Toast } from "./Toast";

type ArchiveView = "list" | "create" | "edit" | "parsing" | "detail";
type LocalUpload = { id: string; name: string; preview?: string };
type ProfileTaskType = "new-product" | "customer-proposal";

type Profile = {
  id: number;
  name: string;
  category: string[];
  price: string;
  countries: string[];
  ages: string[];
  channels: string[];
  brands: string[];
  visualPreference: string;
  files: LocalUpload[];
  updated: string;
};

type Form = Omit<Profile, "id" | "updated" | "files"> & { minPrice: string; maxPrice: string; currency: string };

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> };
};

const initialProfiles: Profile[] = [
  {
    id: 1001,
    name: "日本通勤女装档案",
    category: ["女装"],
    price: "JPY 8,000 ～ 18,000",
    countries: ["日本", "韩国", "美国", "非洲", "巴拉巴拉"],
    ages: ["25–34岁", "35–44岁"],
    channels: ["ZOZOTOWN", "Rakuten Fashion"],
    brands: [],
    visualPreference: "",
    files: [{ id: "profile-1001-file-1", name: "日本通勤女装资料包.pdf" }],
    updated: "2026-08-04",
  },
  {
    id: 1002,
    name: "灭霸毁灭世界回忆录",
    category: ["女装", "男装", "童装"],
    price: "USD 1,000 ～ 999,999,999",
    countries: ["日本", "韩国", "美国", "非洲", "银河系"],
    ages: ["0–18岁", "19–24岁", "45–65岁", "66–100岁"],
    channels: ["线下门店", "跨境电商"],
    brands: ["Thanos"],
    visualPreference: "漫威宇宙风格、赛博朋克、暗黑系",
    files: [{ id: "profile-1002-file-1", name: "Thanos品牌资料.pdf" }],
    updated: "2026-06-04",
  },
  {
    id: 1003,
    name: "卡宾鞋袋",
    category: ["鞋袋"],
    price: "CNY 200 ～ 1,000",
    countries: ["中国", "欧美市场"],
    ages: ["3–18岁"],
    channels: ["天猫", "京东", "抖音", "小红书", "线下门店", "跨境电商"],
    brands: ["Cabbeen"],
    visualPreference: "",
    files: [{ id: "profile-1003-file-1", name: "卡宾鞋袋商品资料.xlsx" }],
    updated: "2026-08-04",
  },
  {
    id: 1004,
    name: "Thanos' World-Destroying Memoir",
    category: ["Womenswear"],
    price: "USD 1,000 ～ 999,999,999",
    countries: ["Japan", "Korea", "United States"],
    ages: ["25–34", "35–44"],
    channels: ["Retail", "E-commerce"],
    brands: ["Thanos"],
    visualPreference: "",
    files: [{ id: "profile-1004-file-1", name: "Thanos Brand Profile.pdf" }],
    updated: "Aug 4, 2026",
  },
];

const sharedTransitionStyle = (name: string): CSSProperties => ({ viewTransitionName: name });

function runViewTransition(update: () => void) {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    update();
    return;
  }
  const viewTransitionDocument = document as ViewTransitionDocument;
  if (!viewTransitionDocument.startViewTransition) {
    update();
    return;
  }
  document.documentElement.classList.add("profile-view-transitioning");
  const transition = viewTransitionDocument.startViewTransition(update);
  transition.finished.finally(() => document.documentElement.classList.remove("profile-view-transitioning"));
}

function useDismissableLayer(open: boolean, ref: { current: HTMLElement | null }, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onDismiss, open, ref]);
}

const profileArt = (name: string) => assetUrl(`assets/business-profile/${name}`);

const blankForm = (): Form => ({
  name: "",
  category: [],
  price: "",
  minPrice: "",
  maxPrice: "",
  currency: "",
  countries: [],
  ages: [],
  channels: [],
  brands: [],
  visualPreference: "",
});

const formFromProfile = (profile: Profile): Form => {
  const [, currency = "", minPrice = "", maxPrice = ""] = profile.price.match(/^(\S+)\s+(\d+)\s+～\s+(\d+)$/) ?? [];
  return { ...blankForm(), name: profile.name, category: profile.category, price: profile.price, currency, minPrice, maxPrice, countries: profile.countries, ages: profile.ages, channels: profile.channels, brands: profile.brands, visualPreference: profile.visualPreference };
};

const requiredComplete = (form: Form) =>
  [form.name, Boolean(form.category.length), Boolean(form.minPrice && form.maxPrice), Boolean(form.countries.length), Boolean(form.ages.length)].filter(Boolean).length;

function TagList({ values, limit = 4 }: { values: string[]; limit?: number }) {
  const { t } = useI18n();
  if (!values.length) return <span className="profile-detail__empty">{t("未填写")}</span>;
  return (
    <span className="profile-tag-list">
      {values.slice(0, limit).map((value) => <span className="profile-tag" title={t(value)} key={value}>{t(value)}</span>)}
      {values.length > limit && <span className="profile-tag">+{values.length - limit}</span>}
    </span>
  );
}

function AdaptiveTagList({ values }: { values: string[] }) {
  const { locale, t } = useI18n();
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(values.length);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const updateVisibleCount = () => {
      const children = Array.from(measure.children) as HTMLElement[];
      const tagWidths = children.slice(0, values.length).map((child) => child.getBoundingClientRect().width);
      const overflowWidths = children.slice(values.length).map((child) => child.getBoundingClientRect().width);
      const availableWidth = container.clientWidth;
      let nextCount = values.length;

      for (let count = values.length; count >= 0; count -= 1) {
        const tagsWidth = tagWidths.slice(0, count).reduce((total, width) => total + width, 0);
        const gapCount = count > 0 ? count - 1 : 0;
        const overflowSpace = count < values.length ? (overflowWidths[count] ?? 0) + (count > 0 ? 4 : 0) : 0;
        if (tagsWidth + gapCount * 4 + overflowSpace <= availableWidth) {
          nextCount = count;
          break;
        }
      }

      setVisibleCount(nextCount);
    };

    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    return () => observer.disconnect();
  }, [locale, values]);

  if (!values.length) return <span className="profile-detail__empty">{t("未填写")}</span>;

  return (
    <span className="profile-tag-list" ref={containerRef}>
      {values.slice(0, visibleCount).map((value) => <span className="profile-tag" title={t(value)} key={value}>{t(value)}</span>)}
      {visibleCount < values.length && <span className="profile-tag">+{values.length - visibleCount}</span>}
      <span className="profile-tag-list__measure" ref={measureRef} aria-hidden="true">
        {values.map((value) => <span className="profile-tag" key={value}>{t(value)}</span>)}
        {values.map((_, index) => <span className="profile-tag" key={`overflow-${index}`}>+{values.length - index}</span>)}
      </span>
    </span>
  );
}

function AdaptiveSelectTags({ values, onChange }: { values: string[]; onChange: (values: string[]) => void }) {
  const { t } = useI18n();
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(values.length);

  useEffect(() => {
    const container = containerRef.current;
    const measure = measureRef.current;
    if (!container || !measure) return;

    const updateVisibleCount = () => {
      const children = Array.from(measure.children) as HTMLElement[];
      const tagWidths = children.slice(0, values.length).map((child) => child.getBoundingClientRect().width);
      const overflowWidths = children
        .slice(values.length)
        .map((child) => child.getBoundingClientRect().width);
      const availableWidth = container.clientWidth;
      let nextCount = values.length;

      for (let count = values.length; count >= 0; count -= 1) {
        const tagsWidth = tagWidths.slice(0, count).reduce((total, width) => total + width, 0);
        const gapCount = count > 0 ? count - 1 : 0;
        const overflowSpace = count < values.length ? (overflowWidths[count] ?? 0) + (count > 0 ? 4 : 0) : 0;
        if (tagsWidth + gapCount * 4 + overflowSpace <= availableWidth) {
          nextCount = count;
          break;
        }
      }
      setVisibleCount(nextCount);
    };

    updateVisibleCount();
    const observer = new ResizeObserver(updateVisibleCount);
    observer.observe(container);
    return () => observer.disconnect();
  }, [values]);

  return (
    <span className="profile-select__tags" ref={containerRef}>
      {values.slice(0, visibleCount).map((value) => (
        <span className="profile-tag profile-tag--removable" key={value}>
          <span title={t(value)}>{t(value)}</span>
          <button type="button" aria-label={`${t("删除")} ${t(value)}`} onClick={(event) => { event.stopPropagation(); onChange(values.filter((item) => item !== value)); }}><FigmaIcon name="close" size={12} /></button>
        </span>
      ))}
      {visibleCount < values.length && <span className="profile-tag">+{values.length - visibleCount}</span>}
      <span className="profile-select__measure" ref={measureRef} aria-hidden="true">
        {values.map((value) => <span className="profile-tag profile-tag--removable" key={value}>{t(value)}<i className="profile-tag__measure-close" /></span>)}
        {values.map((_, index) => <span className="profile-tag" key={`overflow-${index}`}>+{values.length - index}</span>)}
      </span>
    </span>
  );
}

function TagInputField({ label, values, placeholder, onChange }: { label: string; values: string[]; placeholder: string; onChange: (values: string[]) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const commitDraft = () => {
    const additions = draft
      .split(/[、,，;；\n]+/)
      .map((value) => value.trim())
      .filter((value) => value && !values.includes(value));
    if (additions.length) onChange([...values, ...additions]);
    setDraft("");
  };

  return (
    <div className="profile-form-field profile-tag-input-field">
      <span className="profile-form-label">{t(label)}</span>
      <div className="profile-tag-input" onClick={() => inputRef.current?.focus()}>
        {values.map((value) => (
          <span className="profile-tag profile-tag--removable" key={value}>
            <span title={value}>{value}</span>
            <button
              type="button"
              aria-label={`${t("删除")} ${value}`}
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                onChange(values.filter((item) => item !== value));
              }}
            >
              <FigmaIcon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commitDraft}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              commitDraft();
            }
          }}
          placeholder={values.length ? "" : t(placeholder)}
          aria-label={t(label)}
        />
      </div>
    </div>
  );
}

function SelectField({ label, required, values, placeholder, options, onChange, multi = true, display = "tags", menuLabel }: {
  label: string; required?: boolean; values: string[]; placeholder: string; options: string[]; onChange: (values: string[]) => void; multi?: boolean; display?: "tags" | "text"; menuLabel?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!fieldRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);
  const toggle = (option: string) => {
    if (!multi) return onChange([option]);
    onChange(values.includes(option) ? values.filter((value) => value !== option) : [...values, option]);
  };
  return (
    <div className="profile-form-field profile-select-field" ref={fieldRef}>
      <span className="profile-form-label">{t(label)}{required && <b>*</b>}</span>
      <div
        className={`profile-select ${open ? "is-open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        role="button"
        tabIndex={0}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpen((value) => !value);
          }
          if (event.key === "Escape") setOpen(false);
        }}
      >
        {values.length ? display === "tags" ? <AdaptiveSelectTags values={values} onChange={onChange} /> : <span className="profile-select__value" title={t(values[0])}>{t(values[0])}</span> : <span className="profile-select__placeholder" title={t(placeholder)}>{t(placeholder)}</span>}
        <FigmaIcon name="chevron-down" size={16} />
      </div>
      {open && (
        <div className="profile-select-menu" role="listbox" aria-label={t(menuLabel ?? label)}>
          {menuLabel && <span className="profile-select-menu__label">{t(menuLabel)}</span>}
          {options.map((option) => (
            <button className={values.includes(option) ? "is-selected" : ""} type="button" role="option" aria-selected={values.includes(option)} key={option} onClick={(event) => { event.stopPropagation(); toggle(option); if (!multi) setOpen(false); }}>
              <span title={t(option)}>{t(option)}</span>{values.includes(option) && <FigmaIcon name="check" size={16} className="profile-select-menu__selected" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UploadPanel({ files, parsed = false, parsing = false, onSelect, onRemove }: { files: LocalUpload[]; parsed?: boolean; parsing?: boolean; onSelect: () => void; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  return (
    <section className="profile-upload-panel">
      <div className="profile-upload-panel__copy">
        <strong>{t("上传资料包，自动预填档案")}</strong>
        <span>{t("支持商品企划、品牌资料、销售复盘、客户提案等")}<br />{t("支持 PDF、PPT、Word、Excel、CSV、JPG、PNG 格式")}</span>
      </div>
      <button type="button" className="profile-button profile-button--primary profile-button--small" disabled={parsing} aria-busy={parsing} onClick={onSelect}>{t(parsing ? "解析中…" : parsed ? "重新上传并解析" : "选择资料")}</button>
      {files.map((file) => <UploadFileRow key={file.id} name={file.name} preview={file.preview} onRemove={parsed || parsing ? undefined : () => onRemove(file.id)} />)}
    </section>
  );
}

function UploadFileRow({ onRemove, name = "日本通勤女装资料包.pdf", preview }: { onRemove?: () => void; name?: string; preview?: string }) {
  const { t } = useI18n();
  const fileIcon = assetUrl(fileIconAssetPath(name));
  return <div className="profile-upload-file">
    {preview
      ? <img className="profile-upload-file__type is-thumbnail" src={preview} alt="" />
      : <span className="profile-upload-file__type" aria-hidden="true"><i /><img src={fileIcon} alt="" /></span>}
    <span>{name}</span>
    {onRemove && <button type="button" aria-label={t("移除文件")} onClick={onRemove}><FigmaIcon name="trash" size={16} /></button>}
  </div>;
}

function CurrencySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!selectRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => window.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [open]);
  return <div className={`profile-currency-select ${open ? "is-open" : ""}`} ref={selectRef}><button type="button" onClick={() => setOpen((current) => !current)}><span className={value ? "" : "profile-currency-select__placeholder"}>{value || t("货币")}</span><FigmaIcon name="chevron-down" size={16} /></button>{open && <span className="profile-select-menu">{["JPY", "CNY", "USD"].map((currency) => <button type="button" key={currency} onClick={() => { onChange(currency); setOpen(false); }}><span>{currency}</span></button>)}</span>}</div>;
}

export function BusinessProfile({ onCreateTask, createRequestKey = 0, listRequestKey = 0 }: { onCreateTask?: (profile: Profile, taskType: ProfileTaskType) => void; createRequestKey?: number; listRequestKey?: number }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<ArchiveView>("list");
  const [profiles, setProfiles] = useState<Profile[]>(initialProfiles);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<Form>(blankForm);
  const [animateCreateEntry, setAnimateCreateEntry] = useState(false);
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [parseDestination, setParseDestination] = useState<"create" | "edit">("create");
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  const visibleProfiles = profiles.length ? profiles : [];
  const filteredProfiles = useMemo(() => visibleProfiles.filter((profile) => profile.name.toLowerCase().includes(query.toLowerCase())), [visibleProfiles, query]);
  const complete = requiredComplete(form);
  const canSave = complete === 5;
  const resetDraft = () => {
    setForm(blankForm());
    setUploads([]);
    setUploadOpen(false);
    if (view === "parsing") setView(parseDestination);
  };

  const setArchiveView = (nextView: ArchiveView, profile?: Profile | null) => {
    if (profile !== undefined) setActiveProfile(profile);
    setView(nextView);
  };
  const openCreate = () => { setForm(blankForm()); setUploads([]); setAnimateCreateEntry(true); setView("create"); };
  const openDetail = (profile: Profile) => runViewTransition(() => setArchiveView("detail", profile));
  const returnToList = () => runViewTransition(() => setArchiveView("list"));
  const notify = (message: string) => {
    setToast(message);
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToast("");
    }, 2200);
  };

  useEffect(() => () => {
    if (toastTimerRef.current !== null) window.clearTimeout(toastTimerRef.current);
  }, []);
  useEffect(() => {
    if (!createRequestKey) return;
    setForm(blankForm());
    setUploads([]);
    setAnimateCreateEntry(true);
    setView("create");
  }, [createRequestKey]);
  useLayoutEffect(() => {
    if (!listRequestKey) return;
    setActiveProfile(null);
    setUploadOpen(false);
    setView("list");
  }, [listRequestKey]);
  const applyAutofill = () => {
    setForm((current) => ({ ...blankForm(), name: "日本通勤女装档案", category: ["女装"], minPrice: "8000", maxPrice: "18000", price: "JPY 8,000 ～ 18,000", currency: "JPY", countries: ["日本"], ages: ["25–34岁"], channels: ["ZOZOTOWN", "Rakuten Fashion"], visualPreference: current.visualPreference }));
    setAnimateCreateEntry(false);
  };
  useEffect(() => {
    if (view !== "parsing") return;
    setParseProgress(0);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : 2800;
    const startedAt = performance.now();
    let animationFrame: number | undefined;
    let completeTimeout: number | undefined;
    const finish = () => {
      setParseProgress(100);
      completeTimeout = window.setTimeout(() => {
        applyAutofill();
        setView(parseDestination);
      }, 480);
    };
    const updateProgress = (now: number) => {
      if (duration === 0) {
        finish();
        return;
      }
      const elapsed = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setParseProgress(Math.round(eased * 100));
      if (elapsed < 1) animationFrame = window.requestAnimationFrame(updateProgress);
      else finish();
    };
    animationFrame = window.requestAnimationFrame(updateProgress);
    return () => {
      if (animationFrame !== undefined) window.cancelAnimationFrame(animationFrame);
      if (completeTimeout) window.clearTimeout(completeTimeout);
    };
  }, [parseDestination, view]);
  const save = () => {
    if (!canSave) return;
    const profile: Profile = { id: Date.now(), name: form.name, category: form.category, price: `${form.currency} ${form.minPrice} ～ ${form.maxPrice}`, countries: form.countries, ages: form.ages, channels: form.channels, brands: form.brands, visualPreference: form.visualPreference, files: uploads, updated: "刚刚" };
    setProfiles((current) => [profile, ...current]);
    setArchiveView("detail", profile);
  };
  const saveModification = () => {
    if (!canSave || !activeProfile) return;
    const updated: Profile = { ...activeProfile, name: form.name, category: form.category, price: `${form.currency} ${form.minPrice} ～ ${form.maxPrice}`, countries: form.countries, ages: form.ages, channels: form.channels, brands: form.brands, visualPreference: form.visualPreference, files: uploads, updated: "刚刚" };
    setProfiles((current) => current.map((profile) => profile.id === updated.id ? updated : profile));
    setArchiveView("detail", updated);
    notify(t("档案已保存"));
  };

  if (view === "detail" && activeProfile) {
    return <><ProfileDetail profile={activeProfile} onBack={returnToList} onCreateTask={onCreateTask} onEdit={() => { setForm(formFromProfile(activeProfile)); setUploads(activeProfile.files); setView("edit"); }} onRename={(name) => { const updated = { ...activeProfile, name, updated: "刚刚" }; setProfiles((current) => current.map((profile) => profile.id === updated.id ? updated : profile)); setActiveProfile(updated); notify(t("档案已重命名")); }} onDuplicate={() => { const prefix = activeProfile.name.replace(/-\d+$/, ""); let index = 1; while (profiles.some((profile) => profile.name === `${prefix}-${index}`)) index += 1; const copiedProfile = { ...activeProfile, id: Date.now(), name: `${prefix}-${index}`, updated: "刚刚" }; setProfiles((current) => [copiedProfile, ...current]); notify(t("复制成功")); }} onDelete={() => { setProfiles((current) => current.filter((profile) => profile.id !== activeProfile.id)); runViewTransition(() => setArchiveView("list", null)); notify(t("档案已删除")); }} /><Toast message={toast} /></>;
  }

  if (view === "parsing") {
    return <CreatePage form={form} setForm={setForm} files={uploads} complete={complete} canSave={false} parsing parseProgress={parseProgress} editing={parseDestination === "edit"} onBack={() => setView(parseDestination)} onSelectFile={() => setView("parsing")} onRemoveFile={(id) => setUploads((current) => current.filter((file) => file.id !== id))} onReset={resetDraft} onSave={parseDestination === "edit" ? saveModification : save} onCancel={() => setView(parseDestination)} />;
  }

  if (view === "create") {
    return <>
      <CreatePage form={form} setForm={setForm} files={uploads} complete={complete} canSave={canSave} animateEntry={animateCreateEntry} onBack={() => setView("list")} onSelectFile={() => setUploadOpen(true)} onRemoveFile={(id) => setUploads((current) => current.filter((file) => file.id !== id))} onReset={resetDraft} onSave={save} onCancel={() => setView("list")} />
      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onConfirm={(files) => { setUploadOpen(false); setUploads(files); setParseDestination("create"); setView("parsing"); }} />}
    </>;
  }

  if (view === "edit" && activeProfile) {
    return <><CreatePage form={form} setForm={setForm} files={uploads} complete={complete} canSave={canSave} editing onBack={() => setView("detail")} onSelectFile={() => setUploadOpen(true)} onRemoveFile={(id) => setUploads((current) => current.filter((file) => file.id !== id))} onReset={resetDraft} onSave={saveModification} onCancel={() => setView("detail")} />{uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} onConfirm={(files) => { setUploadOpen(false); setUploads(files); setParseDestination("edit"); setView("parsing"); }} />}<Toast message={toast} /></>;
  }

  const hasProfiles = visibleProfiles.length > 0;
  return (
    <main className="profile-region">
      <motion.div
        className="profile-shell"
        data-node-id={hasProfiles ? "343:5708" : "146:11417"}
        variants={primaryPageEntrance}
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
      >
        <motion.section className="profile-top" aria-labelledby="profile-title" variants={primaryPageEntranceItem}>
          <div className="profile-heading-art" aria-hidden="true"><img className="profile-heading-art__cut" src={profileArt("header-bg.png")} alt="" /></div>
          <div className="profile-heading"><div><h1 id="profile-title">{t("业务偏好档案")}</h1><p>{t("保存长期稳定的市场、品类、风格和经营边界，供任务自动应用。")}</p></div><button className="profile-button profile-button--primary" type="button" onClick={openCreate}><FigmaIcon name="plus" size={20} />{t("新建档案")}</button></div>
          <label className="profile-search"><FigmaIcon name="search" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("输入档案名称搜索")} />{query && <button className="profile-search__clear" type="button" aria-label={t("清空搜索")} onClick={(event) => { event.preventDefault(); setQuery(""); }}><FigmaIcon name="delete" size={20} /></button>}</label>
        </motion.section>
        <motion.section className="profile-content" aria-live="polite" variants={primaryPageEntranceItem}>
          {!hasProfiles || filteredProfiles.length === 0 ? (
            <div className="profile-empty-card"><div className="profile-empty-content"><div className="profile-empty-art"><img className="profile-empty-art__cut" src={profileArt("EmptyIcon.png")} alt="" /></div><div className="profile-empty-copy"><strong>{t(query ? "没有匹配的档案" : "还没有业务偏好档案")}</strong><span>{t(query ? "试试其他名称，或创建一个新的档案" : "保存品类、价格段、国家和目标年龄，后续任务无需重复输入")}</span></div></div>{!query && <button className="profile-button profile-button--primary profile-button--small" type="button" onClick={openCreate}>{t("创建第一个档案")}</button>}</div>
          ) : <div className="profile-list">{filteredProfiles.map((profile) => <ProfileCard profile={profile} key={profile.id} onDetail={() => openDetail(profile)} onCreateTask={onCreateTask} onRename={(name) => { setProfiles((current) => current.map((item) => item.id === profile.id ? { ...item, name, updated: "刚刚" } : item)); notify(t("档案已重命名")); }} onDuplicate={() => { const prefix = profile.name.replace(/-\d+$/, ""); let index = 1; while (profiles.some((item) => item.name === `${prefix}-${index}`)) index += 1; setProfiles((current) => [{ ...profile, id: Date.now(), name: `${prefix}-${index}`, updated: "刚刚" }, ...current]); notify(t("复制成功")); }} onDelete={() => { setProfiles((current) => current.filter((item) => item.id !== profile.id)); notify(t("档案已删除")); }} />)}<div className="profile-list-end"><i />{t("没有更多内容了")}<i /></div></div>}
        </motion.section>
      </motion.div><Toast message={toast} />
    </main>
  );
}

function CreatePage({ form, setForm, files, complete, canSave, parsing, editing, animateEntry = false, parseProgress = 0, onBack, onSelectFile, onRemoveFile, onReset, onSave, onCancel }: { form: Form; setForm: (form: Form) => void; files: LocalUpload[]; complete: number; canSave: boolean; parsing?: boolean; editing?: boolean; animateEntry?: boolean; parseProgress?: number; onBack: () => void; onSelectFile: () => void; onRemoveFile: (id: string) => void; onReset: () => void; onSave: () => void; onCancel: () => void; }) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const change = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });
  const category = (value: string) => change("category", form.category.includes(value) ? form.category.filter((item) => item !== value) : [...form.category, value]);
  const hasFormContent = Object.values(form).some((value) => Array.isArray(value) ? value.length > 0 : Boolean(value));
  const hasResettableContent = hasFormContent || files.length > 0;
  return (
    <main className="profile-region profile-editor-region">
      <motion.button className="profile-back profile-back--edge" type="button" onClick={onBack} variants={primaryPageEntranceItem} initial={reduceMotion || !animateEntry ? false : "hidden"} animate="visible"><FigmaIcon name="arrow-left" size={20} />{t("返回")}</motion.button>
      <motion.div className="profile-editor-shell" data-node-id={parsing ? "328:5431" : "301:68938"} variants={primaryPageEntrance} initial={reduceMotion || !animateEntry ? false : "hidden"} animate="visible">
      <motion.header className="profile-editor-header" variants={primaryPageEntranceItem}><h1>{t(editing ? "编辑业务偏好档案" : "创建业务偏好档案")}</h1><p>{t("保存不同任务中重复使用的业务范围，系统将在任务开始时自动应用")}</p></motion.header>
      <motion.section className="profile-autofill" variants={primaryPageEntranceItem}><div className="profile-form-label">{t("智能预填")}</div><p><span aria-hidden="true">💡</span>{t("系统只预填资料中明确提到的信息，未提及的字段将保持为空")}</p><UploadPanel files={files} parsed={!parsing && files.length > 0} parsing={parsing} onSelect={onSelectFile} onRemove={onRemoveFile} /></motion.section>
      {parsing && <motion.div variants={primaryPageEntranceItem}><ParsingPanel progress={parseProgress} /></motion.div>}
      <motion.form className="profile-form" variants={primaryPageEntranceItem} onSubmit={(event) => { event.preventDefault(); onSave(); }}>
        <label className="profile-form-field"><span className="profile-form-label">{t("档案名称")}<b>*</b></span><input value={form.name} onChange={(event) => change("name", event.target.value)} placeholder={t("示例：通勤女装档案")} /></label>
        <h2>{t("业务范围")}</h2>
        <div className="profile-form-grid">
          <div className="profile-form-field"><span className="profile-form-label">{t("品类")}<b>*</b></span><div className="profile-choice-row">{["男装", "女装", "童装"].map((value) => <button className={form.category.includes(value) ? "is-active" : ""} type="button" onClick={() => category(value)} key={value}>{t(value)}</button>)}</div></div>
          <div className="profile-form-field"><span className="profile-form-label">{t("价格段")}<b>*</b></span><div className="profile-price-row"><input value={form.minPrice} onChange={(event) => change("minPrice", event.target.value)} placeholder={t("最低价")} inputMode="numeric" /><em>–</em><input value={form.maxPrice} onChange={(event) => change("maxPrice", event.target.value)} placeholder={t("最高价")} inputMode="numeric" /><CurrencySelect value={form.currency} onChange={(value) => change("currency", value)} /></div></div>
          <SelectField label="国家" required values={form.countries} placeholder="选择国家" options={["中国", "日本", "韩国", "美国", "欧洲", "非洲"]} onChange={(value) => change("countries", value)} menuLabel="选择国家（支持多选）" />
          <SelectField label="年龄段" required values={form.ages} placeholder="选择年龄段" options={["0–18岁", "19–24岁", "25–34岁", "35–44岁", "45–65岁"]} onChange={(value) => change("ages", value)} multi={false} display="text" menuLabel="选择年龄段" />
        </div>
        <TagInputField label="渠道" values={form.channels} placeholder="输入渠道名称，按回车确认" onChange={(value) => change("channels", value)} />
        <TagInputField label="参考品牌" values={form.brands} placeholder="输入品牌名称，按回车确认" onChange={(value) => change("brands", value)} />
        <label className="profile-form-field profile-form-visual-preference" data-node-id="840:51052">
          <span className="profile-form-label">{t("视觉偏好")}</span>
          <textarea
            data-node-id="840:51054"
            value={form.visualPreference}
            onChange={(event) => change("visualPreference", event.target.value)}
            placeholder={t("描述偏好的色彩、廓形、面料、细节、模特、构图或需要避免的视觉表达;支持上传资料后自动回填")}
          />
        </label>
      </motion.form>
      <motion.div className="profile-form-footer-region" data-node-id="343:5706" variants={primaryPageEntranceFadeItem}>
        <footer className="profile-form-footer" data-node-id="328:9406">
          <button className="profile-button profile-button--outline" type="button" disabled={!hasResettableContent} onClick={onReset}><FigmaIcon name="reset" size={20} />{t("重置")}</button>
          <span>{t("已完成")} <b>{complete} / 5</b> {t("项必填内容")}</span>
          <div><button className="profile-button profile-button--secondary" type="button" onClick={onCancel}>{t("取消")}</button><button className="profile-button profile-button--primary" type="button" disabled={!canSave} onClick={onSave}>{t(editing ? "保存修改" : "保存档案")}</button></div>
        </footer>
      </motion.div>
      </motion.div>
    </main>
  );
}

function ParsingPanel({ progress }: { progress: number }) {
  const { t } = useI18n();
  const tasks = ["读取日本通勤女装资料包.pdf", "提取商品企划与价格信息", "识别品类、国家、年龄段与渠道"];
  const completed = progress === 100 ? tasks.length : Math.min(tasks.length - 1, Math.floor(progress / 34));
  const successIcon = assetUrl("assets/figma-icons/success.svg");
  const loadingIcon = assetUrl("assets/figma-icons/demand-loading.svg");
  return <section className="profile-parsing" data-node-id="328:5908" aria-live="polite" aria-label={`${t("正在解析资料包")} ${progress}%`}><header><strong>{t(progress === 100 ? "资料解析完成" : "正在解析资料包")}</strong><div className="profile-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><i><b style={{ transform: `scaleX(${progress / 100})` }} /></i><span>{progress}%</span></div></header><ul>{tasks.map((task, index) => { const isComplete = index < completed || progress === 100; const isCurrent = !isComplete && index === completed; return <li className={isComplete ? "is-complete" : isCurrent ? "is-current" : ""} key={task} title={t(task)}><span>{isComplete ? <img src={successIcon} alt="" /> : isCurrent ? <img className="profile-parsing__loading" src={loadingIcon} alt="" /> : <i />}</span><span>{t(task)}</span></li>; })}</ul></section>;
}

function UploadModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (files: LocalUpload[]) => void }) {
  const { t } = useI18n();
  const [files, setFiles] = useState<LocalUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const addFiles = (incoming: FileList | File[]) => {
    const remaining = Math.max(0, 10 - files.length);
    const additions = Array.from(incoming).slice(0, remaining).map((file) => ({ id: `${file.name}-${file.lastModified}-${Math.random()}`, name: file.name, preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined }));
    if (additions.length) setFiles((current) => [...current, ...additions]);
  };
  const removeFile = (id: string) => setFiles((current) => current.filter((file) => file.id !== id));
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  return <div className="profile-confirm-backdrop profile-upload-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="profile-upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title"><button className="profile-confirm__close" type="button" aria-label={t("关闭")} onClick={onClose}><FigmaIcon name="close" size={20} /></button><h2 id="upload-title">{t("上传资料")}</h2><p>{t("系统只预填资料中明确提到的信息，未提及的字段将保持为空")}</p><input ref={inputRef} className="profile-file-input" type="file" multiple accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" onChange={(event) => { if (event.target.files) addFiles(event.target.files); event.target.value = ""; }} /><button className={`profile-dropzone ${dragging ? "is-dragging" : ""}`} type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { event.preventDefault(); setDragging(false); }} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files); }}><img src={profileArt("empty-icon-file.png")} alt="" /><strong>{t(dragging ? "释放文件即可上传" : "拖放文件到此处，或点击选择")}</strong><span>{t("支持 PDF、PPT、Word、Excel、CSV、JPG、PNG 格式")}</span></button>{files.length > 0 && <div className="profile-upload-file-list">{files.map((file) => <UploadFileRow key={file.id} name={file.name} preview={file.preview} onRemove={() => removeFile(file.id)} />)}</div>}<footer><button className="profile-button profile-button--secondary" type="button" onClick={onClose}>{t("取消")}</button><button className="profile-button profile-button--primary" type="button" disabled={!files.length} onClick={() => onConfirm(files)}>{t("开始解析")}</button></footer></section></div>;
}

function ProfileActionDialog({ mode, profile, name, titleId, onNameChange, onClose, onRename, onDelete }: { mode: "rename" | "delete"; profile: Profile; name: string; titleId: string; onNameChange: (name: string) => void; onClose: () => void; onRename: (name: string) => void; onDelete: () => void }) {
  const { t } = useI18n();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="profile-confirm-backdrop profile-action-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="profile-action-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onPointerDown={(event) => event.stopPropagation()}>
        <h2 id={titleId}>{t(mode === "rename" ? "重命名档案" : "删除档案")}</h2>
        {mode === "rename" ? <><p>{t("修改后将用于后续任务中选择此档案。")}</p><input autoFocus value={name} onChange={(event) => onNameChange(event.target.value)} placeholder={t("请输入档案名称")} /></> : <p>{t("确认删除「{name}」吗？删除后不可恢复。", { name: profile.name })}</p>}
        <footer data-node-id="444:90547">
          <button className="profile-button profile-button--secondary" type="button" autoFocus={mode === "delete"} onClick={onClose}>{t("取消")}</button>
          <button className={`profile-button ${mode === "delete" ? "profile-button--danger" : "profile-button--primary"}`} type="button" disabled={mode === "rename" && !name.trim()} onClick={() => { if (mode === "rename") onRename(name.trim()); else onDelete(); onClose(); }}>{t(mode === "rename" ? "确认" : "删除")}</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function ProfileTaskCreateMenu({ profile, onCreateTask }: { profile: Profile; onCreateTask?: (profile: Profile, taskType: ProfileTaskType) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLSpanElement>(null);
  useDismissableLayer(open, menuRef, () => setOpen(false));
  const options: { value: ProfileTaskType; label: string }[] = [
    { value: "new-product", label: "新品企划" },
    { value: "customer-proposal", label: "客户提案" },
  ];

  return (
    <span className={`profile-task-create ${open ? "is-open" : ""}`} ref={menuRef}>
      <button
        className="profile-button profile-button--primary profile-button--small"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {t("使用此档案新建任务")}
      </button>
      {open ? (
        <span className="profile-detail-menu profile-task-type-menu" role="menu" aria-label={t("选择任务类型")}>
          <span className="profile-task-type-menu__label">{t("选择任务类型")}</span>
          {options.map((option) => (
            <button
              type="button"
              role="menuitem"
              key={option.value}
              onClick={() => {
                setOpen(false);
                onCreateTask?.(profile, option.value);
              }}
            >
              <span>{t(option.label)}</span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

function ProfileCard({ profile, onDetail, onCreateTask, onRename, onDuplicate, onDelete }: { profile: Profile; onDetail: () => void; onCreateTask?: (profile: Profile, taskType: ProfileTaskType) => void; onRename: (name: string) => void; onDuplicate: () => void; onDelete: () => void }) {
  const { locale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(profile.name);
  const menuRef = useRef<HTMLSpanElement>(null);
  useDismissableLayer(menuOpen, menuRef, () => setMenuOpen(false));
  const separator = locale === "en-US" ? ", " : "、";
  const localizedList = (values: string[]) => values.map((value) => t(value)).join(separator);
  const localizedChannels = profile.channels.map((value) => t(value));
  const channelSummary = localizedChannels.length > 3
    ? `${localizedChannels.slice(0, 3).join(separator)} +${localizedChannels.length - 3}`
    : localizedChannels.join(separator);
  const visualPreference = profile.visualPreference.trim();

  return (
    <article className={`profile-card ${menuOpen ? "is-menu-open" : ""}`} style={sharedTransitionStyle(`profile-card-${profile.id}`)}>
      <header>
        <strong title={profile.name} style={sharedTransitionStyle(`profile-title-${profile.id}`)}>{profile.name}</strong>
        <span>{t("更新于")} {t(profile.updated)}</span>
        <small>{t("资料")} {profile.files.length} {t("份")}</small>
      </header>
      <div className="profile-card__body">
        <div>
          <AdaptiveTagList values={profile.category} />
          <p>{profile.price}</p>
          <p title={localizedList(profile.countries)}>{localizedList(profile.countries)}</p>
          <p title={localizedList(profile.ages)}>{localizedList(profile.ages)}</p>
          <p title={localizedList(profile.channels)}>{channelSummary}</p>
          {visualPreference ? <p title={visualPreference}>{t("视觉偏好")}：{visualPreference}</p> : null}
        </div>
        <div className="profile-card__actions">
          <ProfileTaskCreateMenu profile={profile} onCreateTask={onCreateTask} />
          <button className="profile-button profile-button--secondary profile-button--small" type="button" onClick={onDetail}>{t("查看详情")}</button>
          <span className="profile-detail-more" ref={menuRef}>
            <button className="profile-icon-button" type="button" aria-label={t("更多")} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><FigmaIcon name="more-horizontal" size={20} /></button>
            {menuOpen && <span className="profile-detail-menu profile-card-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setName(profile.name); setDialog("rename"); setMenuOpen(false); }}><FigmaIcon name="modify" size={16} /><span>{t("重命名")}</span></button>
              <button type="button" role="menuitem" onClick={() => { onDuplicate(); setMenuOpen(false); }}><FigmaIcon name="copy" size={16} /><span>{t("复制档案")}</span></button>
              <button className="is-danger" type="button" role="menuitem" onClick={() => { setDialog("delete"); setMenuOpen(false); }}><FigmaIcon name="trash" size={16} /><span>{t("删除")}</span></button>
            </span>}
          </span>
        </div>
      </div>
      {dialog && <ProfileActionDialog mode={dialog} profile={profile} name={name} titleId={`card-action-${profile.id}`} onNameChange={setName} onClose={() => setDialog(null)} onRename={onRename} onDelete={onDelete} />}
    </article>
  );
}

function ProfileDetail({ profile, onBack, onCreateTask, onEdit, onRename, onDuplicate, onDelete }: { profile: Profile; onBack: () => void; onCreateTask?: (profile: Profile, taskType: ProfileTaskType) => void; onEdit: () => void; onRename: (name: string) => void; onDuplicate: () => void; onDelete: () => void }) {
  const { locale, t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"rename" | "delete" | null>(null);
  const [name, setName] = useState(profile.name);
  const menuRef = useRef<HTMLSpanElement>(null);
  useDismissableLayer(menuOpen, menuRef, () => setMenuOpen(false));
  const separator = locale === "en-US" ? ", " : "、";
  const localizedList = (values: string[]) => values.map((value) => t(value)).join(separator);
  const cells = [
    { label: "品类", value: localizedList(profile.category) },
    { label: "价格段", value: profile.price },
    { label: "国家", value: localizedList(profile.countries) },
    { label: "年龄段", value: localizedList(profile.ages) },
    { label: "渠道", value: localizedList(profile.channels), fullWidth: true },
    { label: "参考品牌", value: profile.brands.length ? localizedList(profile.brands) : t("未填写"), fullWidth: true },
    { label: "视觉偏好", value: profile.visualPreference.trim() || t("未填写"), fullWidth: true },
  ];
  return <main className="profile-region profile-editor-region profile-scene"><button className="profile-back profile-back--edge" type="button" onClick={onBack}><FigmaIcon name="arrow-left" size={20} />{t("返回")}</button><div className="profile-editor-shell profile-detail-shell" data-node-id="333:13015"><div className="profile-detail-stage" style={sharedTransitionStyle(`profile-card-${profile.id}`)}><header className="profile-detail-header"><div><h1 title={profile.name} style={sharedTransitionStyle(`profile-title-${profile.id}`)}>{profile.name}</h1><p>{t("用于任务中的默认业务范围与生成边界")}</p></div><div><ProfileTaskCreateMenu profile={profile} onCreateTask={onCreateTask} /><button className="profile-button profile-button--secondary profile-button--small" type="button" onClick={onEdit}>{t("编辑")}</button><span className="profile-detail-more" ref={menuRef}><button className="profile-icon-button" type="button" aria-label={t("更多")} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><FigmaIcon name="more-horizontal" size={20} /></button>{menuOpen && <span className="profile-detail-menu" role="menu"><button type="button" role="menuitem" onClick={() => { setName(profile.name); setDialog("rename"); setMenuOpen(false); }}><FigmaIcon name="modify" size={16} /><span>{t("重命名")}</span></button><button type="button" role="menuitem" onClick={() => { onDuplicate(); setMenuOpen(false); }}><FigmaIcon name="copy" size={16} /><span>{t("复制档案")}</span></button><button className="is-danger" type="button" role="menuitem" onClick={() => { setDialog("delete"); setMenuOpen(false); }}><FigmaIcon name="trash" size={16} /><span>{t("删除")}</span></button></span>}</span></div></header><section className="profile-detail-grid" data-node-id="333:13055">{cells.map(({ label, value, fullWidth }) => <div className={fullWidth ? "profile-detail-grid__full-width" : undefined} key={label}><span>{t(label)}</span><strong title={value}>{value}</strong></div>)}</section><section className="profile-source-card" data-node-id="333:13561"><div className="profile-source-card__header"><span>{t("资料包")}</span></div>{profile.files.length ? <div className="profile-source-card__files">{profile.files.map((file) => <UploadFileRow key={file.id} name={file.name} preview={file.preview} />)}</div> : <span className="profile-detail__empty">{t("未上传资料")}</span>}</section></div></div>{dialog && <ProfileActionDialog mode={dialog} profile={profile} name={name} titleId="profile-action-title" onNameChange={setName} onClose={() => setDialog(null)} onRename={onRename} onDelete={onDelete} />}</main>;
}
