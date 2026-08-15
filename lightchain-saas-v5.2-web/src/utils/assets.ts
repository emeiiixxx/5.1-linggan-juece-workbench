const optimizedAssets: Record<string, string> = {
  "assets/apparel-design/candidate-jacket.png": "assets/apparel-design/candidate-jacket-optimized.jpg?v=2",
  "assets/apparel-design/generation-placeholder-1.png": "assets/apparel-design/generation-placeholder-1-optimized.jpg?v=2",
  "assets/apparel-design/reference-jacket.png": "assets/apparel-design/reference-jacket-optimized.jpg?v=2",
  "assets/figma-confirmed/candidate-gallery-look-01.png": "assets/figma-confirmed/candidate-gallery-look-01-optimized.jpg?v=2",
  "assets/figma-confirmed/candidate-gallery-look-02.png": "assets/figma-confirmed/candidate-gallery-look-02-optimized.jpg?v=2",
  "assets/figma-confirmed/candidate-reference-02.png": "assets/figma-confirmed/candidate-reference-02-optimized.jpg?v=2",
  "assets/figma-confirmed/trend-direction-thumbnail.png": "assets/figma-confirmed/trend-direction-thumbnail-optimized.jpg?v=2",
  "assets/figma-confirmed/trend-reference-primary.jpg": "assets/figma-confirmed/trend-reference-primary-optimized.jpg?v=2",
  "assets/figma-icons/avatar.png": "assets/figma-icons/avatar-optimized.jpg?v=2",
  "assets/new-product/new-product-direction-05.jpg": "assets/new-product/new-product-direction-05-optimized.jpg?v=2",
  "assets/new-product/regenerated-look-02.jpg": "assets/new-product/regenerated-look-02-optimized.jpg?v=2",
  "assets/new-product/regenerated-look-03.jpg": "assets/new-product/regenerated-look-03-optimized.jpg?v=2",
  "assets/new-product/regenerated-look-04.jpg": "assets/new-product/regenerated-look-04-optimized.jpg?v=2",
  "assets/plan-flow/reference-01.jpg": "assets/plan-flow/reference-01-optimized.jpg?v=2",
  "assets/plan-flow/reference-04.jpg": "assets/plan-flow/reference-04-optimized.jpg?v=2",
  "assets/plan-flow/reference-08.jpg": "assets/plan-flow/reference-08-optimized.jpg?v=2",
};

export function assetUrl(path: string) {
  const normalizedPath = path.replace(/^\/+/, "");
  return `${import.meta.env.BASE_URL}${optimizedAssets[normalizedPath] ?? normalizedPath}`;
}
