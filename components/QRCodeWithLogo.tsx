import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { getOptimizedImageUrl } from '../utils';

interface QRCodeWithLogoProps {
  data: string;
  logoSrc: string;
  size: number;
  logoSizeRatio?: number;      // Relative size of logo
  logoBgPaddingRatio?: number; // Padding around logo
  onDataUrlReady?: (dataUrl: string) => void;
  className?: string;
  crossOrigin?: "" | "anonymous" | "use-credentials";
}

const QRCodeWithLogo: React.FC<QRCodeWithLogoProps> = ({
  data,
  logoSrc,
  size,
  logoSizeRatio = 0.2,
  logoBgPaddingRatio = 0.05,
  onDataUrlReady,
  className,
  crossOrigin = "anonymous",
}) => {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const generate = async () => {
      try {
        // Generate QR code matrix
        const qrData = await QRCode.toDataURL(data, {
          errorCorrectionLevel: 'H',
          margin: 1,
          width: size * 2,
          scale: 1,
        });

        const canvas = document.createElement('canvas');
        canvas.width = size * 2;
        canvas.height = size * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const qrImage = new Image();
        qrImage.crossOrigin = "anonymous";
        qrImage.src = qrData;
        await new Promise((res, rej) => {
          qrImage.onload = res;
          qrImage.onerror = rej;
        });

        // Draw QR code on canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw QR as image first
        ctx.drawImage(qrImage, 0, 0, canvas.width, canvas.height);

        // Convert squares into dots by overlaying circles on black pixels
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataArr = imageData.data;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const moduleSize = size * 2 / qrImage.width;

        for (let y = 0; y < qrImage.height; y++) {
          for (let x = 0; x < qrImage.width; x++) {
            const i = (y * qrImage.width + x) * 4;
            const r = dataArr[i], g = dataArr[i + 1], b = dataArr[i + 2];
            const alpha = dataArr[i + 3];
            if (alpha > 128 && (r + g + b) / 3 < 128) {
              // Draw circle
              ctx.fillStyle = "#000";
              ctx.beginPath();
              ctx.arc(
                x * moduleSize + moduleSize / 2,
                y * moduleSize + moduleSize / 2,
                moduleSize / 2,
                0,
                2 * Math.PI
              );
              ctx.fill();
            }
          }
        }

        // Draw logo with white circular background
        const logoImage = new Image();
        logoImage.crossOrigin = "anonymous";
        logoImage.src = getOptimizedImageUrl(logoSrc, 200);
        await new Promise((res, rej) => {
          logoImage.onload = res;
          logoImage.onerror = rej;
        });

        const logoSize = size * 2 * logoSizeRatio;
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;
        const padding = logoSize * logoBgPaddingRatio;

        ctx.fillStyle = "#fff"; // white background behind logo
        ctx.beginPath();
        ctx.arc(
          canvas.width / 2,
          canvas.height / 2,
          logoSize / 2 + padding,
          0,
          2 * Math.PI
        );
        ctx.fill();

        ctx.drawImage(logoImage, logoX, logoY, logoSize, logoSize);

        const finalDataUrl = canvas.toDataURL('image/png');
        if (isMounted) {
          setImageDataUrl(finalDataUrl);
          if (onDataUrlReady) onDataUrlReady(finalDataUrl);
        }
      } catch (err) {
        console.error("Failed to generate QR code:", err);
      }
    };

    generate();
    return () => { isMounted = false; };
  }, [data, logoSrc, size, logoSizeRatio, logoBgPaddingRatio, onDataUrlReady]);

  if (!imageDataUrl) {
    return <div className={`bg-light-border dark:bg-dark-border animate-pulse rounded-md ${className}`} style={{ width: size, height: size }} />;
  }

  return <img src={imageDataUrl} alt="QR Code with logo" className={className} width={size} height={size} crossOrigin={crossOrigin} />;
};

export default QRCodeWithLogo;
