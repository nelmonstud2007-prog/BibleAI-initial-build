import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Download, ExternalLink, Loader2, AlertCircle, Heart, Eye } from 'lucide-react';

interface SharedVerseData {
  id: string;
  verse_ref: string;
  verse_text: string;
  reflection: string | null;
  theme: string;
  font_style: string;
  view_count: number;
  created_at: string;
}

const THEME_MAP: Record<string, { bg: string; text: string; accent: string; sub: string }> = {
  dark:   { bg: '#0f1923', text: '#ffffff', accent: '#fbbf24', sub: '#64748b' },
  light:  { bg: '#fefce8', text: '#1e293b', accent: '#d97706', sub: '#64748b' },
  gold:   { bg: '#1c1400', text: '#fef3c7', accent: '#fbbf24', sub: '#92400e' },
  ocean:  { bg: '#0c1a2e', text: '#e0f2fe', accent: '#38bdf8', sub: '#475569' },
  forest: { bg: '#0a1a0e', text: '#dcfce7', accent: '#4ade80', sub: '#475569' },
  sunset: { bg: '#1a0a0a', text: '#fef2f2', accent: '#f87171', sub: '#475569' },
};

const FONT_MAP: Record<string, string> = {
  serif:  'Georgia, "Times New Roman", serif',
  sans:   'Inter, system-ui, sans-serif',
  script: '"Palatino Linotype", Palatino, serif',
};

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 12): number {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    if (ctx.measureText(testLine).width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines) { ctx.fillText('...', x, currentY); break; }
    } else { line = testLine; }
  }
  if (lineCount < maxLines) ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

export default function SharedVerse() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SharedVerseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!id) return;
    supabase.from('shared_verses').select('*').eq('id', id).single()
      .then(({ data, error }) => {
        if (error || !data) { setError('Verse not found'); setLoading(false); return; }
        setData(data);
        setLoading(false);
        // Increment view count
        supabase.rpc('increment_share_view', { share_id: id }).then(() => {});
      });
  }, [id]);

  const renderCanvas = useCallback(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 1080, H = 1080;
    canvas.width = W; canvas.height = H;
    const t = THEME_MAP[data.theme] || THEME_MAP.dark;
    const fontFamily = FONT_MAP[data.font_style] || FONT_MAP.serif;

    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);
    const grad = ctx.createRadialGradient(W * 0.8, H * 0.2, 50, W * 0.8, H * 0.2, 500);
    grad.addColorStop(0, t.accent + '22');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = t.accent;
    ctx.font = `bold 420px ${fontFamily}`;
    ctx.fillText('✝', W * 0.55, H * 0.88);
    ctx.restore();
    const borderGrad = ctx.createLinearGradient(0, 0, W, 0);
    borderGrad.addColorStop(0, 'transparent');
    borderGrad.addColorStop(0.5, t.accent);
    borderGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, W, 4);
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.roundRect(80, 80, 72, 72, 16);
    ctx.fill();
    ctx.fillStyle = t.bg;
    ctx.font = `bold 40px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('✝', 116, 128);
    ctx.textAlign = 'left';
    ctx.fillStyle = t.text;
    ctx.font = `bold 44px ${fontFamily}`;
    ctx.fillText('BibleAI', 172, 128);
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.3;
    ctx.font = `bold 200px ${fontFamily}`;
    ctx.fillText('"', 60, 340);
    ctx.globalAlpha = 1;
    ctx.fillStyle = t.text;
    ctx.font = `500 ${data.verse_text.length > 200 ? '38' : '46'}px ${fontFamily}`;
    const nextY = wrapText(ctx, data.verse_text, 100, 320, 880, 68, 10);
    if (data.reflection) {
      ctx.fillStyle = t.sub;
      ctx.font = `400 30px ${fontFamily}`;
      wrapText(ctx, `"${data.reflection}"`, 100, nextY + 20, 880, 44, 4);
    }
    ctx.fillStyle = t.accent;
    ctx.font = `bold 36px ${fontFamily}`;
    ctx.fillText(`— ${data.verse_ref}`, 100, H - 120);
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, H - 4, W, 4);
    ctx.fillStyle = t.sub;
    ctx.font = `400 24px ${fontFamily}`;
    ctx.textAlign = 'right';
    ctx.fillText('Shared from BibleAI', W - 80, H - 80);
    ctx.textAlign = 'left';
    setImageUrl(canvas.toDataURL('image/png'));
  }, [data]);

  useEffect(() => {
    if (data) renderCanvas();
  }, [data, renderCanvas]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `bibleai-${data?.verse_ref?.replace(/[^a-z0-9]/gi, '-') || 'verse'}.png`;
    a.click();
  };

  if (loading) return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center gap-4 p-6">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-white font-bold text-xl">Verse not found</p>
      <Link to="/" className="text-gold-400 hover:underline text-sm">← Back to BibleAI</Link>
    </div>
  );

  const t = THEME_MAP[data.theme] || THEME_MAP.dark;

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6 gap-8">
      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold-gradient rounded-xl flex items-center justify-center">
          <span className="text-navy-950 font-bold text-lg">✝</span>
        </div>
        <span className="text-white font-bold text-2xl">BibleAI</span>
      </div>

      {/* Verse Card */}
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10"
        style={{ background: t.bg }}>
        {imageUrl ? (
          <img src={imageUrl} alt={`${data.verse_ref} verse card`} className="w-full" />
        ) : (
          <div className="aspect-square flex items-center justify-center p-10" style={{ background: t.bg }}>
            <div className="text-center space-y-6">
              <p className="text-3xl font-serif leading-relaxed" style={{ color: t.text, fontFamily: FONT_MAP[data.font_style] }}>
                "{data.verse_text}"
              </p>
              {data.reflection && (
                <p className="text-lg italic" style={{ color: t.sub }}>{data.reflection}</p>
              )}
              <p className="text-xl font-bold" style={{ color: t.accent }}>— {data.verse_ref}</p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-6 text-navy-400 text-sm">
        <span className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> {data.view_count + 1} views</span>
        <span className="flex items-center gap-1.5"><Heart className="w-4 h-4" /> {data.verse_ref}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button onClick={handleDownload}
          className="flex-1 py-3.5 rounded-xl bg-gold-gradient text-navy-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
          <Download className="w-4 h-4" /> Download
        </button>
        <Link to="/signup"
          className="flex-1 py-3.5 rounded-xl border border-gold-400/30 text-gold-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gold-400/5 transition-all">
          <ExternalLink className="w-4 h-4" /> Open BibleAI
        </Link>
      </div>

      <p className="text-navy-500 text-xs text-center max-w-sm">
        Discover more scripture, devotionals, and AI-powered Bible study at BibleAI.
      </p>
    </div>
  );
}
