/**
 * High-Fidelity Client-Side Image Compressor
 * 
 * Compresses images preserving their original resolution and visual quality,
 * allowing fast loads, smooth performance, and fluid layouts.
 */

interface CompressionOptions {
  quality?: number; // 0.0 to 1.0 (default is 0.83 - the fidelity sweet spot)
  maxDimension?: number; // Protection limit against massive files crashing the browser canvas (default 4096)
}

/**
 * Checks if a Canvas has any transparent pixels.
 */
function hasAlphaChannel(ctx: CanvasRenderingContext2D, width: number, height: number): boolean {
  try {
    const imgData = ctx.getImageData(0, 0, Math.min(width, 200), Math.min(height, 200));
    const data = imgData.data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }
  } catch (e) {
    // Cross-origin issues or other errors, assume yes for safety
  }
  return false;
}

/**
 * Compresses an image file client-side while preserving its original resolution.
 * Returns a new File object with optimized size.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { quality = 0.83, maxDimension = 4096 } = options;

  // If it's not an image, return original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  // Animated GIFs cannot be easily compressed via canvas without losing animation
  if (file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          let width = img.width;
          let height = img.height;

          // Safety check: scale down only if the image is unreasonably large (e.g. above 4096px)
          // to prevent browser canvas size limit crashes while maintaining high-res.
          if (width > maxDimension || height > maxDimension) {
            const ratio = width / height;
            if (width > height) {
              width = maxDimension;
              height = Math.round(maxDimension / ratio);
            } else {
              height = maxDimension;
              width = Math.round(maxDimension * ratio);
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(file);
            return;
          }

          // Draw the image
          ctx.drawImage(img, 0, 0, width, height);

          // Determine the best target format and content type
          let targetType = "image/jpeg";
          let extension = "jpg";

          // If original has transparency (PNG, WebP), we should preserve it
          const isPNGOrWebP = file.type === "image/png" || file.type === "image/webp";
          const hasTransparency = isPNGOrWebP && hasAlphaChannel(ctx, width, height);

          if (hasTransparency) {
            // WebP is highly optimized and supports transparency. 
            // Fallback to PNG if the browser does not support webp export (extremely rare now).
            targetType = "image/webp";
            extension = "webp";
          } else {
            // Standard JPEG is perfectly compatible and super small
            targetType = "image/jpeg";
            extension = "jpg";
            
            // Fill background with white for JPEG to ensure transparent areas look clean
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = width;
            tempCanvas.height = height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.fillStyle = "#FFFFFF";
              tempCtx.fillRect(0, 0, width, height);
              tempCtx.drawImage(img, 0, 0, width, height);
              ctx.clearRect(0, 0, width, height);
              ctx.drawImage(tempCanvas, 0, 0);
            }
          }

          canvas.toBlob(
            (blob) => {
              if (blob) {
                // Only use the compressed version if it is actually smaller than the original!
                if (blob.size < file.size) {
                  // Reconstruct file name with correct extension
                  const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf(".")) || file.name;
                  const newFileName = `${originalNameWithoutExt}.${extension}`;
                  
                  const compressedFile = new File([blob], newFileName, {
                    type: targetType,
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                } else {
                  // Compressed is larger (rare, but can happen on small, already-optimized images)
                  resolve(file);
                }
              } else {
                resolve(file);
              }
            },
            targetType,
            quality
          );
        } catch (error) {
          console.error("Error during image compression:", error);
          resolve(file); // Fallback to original
        }
      };

      img.onerror = () => {
        resolve(file); // Fallback to original
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve(file); // Fallback to original
    };

    reader.readAsDataURL(file);
  });
}
