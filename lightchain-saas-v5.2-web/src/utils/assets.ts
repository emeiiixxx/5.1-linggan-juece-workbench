const optimizedAssets: Record<string, string> = {
  "assets/apparel-design/candidate-jacket.png": "assets/apparel-design/candidate-jacket.avif",
  "assets/apparel-design/generation-placeholder-1.png": "assets/apparel-design/generation-placeholder-1.avif",
  "assets/apparel-design/reference-jacket.png": "assets/apparel-design/reference-jacket.avif",
  "assets/figma-confirmed/candidate-gallery-look-01.png": "assets/figma-confirmed/candidate-gallery-look-01.avif",
  "assets/figma-confirmed/candidate-gallery-look-02.png": "assets/figma-confirmed/candidate-gallery-look-02.avif",
  "assets/figma-confirmed/candidate-reference-02.png": "assets/figma-confirmed/candidate-reference-02.avif",
  "assets/figma-confirmed/trend-direction-thumbnail.png": "assets/figma-confirmed/trend-direction-thumbnail.avif",
  "assets/figma-confirmed/trend-reference-primary.jpg": "assets/figma-confirmed/trend-reference-primary.avif",
  "assets/figma-icons/avatar.png": "assets/figma-icons/avatar.avif",
  "assets/new-product/new-product-direction-05.jpg": "assets/new-product/new-product-direction-05.avif",
  "assets/new-product/regenerated-look-02.jpg": "assets/new-product/regenerated-look-02.avif",
  "assets/new-product/regenerated-look-03.jpg": "assets/new-product/regenerated-look-03.avif",
  "assets/new-product/regenerated-look-04.jpg": "assets/new-product/regenerated-look-04.avif",
  "assets/plan-flow/reference-01.jpg": "assets/plan-flow/reference-01.avif",
  "assets/plan-flow/reference-04.jpg": "assets/plan-flow/reference-04.avif",
  "assets/plan-flow/reference-08.jpg": "assets/plan-flow/reference-08.avif",
};

export function assetUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${optimizedAssets[normalizedPath] ?? normalizedPath}`;
}
