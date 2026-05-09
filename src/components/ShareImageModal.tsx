import { useEffect, useMemo, useState } from 'react';
import { X, Download, Link2, Check } from 'lucide-react';

interface ShareImageModalProps {
  open: boolean;
  onClose: () => void;
  heading: string;
  content: string;
}

export default function ShareImageModal({ open, onClose, heading, content }: ShareImageModalProps) {
  const [imageUrl, setImageUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.href;
  }, []);

  useEffect(() => {
    if (!open) return;

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Gold glow accents
    const glow = ctx.createRadialGradient(900, 220, 50, 900, 220, 360);
    glow.addColorStop(0, 'rgba(251,191,36,0.18)');
    glow.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Watermark cross
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 380px Inter, sans-serif';
    ctx.fillText('✝', 810, 980);
    ctx.restore();

    // BibleAI logo
    ctx.fillStyle = '#fbbf24';
    roundRect(ctx, 90, 90, 86, 86, 18);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.font = 'bold 46px Inter, sans-serif';
    ctx.fillText('✝', 117, 149);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px Inter, sans-serif';
    ctx.fillText('BibleAI', 200, 148);

    // Heading
    ctx.fillStyle = '#fbbf24';
    ctx.font = '600 48px Inter, sans-serif';
    drawWrappedText(ctx, heading, 100, 250, 1000, 62);

    // Content
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 52px Inter, sans-serif';
    drawWrappedText(ctx, content, 100, 360, 1000, 70, 9);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 30px Inter, sans-serif';
    ctx.fillText('Shared from BibleAI', 100, 1120);

    setImageUrl(canvas.toDataURL('image/png'));
  }, [open, heading, content]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'bibleai-share-card.png';
    a.click();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // no-op fallback
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-navy-900 border border-navy-700 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-navy-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold text-white mb-4">Share Card Preview</h3>
        {imageUrl ? (
          <img src={imageUrl} alt="Share card preview" className="w-full rounded-xl border border-navy-700 mb-4" />
        ) : (
          <div className="h-64 rounded-xl bg-navy-800 animate-pulse mb-4" />
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 bg-gold-400 text-navy-950 font-semibold px-5 py-3 rounded-xl hover:bg-gold-300 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
          <button
            onClick={handleCopyLink}
            className="flex-1 flex items-center justify-center gap-2 bg-navy-800 border border-navy-700 text-white font-semibold px-5 py-3 rounded-xl hover:bg-navy-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
        </div>
      </div>
    </div>
  );
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 5
) {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;

  for (const word of words) {
    const testLine = `${line}${word} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line.trim(), x, y);
      y += lineHeight;
      line = `${word} `;
      lineCount++;
      if (lineCount >= maxLines - 1) break;
    } else {
      line = testLine;
    }
  }
  if (lineCount < maxLines) {
    ctx.fillText(line.trim(), x, y);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
