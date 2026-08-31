import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { assetUrl } from "../utils/assets";
import { gsap, gsapMotion, prefersReducedMotion, useGSAP } from "../motion/gsap";
import { Button } from "./Button";
import { FigmaIcon } from "./FigmaIcon";
import { IconControl } from "./IconControl";
import { useI18n } from "../i18n";
import { useModalFocus } from "../hooks/useModalFocus";
import { CircleCheckbox } from "./CircleCheckbox";
import { ProgressiveImage } from "./ProgressiveImage";
import { TipEmoji } from "./TipEmoji";

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
  favoriteFilled: assetUrl("assets/figma-icons/favorite-filled-rounded.svg"),
  download: assetUrl("assets/figma-icons/download.svg"),
};

function FavoriteActionIcon({ filled }: { filled: boolean }) {
  return (
    <span className="candidate-lightbox__action-icon" aria-hidden="true">
      {filled ? <img src={actionIcons.favoriteFilled} alt="" /> : <FigmaIcon name="favorite" size={20} />}
    </span>
  );
}

export function ImageActionBar({ favorited = false, size = "small", onPreview, onFavorite, onDownload }: {
  favorited?: boolean;
  size?: "xsmall" | "small";
  onPreview?: () => void;
  onFavorite: () => void;
  onDownload: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="image-action-bar" onClick={(event) => event.stopPropagation()}>
      {onPreview ? (
        <IconControl label={t("查看大图")} size={size} tooltipPlacement="top" onClick={(event) => runAction(event, onPreview)}>
          <img className="image-action-bar__icon image-action-bar__icon--preview" src={actionIcons.preview} alt="" />
        </IconControl>
      ) : null}
      <IconControl label={t(favorited ? "取消收藏" : "收藏到资源库")} size={size} tooltipPlacement="top" selected={favorited} onClick={(event) => runAction(event, onFavorite)}>
        <img className="image-action-bar__icon image-action-bar__icon--favorite" src={actionIcons.favorite} alt="" />
      </IconControl>
      <IconControl label={t("下载图片")} size={size} tooltipPlacement="top" onClick={(event) => runAction(event, onDownload)}>
        <img className="image-action-bar__icon image-action-bar__icon--download" src={actionIcons.download} alt="" />
      </IconControl>
    </div>
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
  const { t } = useI18n();
  return (
    <div className={`image-selection ${selected ? "is-selected" : ""}`} data-message-meta="disabled">
      <button
        type="button"
        className="image-selection__toggle"
        aria-label={`${t(selected ? "取消选择" : "选择")} ${alt}`}
        aria-pressed={selected}
        disabled={disabled}
        onClick={onSelect}
      >
        <ProgressiveImage className="image-selection__asset" src={src} alt={alt} />
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
  previewOnly = false,
  disabled = false,
  loading = false,
  loadingLabel = "生成中...",
  onSelect,
  onPreview,
}: {
  src: string;
  alt: string;
  label: string;
  selected: boolean;
  previewOnly?: boolean;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className={`masonry-image-selection ${!previewOnly && selected ? "is-selected" : ""} ${loading ? "is-loading" : ""}`} data-message-meta="disabled" aria-busy={loading}>
      <button
        type="button"
        className="masonry-image-selection__toggle"
        aria-label={`${t(previewOnly ? "放大查看" : selected ? "取消选择" : "选择")} ${alt}`}
        aria-pressed={previewOnly ? undefined : selected}
        disabled={loading || (!previewOnly && disabled)}
        onClick={previewOnly ? onPreview : onSelect}
      >
        <ProgressiveImage src={src} alt={alt} />
        <span className="masonry-image-selection__title">{label}</span>
      </button>
      {loading ? (
        <span className="masonry-image-selection__loading" aria-live="polite">
          <img src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />
          <span>{loadingLabel}</span>
        </span>
      ) : (
        <IconControl
          className="masonry-image-selection__preview"
          label={`${t("放大查看")} ${alt}`}
          variant="tonal"
          size="small"
          onClick={(event) => runAction(event, onPreview)}
        >
          <img src={assetUrl("assets/figma-icons/view-full-image-tonal.svg")} alt="" />
        </IconControl>
      )}
    </div>
  );
}

export function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const { t } = useI18n();
  const backdropRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  useModalFocus(dialogRef, true, onClose);

  useGSAP(() => {
    if (!backdropRef.current || !dialogRef.current || prefersReducedMotion()) return;
    gsap.timeline()
      .from(backdropRef.current, { autoAlpha: 0, duration: gsapMotion.fast, ease: "power2.out" })
      .from(dialogRef.current, { autoAlpha: 0, y: 14, scale: 0.988, duration: gsapMotion.duration, ease: gsapMotion.ease }, "<0.04");
  }, { scope: backdropRef });

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={backdropRef} className="media-lightbox-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={dialogRef} className="media-lightbox" role="dialog" aria-modal="true" aria-labelledby="media-lightbox-title">
        <header className="media-lightbox__header">
          <h2 id="media-lightbox-title">{alt}</h2>
          <IconControl label={t("关闭大图")} variant="ghost" tooltipPlacement="left" autoFocus onClick={onClose}><FigmaIcon name="close" size={20} /></IconControl>
        </header>
        <div className="media-lightbox__content"><ProgressiveImage src={src} alt={alt} priority /></div>
      </section>
    </div>,
    document.body,
  );
}

export type ImageGalleryCategory = {
  id: string;
  label: string;
};

export type ImageGalleryItem = {
  id: string;
  categoryId: string;
  code: string;
  src: string;
  title: string;
  subtitle?: string;
  badges?: readonly string[];
  sourceUrl?: string;
  detailLines?: readonly string[];
  generationPrompt?: string;
};

export function ImageGalleryLightbox({
  title,
  categories,
  items,
  activeCategoryId,
  activeItemId,
  selectedIds,
  selectionDisabled = false,
  resultActions,
  referenceActions,
  hideSelection = false,
  copyMode = "full",
  presentation = "gallery",
  showCategories = true,
  onCategoryChange,
  onNavigate,
  onToggleSelection,
  onClose,
}: {
  title?: string;
  categories: readonly ImageGalleryCategory[];
  items: readonly ImageGalleryItem[];
  activeCategoryId: string;
  activeItemId: string;
  selectedIds: readonly string[];
  selectionDisabled?: boolean;
  resultActions?: {
    onDownload: (item: ImageGalleryItem) => void;
    onRegenerate?: (item: ImageGalleryItem) => void;
    regenerateDisabled?: boolean;
    regenerating?: boolean;
    regeneratingLabel?: string;
  };
  referenceActions?: {
    onDownload: (item: ImageGalleryItem) => void;
    onOpenSource: (item: ImageGalleryItem) => void;
  };
  hideSelection?: boolean;
  copyMode?: "full" | "title-only";
  presentation?: "gallery" | "reference" | "detail";
  showCategories?: boolean;
  onCategoryChange: (categoryId: string) => void;
  onNavigate: (itemId: string) => void;
  onToggleSelection: (itemId: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const isReferencePresentation = presentation === "reference";
  const isDetailPresentation = presentation === "reference" || presentation === "detail";
  const visibleItems = useMemo(
    () => showCategories ? items.filter((item) => item.categoryId === activeCategoryId) : items,
    [activeCategoryId, items, showCategories],
  );
  const activeIndex = Math.max(0, visibleItems.findIndex((item) => item.id === activeItemId));
  const activeItem = visibleItems[activeIndex] ?? items.find((item) => item.id === activeItemId);
  const activeCategory = categories.find((category) => category.id === activeItem?.categoryId);
  const selected = activeItem ? selectedIds.includes(activeItem.id) : false;
  const thumbnailItems = visibleItems;
  const backdropRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const thumbnailFrameRef = useRef<number | null>(null);
  const [thumbnailOverflow, setThumbnailOverflow] = useState({ left: false, right: false });
  const [favoritedItemIds, setFavoritedItemIds] = useState<Set<string>>(() => new Set());
  useModalFocus(backdropRef, true, onClose);

  const updateThumbnailOverflow = useCallback(() => {
    const thumbnails = thumbnailsRef.current;
    if (!thumbnails) return;
    const maxScrollLeft = thumbnails.scrollWidth - thumbnails.clientWidth;
    const nextOverflow = {
      left: thumbnails.scrollLeft > 1,
      right: maxScrollLeft - thumbnails.scrollLeft > 1,
    };
    setThumbnailOverflow((current) => current.left === nextOverflow.left && current.right === nextOverflow.right
      ? current
      : nextOverflow);
  }, []);

  const scheduleThumbnailOverflowUpdate = useCallback(() => {
    if (thumbnailFrameRef.current !== null) return;
    thumbnailFrameRef.current = window.requestAnimationFrame(() => {
      thumbnailFrameRef.current = null;
      updateThumbnailOverflow();
    });
  }, [updateThumbnailOverflow]);

  useGSAP(() => {
    const backdrop = backdropRef.current;
    const card = cardRef.current;
    const tip = tipRef.current;
    if (!backdrop || !card || !tip || prefersReducedMotion()) return;
    const timeline = gsap.timeline()
      .from(backdrop, { autoAlpha: 0, duration: gsapMotion.fast, ease: "power2.out" });
    if (showCategories && !isDetailPresentation) {
      timeline.from(".candidate-lightbox__tabs", { autoAlpha: 0, y: -8, duration: gsapMotion.duration, ease: gsapMotion.ease }, "<0.04");
    }
    timeline.from(card, { autoAlpha: 0, y: 14, scale: 0.988, duration: 0.52, ease: gsapMotion.ease }, "<0.02");
    if (!isDetailPresentation) {
      timeline.from(
        ".candidate-lightbox__previous, .candidate-lightbox__next",
        { autoAlpha: 0, scale: 0.9, duration: 0.28, stagger: 0.04, ease: gsapMotion.ease },
        "<0.12",
      );
    }
    timeline
      .fromTo(tip, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.24, ease: "power2.out" }, "<")
      .to(tip, { autoAlpha: 0, duration: 0.28, ease: "power2.in", delay: 2.48 });
  }, { scope: backdropRef, dependencies: [isDetailPresentation, showCategories] });

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
      if (isDetailPresentation) return;
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
  }, [activeIndex, isDetailPresentation, onNavigate, visibleItems]);

  useEffect(() => {
    const thumbnails = thumbnailsRef.current;
    if (!thumbnails) return;
    updateThumbnailOverflow();
    const resizeObserver = new ResizeObserver(scheduleThumbnailOverflowUpdate);
    resizeObserver.observe(thumbnails);
    return () => resizeObserver.disconnect();
  }, [scheduleThumbnailOverflowUpdate, thumbnailItems.length, updateThumbnailOverflow]);

  useEffect(() => () => {
    if (thumbnailFrameRef.current !== null) window.cancelAnimationFrame(thumbnailFrameRef.current);
  }, []);

  useEffect(() => {
    const thumbnails = thumbnailsRef.current;
    const activeThumbnail = thumbnails?.children.item(activeIndex);
    if (!thumbnails || !(activeThumbnail instanceof HTMLElement)) return;
    const thumbnailLeft = activeThumbnail.offsetLeft;
    const thumbnailRight = thumbnailLeft + activeThumbnail.offsetWidth;
    const viewportLeft = thumbnails.scrollLeft;
    const viewportRight = viewportLeft + thumbnails.clientWidth;
    if (thumbnailLeft >= viewportLeft && thumbnailRight <= viewportRight) return;
    thumbnails.scrollTo({
      left: thumbnailLeft - (thumbnails.clientWidth - activeThumbnail.offsetWidth) / 2,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [activeIndex, activeCategoryId]);

  if (typeof document === "undefined" || !activeItem) return null;

  const activeItemFavorited = favoritedItemIds.has(activeItem.id);
  const toggleFavorite = () => {
    setFavoritedItemIds((current) => {
      const next = new Set(current);
      if (next.has(activeItem.id)) next.delete(activeItem.id);
      else next.add(activeItem.id);
      return next;
    });
  };

  const move = (delta: number) => {
    const nextItem = visibleItems[activeIndex + delta];
    if (nextItem) onNavigate(nextItem.id);
  };

  const scrollThumbnails = (direction: -1 | 1) => {
    const thumbnails = thumbnailsRef.current;
    if (!thumbnails) return;
    thumbnails.scrollBy({
      left: direction * Math.max(thumbnails.clientWidth * 0.72, 160),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return createPortal(
    <div
      ref={backdropRef}
      className={`candidate-lightbox-backdrop ${showCategories ? "" : "candidate-lightbox-backdrop--flat"} ${isReferencePresentation ? "candidate-lightbox-backdrop--reference" : ""} ${presentation === "detail" ? "candidate-lightbox-backdrop--detail" : ""} ${title ? "candidate-lightbox-backdrop--titled" : ""}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-label={`${t("查看大图")}：${activeItem.code} ${activeCategory?.label ?? activeItem.title}`}
      tabIndex={-1}
    >
      {title ? (
        <header className="candidate-lightbox__header">
          <strong>{title}</strong>
        </header>
      ) : null}
      <IconControl className="candidate-lightbox__close" label={t("关闭大图")} variant="ghost" size="medium" tooltipPlacement="left" autoFocus onClick={onClose}>
        <FigmaIcon name="close" size={20} />
      </IconControl>

      {showCategories && !isDetailPresentation ? (
        <div className="candidate-lightbox__tabs" role="tablist" aria-label={t("参考图类型")}>
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
      ) : null}

      <span ref={tipRef} className="candidate-lightbox__tip" aria-live="polite">
        <TipEmoji size={16} />
        {isDetailPresentation
          ? "Tips：支持按 Esc 退出查看大图"
          : "Tips：支持按键盘 ← → 键切换图片，按 Esc 退出查看大图"}
      </span>

      <section
        ref={cardRef}
        className={`candidate-lightbox__card ${selected ? "is-selected" : ""}`}
        role="document"
      >
        <div className="candidate-lightbox__media" aria-busy={resultActions?.regenerating || undefined}>
          <ProgressiveImage src={assetUrl(activeItem.src)} alt={`${activeItem.code} ${activeItem.title}`} priority />
          {resultActions?.regenerating ? (
            <span className="masonry-image-selection__loading" aria-live="polite">
              <img src={assetUrl("assets/figma-icons/demand-loading.svg")} alt="" />
              <span>{resultActions.regeneratingLabel ?? t("生成中...")}</span>
            </span>
          ) : null}
          {!hideSelection ? (
            <button
              type="button"
              className="candidate-lightbox__selection-toggle"
              aria-label={`${t(selected ? "取消选择" : "选择")} ${activeItem.code}`}
              aria-pressed={selected}
              disabled={selectionDisabled}
              onClick={() => onToggleSelection(activeItem.id)}
            >
              <CircleCheckbox checked={selected} />
            </button>
          ) : null}
        </div>

        <footer className="candidate-lightbox__information">
          <div className="candidate-lightbox__copy">
            <strong>{activeItem.code} · {activeItem.title}</strong>
            {copyMode === "full" && (!isDetailPresentation || !activeItem.detailLines?.length) ? (
              <span>{activeItem.subtitle ?? "TikTok Shop US · USD 20.00"}</span>
            ) : null}
            {copyMode === "full" && !isDetailPresentation ? (
              <div className="candidate-lightbox__badges" aria-label={t("素材标签")}>
                {(activeItem.badges ?? ["Amazon US / TikTok Shop US", "2026年8月 / 2027年2月", activeCategory?.label ?? "连衣裙、裤装、上衣、套装"]).map((badge) => (
                  <small key={badge}>{badge}</small>
                ))}
              </div>
            ) : null}
            {copyMode === "full" && isDetailPresentation && activeItem.detailLines?.length ? (
              <span className="candidate-lightbox__detail-lines">
                {activeItem.detailLines.map((line) => <span key={line}>{line}</span>)}
              </span>
            ) : null}
            {copyMode === "full" && isDetailPresentation && activeItem.generationPrompt ? (
              <span className="candidate-lightbox__generation-prompt">{t("改款提示词")}：{activeItem.generationPrompt}</span>
            ) : null}
          </div>
          <div className="candidate-lightbox__actions">
            {resultActions ? (
              <>
                <Button variant="outline" aria-pressed={activeItemFavorited} onClick={toggleFavorite}>
                  <FavoriteActionIcon filled={activeItemFavorited} />
                  {t(activeItemFavorited ? "已收藏" : "收藏到资源库")}
                </Button>
                <Button variant="outline" onClick={() => resultActions.onDownload(activeItem)}>
                  <FigmaIcon name="download" size={20} />
                  {t("下载")}
                </Button>
                {resultActions.onRegenerate ? (
                  <Button
                    variant="outline"
                    disabled={resultActions.regenerateDisabled || resultActions.regenerating}
                    onClick={() => resultActions.onRegenerate?.(activeItem)}
                  >
                    <FigmaIcon name="regenerate-image" size={20} />
                    {t("重新生成")}
                  </Button>
                ) : null}
              </>
            ) : referenceActions ? (
              <>
                <Button variant="outline" onClick={() => referenceActions.onOpenSource(activeItem)}>
                  {t("查看来源")}
                </Button>
                <Button variant="outline" aria-pressed={activeItemFavorited} onClick={toggleFavorite}>
                  <FavoriteActionIcon filled={activeItemFavorited} />
                  {t(activeItemFavorited ? "已收藏" : "收藏到资源库")}
                </Button>
                <Button variant="outline" onClick={() => referenceActions.onDownload(activeItem)}>
                  <FigmaIcon name="download" size={20} />
                  {t("下载")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" aria-pressed={activeItemFavorited} onClick={toggleFavorite}>
                  <FavoriteActionIcon filled={activeItemFavorited} />
                  {t(activeItemFavorited ? "已收藏" : "收藏到资源库")}
                </Button>
                <Button variant="outline">{t("查看来源")}</Button>
              </>
            )}
            {!hideSelection ? (
              <Button
                variant="outline"
                className="candidate-lightbox__select-button"
                data-node-id={selected ? "552:19802" : "568:69944"}
                disabled={selectionDisabled}
                aria-pressed={selected}
                onClick={() => onToggleSelection(activeItem.id)}
              >
                {t(selected ? "取消选择" : "选择")}
              </Button>
            ) : null}
          </div>
        </footer>
      </section>

      {!isDetailPresentation ? (
        <>
          <IconControl
            className="candidate-lightbox__previous"
            label={t("上一张")}
            variant="tonal"
            size="large"
            disabled={activeIndex === 0}
            onClick={() => move(-1)}
          >
            <FigmaIcon name="chevron-left" size={24} />
          </IconControl>
          <IconControl
            className="candidate-lightbox__next"
            label={t("下一张")}
            variant="tonal"
            size="large"
            disabled={activeIndex === visibleItems.length - 1}
            onClick={() => move(1)}
          >
            <FigmaIcon name="chevron-right" size={24} />
          </IconControl>

          <div className={`candidate-lightbox__thumbnail-rail ${thumbnailOverflow.left ? "can-scroll-left" : ""} ${thumbnailOverflow.right ? "can-scroll-right" : ""}`}>
        {thumbnailOverflow.left ? (
          <IconControl className="candidate-lightbox__thumbnail-scroll candidate-lightbox__thumbnail-scroll--previous" label={t("向左查看更多缩略图")} variant="tonal" size="small" onClick={() => scrollThumbnails(-1)}>
            <FigmaIcon name="chevron-left" size={16} />
          </IconControl>
        ) : null}
        <div ref={thumbnailsRef} className="candidate-lightbox__thumbnails" aria-label={t(showCategories ? "同类型参考图" : "全部改款结果")} onScroll={scheduleThumbnailOverflowUpdate}>
          {thumbnailItems.map((item) => {
            const itemSelected = !hideSelection && selectedIds.includes(item.id);
            return (
              <button
                type="button"
                className={`${item.id === activeItem.id ? "is-active" : ""} ${itemSelected ? "is-selected" : ""}`.trim()}
                aria-label={`${t("查看")} ${item.code}${itemSelected ? `，${t("已选择")}` : ""}`}
                aria-current={item.id === activeItem.id ? "true" : undefined}
                onClick={() => onNavigate(item.id)}
                key={item.id}
              >
                <ProgressiveImage src={assetUrl(item.src)} alt="" />
                {itemSelected ? <span className="candidate-lightbox__thumbnail-selected" aria-hidden="true"><CircleCheckbox checked size="xsmall" /></span> : null}
              </button>
            );
          })}
        </div>
        {thumbnailOverflow.right ? (
          <IconControl className="candidate-lightbox__thumbnail-scroll candidate-lightbox__thumbnail-scroll--next" label={t("向右查看更多缩略图")} variant="tonal" size="small" onClick={() => scrollThumbnails(1)}>
            <FigmaIcon name="chevron-right" size={16} />
          </IconControl>
        ) : null}
          </div>
        </>
      ) : null}
    </div>,
    document.body,
  );
}
