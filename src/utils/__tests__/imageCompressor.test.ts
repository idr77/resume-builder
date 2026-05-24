import { describe, it, expect } from 'vitest';
import { compressImage } from '../imageCompressor';

describe('Image Compressor Utility', () => {
  it('should immediately resolve if the input string is not a data URL', async () => {
    const result = await compressImage('https://example.com/photo.jpg');
    expect(result).toBe('https://example.com/photo.jpg');
  });

  it('should immediately resolve if the input data URL is already very small (< 70KB)', async () => {
    const smallBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const result = await compressImage(smallBase64);
    expect(result).toBe(smallBase64);
  });
});
