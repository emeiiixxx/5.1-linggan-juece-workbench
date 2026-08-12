import { useEffect, useRef, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { assetUrl } from "../utils/assets";
import { gsap, gsapMotion, prefersReducedMotion, useGSAP } from "../motion/gsap";
import { Button } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";

type ImageSelectionProps = {
  src: string;
  alt: string;
  selected: boolean;
  favorited?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onPreview: () => void;
  onFavorite: () => void;
  onDownload: () => void;
};

const actionIcons = {
  preview: assetUrl("assets/figma-icons/view-full-image.svg"),
  favorite: assetUrl("assets/figma-icons/favorite.svg"),
  download: assetUrl("assets/figma-icons/download.svg"),
};

export function ImageActionBar({ favorited = false, onPreview, onFavorite, onDownload }: {
  favorited?: boolean;
  onPreview: () => void;
  onFavorite: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="image-action-bar" onClick={(event) => event.stopPropagation()}>
      <IconControl label="查看大图" size="small" tooltipPlacement="top" onClick={(event) => runAction(event, onPreview)}>
        <img className="image-action-bar__icon image-action-bar__icon--preview" src={actionIcons.preview} alt="" />
      </IconControl>
      <IconControl label={favorited ? "取消收藏" : "收藏到资源库"} size="small" tooltipPlacement="top" selected={favorited} onClick={(event) => runAction(event, onFavorite)}>
        <img className="image-action-bar__icon image-action-bar__icon--favorite" src={actionIcons.favorite} alt="" />
      </IconControl>
      <IconControl label="下载图片" size="small" tooltipPlacement="top" onClick={(event) => runAction(event, onDownload)}>
        <img className="image-action-bar__icon image-action-bar__icon--download" src={actionIcons.download} alt="" />
      </IconControl>
    </div>
  );
}

export function CircleCheckbox({ checked, size = "large" }: { checked: boolean; size?: "small" | "large" }) {
  return (
    <span className={`circle-checkbox circle-checkbox--${size}`} aria-hidden="true">
      <img src={assetUrl(`assets/figma-icons/checkbox-circle-${checked ? "checked" : "unchecked"}.svg`)} alt="" />
      {checked ? <img className="circle-checkbox__check" src={assetUrl("assets/figma-icons/checkbox-check.svg")} alt="" /> : null}
    </span>
  );
}

function runAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
  event.stopPropagation();
  action();
}

export function ImageSelection({
  src,
  alt,
  selected,
  favorited = false,
  disabled = false,
  onSelect,
  onPreview,
  onFavorite,
  onDownload,
}: ImageSelectionProps) {
  return (
    <div className={`image-selection ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="image-selection__toggle"
        aria-label={`${selected ? "取消选择" : "选择"}${alt}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <img className="image-selection__asset" src={src} alt={alt} />
        {selected ? (
          <span className="image-selection__checkbox" aria-hidden="true">
            <CircleCheckbox checked />
          </span>
        ) : null}
      </button>
      <ImageActionBar favorited={favorited} onPreview={onPreview} onFavorite={onFavorite} onDownload={onDownload} />
    </div>
  );
}

export function MasonryImageSelection({
  src,
  alt,
  label,
  selected,
  disabled = false,
  onSelect,
  onPreview,
}: {
  src: string;
  alt: string;
  label: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  return (
    <div className={`masonry-image-selection ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="masonry-image-selection__toggle"
        aria-label={`${selected ? "取消选择" : "选择"}${alt}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <img src={src} alt={alt} />
        <span className="masonry-image-selection__title">{label}</span>
      </button>
      <IconControl
        className="masonry-image-selection__preview"
        label={`放大查看${alt}`}
        variant="tonal"
        size="small"
        onClick={(event) => runAction(event, onPreview)}
      >
        <img src={assetUrl("assets/figma-icons/view-full-image-tonal.svg")} alt="" />
      </IconControl>
    </div>
  );
}

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);

  useGSAP(() => {
    if (!backdropRef.current || !dialogRef.current || prefersReducedMotion()) return;
    gsap.timeline()
      .from(backdropRef.current, { autoAlpha: 0, duration: gsapMotion.fast, ease: "power2.out" })
      .from(dialogRef.current, { autoAlpha: 0, y: 14, scale: 0.988, duration: gsapMotion.duration, ease: gsapMotion.ease }, "<0.04");
  }, { scope: backdropRef });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={backdropRef} className="media-lightbox-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="media-lightbox" role="dialog" aria-modal="true" aria-labelledby="media-lightbox-title">
        <header className="media-lightbox__header">
          <h2 id="media-lightbox-title">{alt}</h2>
          <IconControl label="关闭大图" variant="ghost" autoFocus onClick={onClose}><FigmaIcon name="close" size={20} /></IconControl>
        </header>
        <div className="media-lightbox__content"><img src={src} alt={alt} /></div>
      </section>
    </div>,
    document.body,
  );
}

export type CandidateLightboxCategory = {
  id: string;
  label: string;
};

export type CandidateLightboxItem = {
  id: string;
  categoryId: string;
  code: string;
  src: string;
  title: string;
};

export function CandidateImageLightbox({
  categories,
  items,
  activeCategoryId,
  activeItemId,
  selectedIds,
  selectionDisabled = false,
  onCategoryChange,
  onNavigate,
  onToggleSelection,
  onClose,
}: {
  categories: readonly CandidateLightboxCategory[];
  items: readonly CandidateLightboxItem[];
  activeCategoryId: string;
  activeItemId: string;
  selectedIds: readonly string[];
  selectionDisabled?: boolean;
  onCategoryChange: (categoryId: string) => void;
  onNavigate: (itemId: string) => void;
  onToggleSelection: (itemId: string) => void;
  onClose: () => void;
}) {
  const visibleItems = items.filter((item) => item.categoryId === activeCategoryId);
  const activeIndex = Math.max(0, visibleItems.findIndex((item) => item.id === activeItemId));
  const activeItem = visibleItems[activeIndex] ?? items.find((item) => item.id === activeItemId);
  const activeCategory = categories.find((category) => category.id === activeItem?.categoryId);
  const selected = activeItem ? selectedIds.includes(activeItem.id) : false;
  const thumbnailStart = Math.min(
    Math.max(activeIndex - 4, 0),
    Math.max(visibleItems.length - 10, 0),
  );
  const thumbnailItems = visibleItems.slice(thumbnailStart, thumbnailStart + 10);
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const backdrop = backdropRef.current;
    const card = cardRef.current;
    const tip = tipRef.current;
    if (!backdrop || !card || !tip || prefersReducedMotion()) return;
    gsap.timeline()
      .from(backdrop, { autoAlpha: 0, duration: gsapMotion.fast, ease: "power2.out" })
      .from(".candidate-lightbox__tabs", { autoAlpha: 0, y: -8, duration: gsapMotion.duration, ease: gsapMotion.ease }, "<0.04")
      .from(card, { autoAlpha: 0, y: 14, scale: 0.988, duration: 0.52, ease: gsapMotion.ease }, "<0.02")
      .from(".candidate-lightbox__previous, .candidate-lightbox__next", { autoAlpha: 0, scale: 0.9, duration: 0.28, stagger: 0.04, ease: gsapMotion.ease }, "<0.12")
      .fromTo(tip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24, ease: "power2.out" }, "<")
      .to(tip, { autoAlpha: 0, duration: 0.28, ease: "power2.in", delay: 2.48 });
  }, { scope: backdropRef });

  useGSAP(() => {
    if (!cardRef.current || prefersReducedMotion()) return;
    gsap.fromTo(
      cardRef.current.querySelectorAll(".candidate-lightbox__media > img, .candidate-lightbox__information > *"),
      { autoAlpha: 0, x: 10 },
      { autoAlpha: 1, x: 0, duration: 0.34, stagger: 0.045, ease: gsapMotion.ease, clearProps: "opacity,visibility,transform" },
    );
  }, { scope: cardRef, dependencies: [activeItemId], revertOnUpdate: true });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const nextIndex = activeIndex + (event.key === "ArrowLeft" ? -1 : 1);
      const nextItem = visibleItems[nextIndex];
      if (!nextItem) return;
      event.preventDefault();
      onNavigate(nextItem.id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeIndex, onClose, onNavigate, visibleItems]);

  if (typeof document === "undefined" || !activeItem) return null;

  const move = (delta: number) => {
    const nextItem = visibleItems[activeIndex + delta];
    if (nextItem) onNavigate(nextItem.id);
  };

  return createPortal(
    <div
      ref={backdropRef}
      className="candidate-lightbox-backdrop"
      role="presentation"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <IconControl className="candidate-lightbox__close" label="关闭大图" variant="ghost" size="medium" autoFocus onClick={onClose}>
        <FigmaIcon name="close" size={20} />
      </IconControl>

      <div className="candidate-lightbox__tabs" role="tablist" aria-label="参考图类型">
        {categories.map((category) => (
          <button
            type="button"
            role="tab"
            className={activeCategoryId === category.id ? "is-selected" : ""}
            aria-selected={activeCategoryId === category.id}
            onClick={() => onCategoryChange(category.id)}
            key={category.id}
          >
            {category.label}
          </button>
        ))}
      </div>

      <span ref={tipRef} className="candidate-lightbox__tip" aria-live="polite">
        💡 Tips：支持按键盘 ← → 键切换图片，按 Esc 退出查看大图
      </span>

      <section
        ref={cardRef}
        className={`candidate-lightbox__card ${selected ? "is-selected" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={`查看大图：${activeItem.code} ${activeCategory?.label ?? activeItem.title}`}
      >
        <div className="candidate-lightbox__media">
          <img src={assetUrl(activeItem.src)} alt={`${activeItem.code} ${activeItem.title}`} />
          <button
            type="button"
            className="candidate-lightbox__selection-toggle"
            aria-label={`${selected ? "取消选择" : "选择"}${activeItem.code}`}
            aria-pressed={selected}
            disabled={selectionDisabled}
            onClick={() => onToggleSelection(activeItem.id)}
          >
            <CircleCheckbox checked={selected} />
          </button>
        </div>

        <footer className="candidate-lightbox__information">
          <div className="candidate-lightbox__copy">
            <strong>{activeItem.code} · {activeItem.title}</strong>
            <span>TikTok Shop US · USD 20.00</span>
            <div className="candidate-lightbox__badges" aria-label="素材标签">
              <small>Amazon US / TikTok Shop US</small>
              <small>2026年8月 / 2027年2月</small>
              <small>{activeCategory?.label ?? "连衣裙、裤装、上衣、套装"}</small>
            </div>
          </div>
          <div className="candidate-lightbox__actions">
            <Button variant="outline">查看来源</Button>
            <Button
              variant="outline"
              className="candidate-lightbox__select-button"
              data-node-id={selected ? "552:19802" : "568:69944"}
              disabled={selectionDisabled}
              aria-pressed={selected}
              onClick={() => onToggleSelection(activeItem.id)}
            >
              <FigmaIcon name={selected ? "heart-filled" : "heart-outline"} size={20} />
              {selected ? "取消喜欢" : "选择"}
            </Button>
          </div>
        </footer>
      </section>

      <IconControl
        className="candidate-lightbox__previous"
        label="上一张"
        variant="tonal"
        size="large"
        disabled={activeIndex === 0}
        onClick={() => move(-1)}
      >
        <FigmaIcon name="chevron-left" size={24} />
      </IconControl>
      <IconControl
        className="candidate-lightbox__next"
        label="下一张"
        variant="tonal"
        size="large"
        disabled={activeIndex === visibleItems.length - 1}
        onClick={() => move(1)}
      >
        <FigmaIcon name="chevron-right" size={24} />
      </IconControl>

      <div className="candidate-lightbox__thumbnails" aria-label="同类型参考图">
        {thumbnailItems.map((item) => (
          <button
            type="button"
            className={item.id === activeItem.id ? "is-active" : ""}
            aria-label={`查看 ${item.code}`}
            aria-current={item.id === activeItem.id ? "true" : undefined}
            onClick={() => onNavigate(item.id)}
            key={item.id}
          >
            <img src={assetUrl(item.src)} alt="" />
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
