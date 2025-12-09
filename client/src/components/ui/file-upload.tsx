import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  accept?: string;
  maxSizeInMB?: number;
  className?: string;
  buttonText?: string;
  currentImageUrl?: string;
}

export function FileUpload({
  onFileSelected,
  accept = 'image/*',
  maxSizeInMB = 5,
  className = '',
  buttonText = 'Upload Image',
  currentImageUrl
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSizeInBytes) {
      setError(`File size exceeds the maximum limit of ${maxSizeInMB}MB`);
      return;
    }

    // Clear any previous errors
    setError(null);

    // Create and set preview URL
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Pass the file to the parent component
    onFileSelected(file);

    // Reset the input value so the same file can be selected again if needed
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          className="flex gap-2 items-center"
        >
          <Upload className="h-4 w-4" />
          {buttonText}
        </Button>
        {previewUrl && (
          <Button 
          type="button" 
          variant="destructive" 
          size="sm" 
          onClick={handleRemoveImage}
          className="flex items-center justify-center p-2"
        >
          <X className="h-4 w-4" />
        </Button>
        
        )}
      </div>

      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        className="hidden"
      />

      {error && <p className="text-destructive text-sm">{error}</p>}

      {previewUrl && (
        <div className="relative mt-2 w-24 h-24 rounded-md overflow-hidden border border-border">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}