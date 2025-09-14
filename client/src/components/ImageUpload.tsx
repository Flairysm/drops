import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
}

export function ImageUpload({ 
  value, 
  onChange, 
  label = "Image", 
  placeholder = "Upload an image or enter URL",
  className = "",
  accept = "image/*",
  maxSize = 5
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Upload to server
      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      
      if (result.success && result.imageUrl) {
        onChange(result.imageUrl);
        toast({
          title: "Upload Successful",
          description: "Image uploaded successfully",
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const clearImage = () => {
    onChange('');
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label className="text-white">{label}</Label>
      
      {/* Upload Area */}
      <div
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${dragActive ? 'border-primary bg-primary/10' : 'border-gray-600 hover:border-gray-500'}
          ${value ? 'border-green-500 bg-green-500/10' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {value ? (
          <div className="space-y-2">
            <div className="relative inline-block">
              <img
                src={value}
                alt="Uploaded"
                className="w-24 h-24 object-cover rounded-lg border border-gray-600"
              />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  clearImage();
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-sm text-gray-400">Click to change image</p>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-gray-400" />
            <div>
              <p className="text-sm text-gray-300">
                {isUploading ? 'Uploading...' : 'Drop image here or click to upload'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max size: {maxSize}MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* URL Input */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="flex-1">
            <Input
              value={value}
              onChange={handleUrlChange}
              placeholder={placeholder}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={clearImage}
              className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Or enter an image URL directly
        </p>
      </div>

      {/* Preview */}
      {value && (
        <div className="mt-2">
          <Label className="text-sm text-gray-400">Preview:</Label>
          <div className="mt-1 p-2 bg-gray-800 rounded border border-gray-700">
            <img
              src={value}
              alt="Preview"
              className="w-full h-32 object-cover rounded"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
