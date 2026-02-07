'use client';

import { useCallback, useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, AlertCircle, GripVertical, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageFile {
  file: File;
  preview: string;
  base64?: string;
}

interface ImageUploadProps {
  images: ImageFile[];
  onChange: (images: ImageFile[]) => void;
  min?: number;
  max?: number;
}

export type { ImageFile };

export function ImageUpload({ images, onChange, min = 3, max = 6 }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const remaining = max - images.length;
      const toAdd = arr.slice(0, remaining);

      const newImages: ImageFile[] = await Promise.all(
        toAdd.map(
          (file) =>
            new Promise<ImageFile>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                const base64 = dataUrl.split(',')[1];
                resolve({
                  file,
                  preview: URL.createObjectURL(file),
                  base64,
                });
              };
              reader.readAsDataURL(file);
            })
        )
      );

      onChange([...images, ...newImages]);
    },
    [images, max, onChange]
  );

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedIndex !== null && draggedIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleImageDragLeave = () => {
    setDropTargetIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      const newImages = [...images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(targetIndex, 0, removed);
      onChange(newImages);
    }

    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedIndex(null);
    setDropTargetIndex(null);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedIndex === null) {
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          dragOver
            ? 'border-bp-seller bg-bp-seller-soft'
            : 'border-bp-border hover:border-bp-muted hover:bg-gray-50/50',
          images.length >= max && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
          disabled={images.length >= max}
        />
        <Upload className="w-8 h-8 mx-auto mb-3 text-bp-muted" />
        <p className="text-sm font-medium">Drop images here or click to browse</p>
        <p className="text-xs text-bp-muted mt-1">
          {min}-{max} photos required ({images.length}/{max} added)
        </p>
      </div>

      {images.length > 0 && images.length < min && (
        <div className="flex items-center gap-2 text-xs text-bp-warning">
          <AlertCircle className="w-3.5 h-3.5" />
          Add at least {min - images.length} more image{min - images.length > 1 ? 's' : ''}
        </div>
      )}

      {images.length > 0 && (
        <>
          <p className="text-xs text-bp-muted">Drag to reorder. First image is the main photo.</p>
          <div className="grid grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => handleImageDragStart(e, i)}
                onDragOver={(e) => handleImageDragOver(e, i)}
                onDragLeave={handleImageDragLeave}
                onDrop={(e) => handleImageDrop(e, i)}
                onDragEnd={handleImageDragEnd}
                className={cn(
                  'relative aspect-square rounded-lg overflow-hidden bg-gray-100 group cursor-grab active:cursor-grabbing transition-all',
                  i === 0 && 'ring-2 ring-bp-seller ring-offset-2',
                  draggedIndex === i && 'opacity-50 scale-95',
                  dropTargetIndex === i && 'ring-2 ring-bp-buyer ring-offset-2'
                )}
              >
                <img
                  src={img.preview}
                  alt={`Upload ${i + 1}`}
                  className="w-full h-full object-cover pointer-events-none"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-black/60 text-white
                  flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-3 h-3" />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white
                    flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity
                    hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
                {i === 0 && (
                  <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 px-1.5 py-0.5 bg-bp-seller text-white text-[10px] rounded font-medium">
                    <Star className="w-2.5 h-2.5" />
                    Main
                  </div>
                )}
              </div>
            ))}
            {images.length < max && (
              <button
                onClick={() => inputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-bp-border
                  flex flex-col items-center justify-center gap-1 text-bp-muted
                  hover:border-bp-muted hover:bg-gray-50 transition-colors"
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px]">Add more</span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
