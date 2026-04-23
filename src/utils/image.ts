interface ResizeImageOptions {
  maxDimension?: number;
  quality?: number;
}

export async function resizeImage(file: File, options: ResizeImageOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    const maxDimension = options.maxDimension ?? 1920;
    const quality = options.quality ?? 0.85;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > height && width > maxDimension) {
        height *= maxDimension / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width *= maxDimension / height;
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        cleanup();
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      cleanup();
      resolve(base64);
    };
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load image'));
    };
    img.src = objectUrl;
  });
}
