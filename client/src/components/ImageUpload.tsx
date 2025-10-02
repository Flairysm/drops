import React, { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  placeholder = "https://example.com/image.jpg", 
  label = "Image URL",
  id,
  required = false,
  className = "w-full"
}: ImageUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('url');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      handleFileUpload(imageFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleFileUpload(file);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    console.log('🖼️ Starting file upload:', {
      name: file.name,
      size: file.size,
      type: file.type
    });
    
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      console.log('🖼️ FormData created, making API request...');
      const response = await apiRequest('POST', '/api/upload/image', formData);
      console.log('🖼️ API response received:', response);
      
      const data = await response.json();
      console.log('🖼️ Response data:', data);
      
      if (data.success && data.imageUrl) {
        console.log('🖼️ ✅ Upload successful, setting image URL:', data.imageUrl);
        onChange(data.imageUrl);
        setUploadMode('url');
      } else {
        console.log('🖼️ ❌ Upload failed:', data.message);
        throw new Error(data.message || 'Upload failed');
      }
    } catch (error) {
      console.error('🖼️ ❌ Image upload failed:', error);
      alert(`Image upload failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const testUploadEndpoint = async () => {
    try {
      console.log('🧪 Testing upload endpoint...');
      const response = await apiRequest('POST', '/api/upload/test', {});
      const data = await response.json();
      console.log('🧪 Test endpoint response:', data);
      alert(`Test successful: ${data.message}`);
    } catch (error) {
      console.error('🧪 Test endpoint failed:', error);
      alert(`Test failed: ${error.message}`);
    }
  };

  const clearImage = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="text-sm font-medium">{label}</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={uploadMode === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMode('url')}
            className="h-7 px-2 text-xs"
          >
            URL
          </Button>
          <Button
            type="button"
            variant={uploadMode === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMode('file')}
            className="h-7 px-2 text-xs"
          >
            Upload
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={testUploadEndpoint}
            className="h-7 px-2 text-xs"
          >
            Test
          </Button>
        </div>
      </div>

      {uploadMode === 'url' ? (
        <div className="relative">
          <Input
            id={id}
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className={className}
            required={required}
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <p className="text-sm text-gray-600">Uploading...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Drop image here or click to upload
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleButtonClick}
                className="mt-2"
              >
                Choose File
              </Button>
            </div>
          )}
        </div>
      )}

      {value && (
        <div className="mt-2">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <ImageIcon className="h-3 w-3" />
            <span>Preview:</span>
          </div>
          <div className="mt-1">
            <img
              src={value}
              alt="Preview"
              className="h-20 w-20 object-cover rounded border"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
