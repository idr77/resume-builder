/**
 * Compresses an image file or a Base64 data URL to a maximum width/height and quality
 * using HTML5 Canvas, returning a compressed Base64 data URL.
 * 
 * @param input The File object or Base64 data URL string to compress.
 * @param maxWidth The maximum width of the output image in pixels (default: 300).
 * @param maxHeight The maximum height of the output image in pixels (default: 300).
 * @param quality The JPEG compression quality between 0 and 1 (default: 0.8).
 * @returns A Promise resolving to the compressed Base64 data URL.
 */
export function compressImage(
  input: File | string,
  maxWidth = 300,
  maxHeight = 300,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImageSrc = (src: string) => {
      // If the image is already small (e.g. not a large Base64), skip compression
      // A typical compressed base64 of 25kb is around 34,000 characters.
      // If it's already less than 50KB, we can skip processing to save CPU cycles.
      if (src.length < 70000) {
        resolve(src);
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src); // Fallback to original if 2D context is not available
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        
        try {
          // Output compressed JPEG
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          // Fallback if canvas is tainted (e.g. cross-origin, though rare for user uploads)
          resolve(src);
        }
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      img.src = src;
    };

    if (input instanceof File) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result && typeof event.target.result === 'string') {
          processImageSrc(event.target.result);
        } else {
          reject(new Error('Failed to read file as data URL'));
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(input);
    } else if (typeof input === 'string') {
      if (!input.startsWith('data:image/')) {
        // Not a data URL image, return as is
        resolve(input);
        return;
      }
      processImageSrc(input);
    } else {
      reject(new Error('Invalid image input type'));
    }
  });
}
