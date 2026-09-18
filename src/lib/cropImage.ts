export type Area = { x: number; y: number; width: number; height: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));
    img.addEventListener('error', (e) => reject(e));
    img.crossOrigin = 'anonymous';
    img.src = src;
  });
}

/** Apply rotation + crop from react-easy-crop into a JPEG File. */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0,
  fileName = 'scan.jpg',
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const rotRad = (rotation * Math.PI) / 180;
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  const out = document.createElement('canvas');
  out.width = pixelCrop.width;
  out.height = pixelCrop.height;
  const outCtx = out.getContext('2d');
  if (!outCtx) throw new Error('Canvas unavailable');
  outCtx.putImageData(data, 0, 0);

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
  });

  return new File([blob], fileName.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
}

function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = (rotation * Math.PI) / 180;
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

/** Rotate an image file by 90° steps without cropping. */
export async function rotateImageFile(file: File, degrees: number): Promise<File> {
  if (!file.type.startsWith('image/') || degrees % 360 === 0) return file;
  const src = URL.createObjectURL(file);
  try {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    const rad = ((degrees % 360) * Math.PI) / 180;
    const swap = Math.abs(degrees % 180) === 90;
    canvas.width = swap ? image.height : image.width;
    canvas.height = swap ? image.width : image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.92);
    });
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(src);
  }
}
