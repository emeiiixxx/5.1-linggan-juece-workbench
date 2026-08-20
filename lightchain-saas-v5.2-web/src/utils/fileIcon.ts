const iconByExtension: Record<string, string> = {
  csv: "file-excel.svg",
  htm: "file-html.svg",
  html: "file-html.svg",
  log: "file-txt.svg",
  md: "file-txt.svg",
  pdf: "file-pdf.svg",
  pps: "file-ppt.svg",
  ppsx: "file-ppt.svg",
  ppt: "file-ppt.svg",
  pptx: "file-ppt.svg",
  rtf: "file-word.svg",
  txt: "file-txt.svg",
  doc: "file-word.svg",
  docx: "file-word.svg",
  xls: "file-excel.svg",
  xlsx: "file-excel.svg",
};

export function fileIconAssetPath(fileName: string) {
  const extensionIndex = fileName.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? fileName.slice(extensionIndex + 1).toLowerCase() : "";
  const iconName = iconByExtension[extension] ?? "file.svg";
  return `assets/figma-icons/${iconName}`;
}
