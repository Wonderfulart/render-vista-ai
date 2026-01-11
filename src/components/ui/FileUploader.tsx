import React, { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, Image as ImageIcon, Music, Loader2 } from 'lucide-react';
import { Button } from './button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface FileUploaderProps {
  type: 'image' | 'audio';
  bucket: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  className?: string;
  disabled?: boolean;
}

const acceptTypes = {
  image: 'image/jpeg,image/png,image/webp',
  audio: 'audio/mpeg,audio/wav,audio/mp3,audio/ogg',
};

const maxSizes = {
  image: 10 * 1024 * 1024, // 10MB
  audio: 50 * 1024 * 1024, // 50MB
};

export function FileUploader({
  type,
  bucket,
  value,
  onChange,
  className,
  disabled = false,
}: FileUploaderProps) {
  const { user } = useAuth();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return;
    }

    if (file.size > maxSizes[type]) {
      toast.error(`File too large. Maximum size is ${maxSizes[type] / (1024 * 1024)}MB`);
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: signedData, error: signedError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7-day expiry

      if (signedError) throw signedError;

      onChange(signedData?.signedUrl || null);
      toast.success('File uploaded!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
    }
  }, [disabled, uploadFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
    e.target.value = '';
  };

  const handleRemove = () => {
    onChange(null);
  };

  const Icon = type === 'image' ? ImageIcon : Music;

  if (value) {
    return (
      <div className={cn('relative rounded-lg border border-border overflow-hidden', className)}>
        {type === 'image' ? (
          <img
            src={value}
            alt="Uploaded"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center gap-3 p-4 bg-muted">
            <Music className="w-8 h-8 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Audio file</p>
              <audio src={value} controls className="w-full mt-2 h-8" />
            </div>
          </div>
        )}
        
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={handleRemove}
          disabled={disabled}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 border-dashed transition-colors cursor-pointer',
        isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={acceptTypes[type]}
        onChange={handleFileSelect}
        disabled={disabled || isUploading}
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      
      <div className="flex flex-col items-center justify-center p-6 text-center">
        {isUploading ? (
          <>
            <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              {isDragging ? (
                <Upload className="w-6 h-6 text-primary" />
              ) : (
                <Icon className="w-6 h-6 text-primary" />
              )}
            </div>
            <p className="text-sm font-medium mb-1">
              {isDragging ? 'Drop to upload' : `Drag & drop ${type}`}
            </p>
            <p className="text-xs text-muted-foreground">
              or click to browse
            </p>
          </>
        )}
      </div>
    </div>
  );
}
