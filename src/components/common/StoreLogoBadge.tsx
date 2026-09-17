import React, { useRef, useState } from 'react';
import { Camera, Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDesignSystem } from '../../context/DesignContext';
import { sound } from '../../lib/sound';
import { cn } from '../../lib/utils';

interface StoreLogoBadgeProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  allowDirectUpload?: boolean;
  className?: string;
  showHoverOverlay?: boolean;
  onOpenBrandingSettings?: () => void;
}

export default function StoreLogoBadge({
  size = 'md',
  allowDirectUpload = false,
  className,
  showHoverOverlay = false,
  onOpenBrandingSettings
}: StoreLogoBadgeProps) {
  const { settings, updateSettings, activeThemeInfo } = useDesignSystem();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const customLogo = settings.customLogoUrl || '/nali-logo.png';
  const storeName = settings.storeName || 'Nali Mobile';

  // Compute initials from store name
  const initials = storeName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'NM';

  // Size variations
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-base',
    lg: 'w-14 h-14 text-xl',
    xl: 'w-20 h-20 text-3xl'
  };

  const roundedMap = {
    rounded: size === 'sm' ? 'rounded-lg' : size === 'md' ? 'rounded-xl' : size === 'lg' ? 'rounded-2xl' : 'rounded-3xl',
    circle: 'rounded-full',
    square: 'rounded-none'
  };

  const bgMap = {
    white: 'bg-white text-[#0B0F19]',
    dark: 'bg-[#181E2E] text-white border border-white/10',
    transparent: 'bg-white/10 text-white backdrop-blur-sm border border-white/10',
    primary: 'text-white'
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 5MB original)
    if (file.size > 5 * 1024 * 1024) {
      alert('Please select an image smaller than 5MB.');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Resize canvas to optimal square logo resolution (max 384x384 for ultra-crisp display & fast sync)
        const canvas = document.createElement('canvas');
        const maxDim = 384;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          let dataUrl = '';
          try {
            dataUrl = canvas.toDataURL('image/webp', 0.88);
            if (!dataUrl.startsWith('data:image/webp')) {
              dataUrl = canvas.toDataURL('image/png');
            }
          } catch {
            dataUrl = canvas.toDataURL('image/png');
          }
          updateSettings({ customLogoUrl: dataUrl });
          sound.playSuccess();
        }
        setIsProcessing(false);
      };
      img.onerror = () => {
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClick = (e: React.MouseEvent) => {
    if (allowDirectUpload) {
      e.preventDefault();
      e.stopPropagation();
      fileInputRef.current?.click();
    } else if (onOpenBrandingSettings) {
      e.preventDefault();
      e.stopPropagation();
      onOpenBrandingSettings();
    }
  };

  const fitClass = settings.logoFit === 'contain' 
    ? 'object-contain p-1' 
    : settings.logoFit === 'fill' 
      ? 'object-fill' 
      : 'object-cover';

  const shapeClass = roundedMap[settings.logoShape || 'rounded'];
  const bgClass = settings.logoBgColor === 'primary' 
    ? activeThemeInfo.previewClass 
    : bgMap[settings.logoBgColor || 'white'];

  return (
    <div 
      className={cn("relative group/logo-badge inline-flex shrink-0 select-none", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden File Input for Direct Upload */}
      {allowDirectUpload && (
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
          className="hidden" 
          onChange={handleFileChange}
        />
      )}

      {/* Main Badge Container */}
      <div 
        onClick={handleClick}
        className={cn(
          "relative flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300",
          sizeMap[size],
          shapeClass,
          !customLogo && bgClass,
          customLogo && (settings.logoBgColor === 'dark' ? 'bg-[#121724]' : settings.logoBgColor === 'transparent' ? 'bg-transparent' : 'bg-white'),
          allowDirectUpload && "cursor-pointer active:scale-95",
          isHovered && allowDirectUpload && "ring-2 ring-indigo-500/50"
        )}
        title={allowDirectUpload ? "Click to change store picture / logo" : storeName}
      >
        {customLogo ? (
          <img 
            src={customLogo} 
            alt={storeName} 
            referrerPolicy="no-referrer"
            className={cn("w-full h-full", fitClass, shapeClass)}
          />
        ) : (
          <span className="font-extrabold tracking-tight select-none">
            {initials}
          </span>
        )}

        {/* Hover Upload Overlay */}
        <AnimatePresence>
          {showHoverOverlay && allowDirectUpload && isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute inset-0 bg-black/75 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10 transition-colors",
                shapeClass
              )}
            >
              <Camera className={size === 'sm' ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Processing Spinner */}
        {isProcessing && (
          <div className={cn("absolute inset-0 bg-black/80 flex items-center justify-center z-20", shapeClass)}>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
