'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AvatarCropperProps {
  open: boolean;
  imageSrc: string | null;
  onClose: () => void;
  onCropped: (blob: Blob) => void;
}

export default function AvatarCropper({ open, imageSrc, onClose, onCropped }: AvatarCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;

    try {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = reject;
        image.src = imageSrc;
      });

      const canvas = document.createElement('canvas');
      const size = 256; // Output avatar size
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw circular clip
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        size,
        size
      );

      canvas.toBlob((blob) => {
        if (blob) {
          onCropped(blob);
          onClose();
        }
      }, 'image/png');
    } catch (err) {
      console.error('裁剪失败:', err);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-800/80 text-zinc-100 max-w-sm rounded-xl shadow-2xl shadow-black/40">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">裁剪头像</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-64 bg-zinc-950 rounded-lg overflow-hidden">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-xs text-zinc-500">缩放</label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-blue-500"
          />
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="outline" onClick={onClose} className="flex-1 border-zinc-700/60 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg">
            取消
          </Button>
          <Button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20 rounded-lg">
            确认裁剪
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
