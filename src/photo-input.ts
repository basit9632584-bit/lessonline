export function inspectPhotoDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  if ([137,80,78,71,13,10,26,10].every((byte,index) => bytes[index] === byte)) {
    if (bytes.length < 24 || String.fromCharCode(...bytes.slice(12,16)) !== 'IHDR') return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] !== 255 || bytes[1] !== 216) return null;
  let offset = 2;
  while (offset + 3 < bytes.length) {
    if (bytes[offset++] !== 255) return null;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 217 || marker === 218) return null;
    if (marker === 216 || marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (offset + 1 >= bytes.length) return null;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return null;
    if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) {
      if (length < 7) return null;
      return { height: bytes[offset + 3] * 256 + bytes[offset + 4], width: bytes[offset + 5] * 256 + bytes[offset + 6] };
    }
    offset += length;
  }
  return null;
}
function checkDimensions(width: number, height: number) {
  if (Math.min(width, height) < 32) throw new Error('Choose an image at least 32 pixels wide and tall.');
  if (Math.max(width, height) > 8192 || width * height > 16_000_000) throw new Error('Choose an image no larger than 8,192 pixels per side and 16 million pixels. Crop the question first.');
}
export type PreparedPhoto = { image: string; width: number; height: number; originalWidth: number; originalHeight: number; resized: boolean };
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('Choose one PNG or JPEG image.');
  if (file.size > 5 * 1024 * 1024 || file.size === 0) throw new Error('Choose a PNG or JPEG image up to 5 MB.');
  const header = new Uint8Array(await file.arrayBuffer());
  const png = [137,80,78,71,13,10,26,10].every((byte,index) => header[index] === byte);
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255;
  if (!png && !jpeg) throw new Error('The file is not a readable PNG or JPEG image.');
  const dimensions = inspectPhotoDimensions(header);
  if (!dimensions) throw new Error('The image dimensions could not be read. Choose another PNG or JPEG.');
  checkDimensions(dimensions.width, dimensions.height);
  const url = URL.createObjectURL(file);
  const picture = new Image();
  try {
    picture.src = url;
    try { await picture.decode(); } catch { throw new Error('This image could not be opened. Choose another PNG or JPEG.'); }
    const originalWidth = picture.naturalWidth, originalHeight = picture.naturalHeight;
    checkDimensions(originalWidth, originalHeight);
    const longest = Math.min(1600, Math.max(originalWidth, originalHeight));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image preparation is unavailable in this browser. Paste the question instead.');
    const ratio = longest / Math.max(originalWidth, originalHeight);
    canvas.width = Math.max(1, Math.round(originalWidth * ratio));
    canvas.height = Math.max(1, Math.round(originalHeight * ratio));
    if (Math.min(canvas.width, canvas.height) < 32) throw new Error('This image is too wide or tall to keep the question readable. Crop a less narrow image of the question.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(picture, 0, 0, canvas.width, canvas.height);
    // Reading is local: preserve detail instead of shrinking to an upload cap.
    const image = canvas.toDataURL('image/png');
    if (!image.startsWith('data:image/png;base64,') || image.length <= 'data:image/png;base64,'.length) throw new Error('Lossless image preparation is unavailable in this browser. Paste the question instead.');
    return { image, width: canvas.width, height: canvas.height, originalWidth, originalHeight, resized: canvas.width !== originalWidth || canvas.height !== originalHeight };
  } finally { picture.src = ''; URL.revokeObjectURL(url); }
}
export function validatePhotoResponse(value: unknown): { text: string; issues: string[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The reader returned an invalid response. Your image and text are preserved.');
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(',') !== 'issues,text' || typeof data.text !== 'string' || !data.text.trim() || data.text.length > 6000 || !Array.isArray(data.issues) || data.issues.length > 8 || data.issues.some(issue => typeof issue !== 'string' || !issue.trim() || issue.length > 240)) throw new Error('The reader returned an invalid response. Your image and text are preserved.');
  return { text: data.text, issues: (data.issues as string[]).map(issue => issue.trim()) };
}


