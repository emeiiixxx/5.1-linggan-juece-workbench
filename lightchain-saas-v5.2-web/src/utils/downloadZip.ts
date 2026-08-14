type ZipAsset = {
  name: string;
  url: string;
};

const encoder = new TextEncoder();

const crcTable = Array.from({ length: 256 }, (_, value) => {
  let crc = value;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const zipHeader = (size: number) => {
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  return {
    bytes,
    u16(offset: number, value: number) { view.setUint16(offset, value, true); },
    u32(offset: number, value: number) { view.setUint32(offset, value, true); },
  };
};

const asBlobPart = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

export async function downloadImageZip(filename: string, assets: readonly ZipAsset[]) {
  const files = await Promise.all(assets.map(async (asset) => {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Unable to download ${asset.url}`);
    return { name: asset.name, data: new Uint8Array(await response.arrayBuffer()) };
  }));

  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const local = zipHeader(30);
    local.u32(0, 0x04034b50);
    local.u16(4, 20);
    local.u16(6, 0x0800);
    local.u16(8, 0);
    local.u32(14, crc);
    local.u32(18, file.data.byteLength);
    local.u32(22, file.data.byteLength);
    local.u16(26, name.byteLength);
    local.u16(28, 0);
    localParts.push(asBlobPart(local.bytes), asBlobPart(name), asBlobPart(file.data));

    const central = zipHeader(46);
    central.u32(0, 0x02014b50);
    central.u16(4, 20);
    central.u16(6, 20);
    central.u16(8, 0x0800);
    central.u16(10, 0);
    central.u32(16, crc);
    central.u32(20, file.data.byteLength);
    central.u32(24, file.data.byteLength);
    central.u16(28, name.byteLength);
    central.u16(30, 0);
    central.u16(32, 0);
    central.u16(34, 0);
    central.u16(36, 0);
    central.u32(38, 0);
    central.u32(42, offset);
    centralParts.push(asBlobPart(central.bytes), asBlobPart(name));

    offset += local.bytes.byteLength + name.byteLength + file.data.byteLength;
  }

  const centralSize = centralParts.reduce((total, part) => total + (part as ArrayBuffer).byteLength, 0);
  const end = zipHeader(22);
  end.u32(0, 0x06054b50);
  end.u16(8, files.length);
  end.u16(10, files.length);
  end.u32(12, centralSize);
  end.u32(16, offset);
  end.u16(20, 0);

  const blob = new Blob([...localParts, ...centralParts, asBlobPart(end.bytes)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
