import { AttachedFile } from '../types';

export async function processFiles(files: File[]): Promise<AttachedFile[]> {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  const maxSize = 10 * 1024 * 1024; // 10MB per file
  const processedFiles: AttachedFile[] = [];

  for (const file of files) {
    if (!validTypes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}`);
    }

    if (file.size > maxSize) {
      throw new Error(`File ${file.name} exceeds maximum size of 10MB`);
    }

    try {
      const base64Data = await fileToBase64(file);
      const processedFile: AttachedFile = {
        name: file.name,
        type: file.type,
        data: base64Data,
        originalFile: file,
      };

      // Create preview URL for images
      if (file.type.startsWith('image/')) {
        processedFile.preview = URL.createObjectURL(file);
      }

      processedFiles.push(processedFile);
    } catch (error) {
      console.error('Error processing file:', file.name, error);
      throw error;
    }
  }

  return processedFiles;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Recipe extraction is handled in api.ts

