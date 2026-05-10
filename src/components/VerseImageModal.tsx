import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Download, Link2, Check, Twitter, Instagram, Palette, Type, Share2, Eye, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface VerseImageModalProps {
  open: boolean;
  onClose: () => void;
  verseRef: string;
  verseText: string;
  reflection?: string;
}

type Theme = 'dark' | 'light' | 'gold' | 'ocean' | 'forest' | 'sunset';
type FontStyle = 'serif' | 'sans' | 'script';

const THEMES: { id: Theme; label: string; bg: string; text: string; accent: string; sub: string }[] = [
  { id: 'dark',   label: 'Night',   bg: '#0f1923', text: '#ffffff', accent: '#fbbf24', sub: '#64748b' },
  { id: 'light',  label: 'Dawn',    bg: '#fefce8', text: '#1e293b', accent: '#d97706', sub: '#64748b' },
  { id: 'gold',   label: 'Royal',   bg: '#1c1400', text: '#fef3c7', accent: '#fbbf24', sub: '#92400e' },
  { id: 'ocean',  label: 'Ocean',   bg: '#0c1a2e', text: '#e0f2fe', accent: '#38bdf8', sub: '#475569' },
  { id: 'forest', label: 'Forest',  bg: '#0a1a0e', text: '#dcfce7', accent: '#4ade80', sub: '#475569' },
  { id: 'sunset', label: 'Sunset',  bg: '#1a0a0a', text: '#fef2f2', accent: '#f87171', sub: '#475569' },
];

const FONTS: { id: FontStyle; label: string; css: string }[] = [
  { id: 'serif',  label: 'Classic',  css: 'Georgia, "Times New Roman", serif' },
  { id: 'sans',   label: 'Modern',   css: 'Inter, system-ui, sans-serif' },
  { id: 'script', label: 'Elegant',  css: '"Palatino Linotype", Palatino, serif' },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 12): number {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;
  let currentY = y;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = words[n] + ' ';
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines) { ctx.fillText('...', x, currentY); break; }
    } else {
      line = testLine;
    }
  }
  if (lineCount < maxLines) ctx.fillText(line.trim(), x, currentY);
  return currentY + lineHeight;
}

export default function VerseImageModal({ open, onClose, verseRef, verseText, reflection }: VerseImageModalProps) {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [fontStyle, setFontStyle] = useState<FontStyle>('serif');
  const [imageUrl, setImageUrl] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'design' | 'share'>('design');

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = 1080, H = 1080;
    canvas.width = W;
    canvas.height = H;

    const t = THEMES.find(x => x.id === theme)!;
    const f = FONTS.find(x => x.id === fontStyle)!;

    // Background
    ctx.fillStyle = t.bg;
    ctx.fillRect(0, 0, W, H);

    // Gradient overlay
    const grad = ctx.createRadialGradient(W * 0.8, H * 0.2, 50, W * 0.8, H * 0.2, 500);
    grad.addColorStop(0, t.accent + '22');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Large cross watermark
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = t.accent;
    ctx.font = `bold 420px ${f.css}`;
    ctx.fillText('✝', W * 0.55, H * 0.88);
    ctx.restore();

    // Top border accent
    const borderGrad = ctx.createLinearGradient(0, 0, W, 0);
    borderGrad.addColorStop(0, 'transparent');
    borderGrad.addColorStop(0.5, t.accent);
    borderGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, 0, W, 4);

    // Logo area
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.roundRect(80, 80, 72, 72, 16);
    ctx.fill();
    ctx.fillStyle = t.bg;
    ctx.font = `bold 40px ${f.css}`;
    ctx.textAlign = 'center';
    ctx.fillText('✝', 116, 128);
    ctx.textAlign = 'left';
    ctx.fillStyle = t.text;
    ctx.font = `bold 44px ${f.css}`;
    ctx.fillText('BibleAI', 172, 128);

    // Decorative quote marks
    ctx.fillStyle = t.accent;
    ctx.globalAlpha = 0.3;
    ctx.font = `bold 200px ${f.css}`;
    ctx.fillText('"', 60, 340);
    ctx.globalAlpha = 1;

    // Verse text
    ctx.fillStyle = t.text;
    ctx.font = `500 ${verseText.length > 200 ? '38' : '46'}px ${f.css}`;
    const nextY = wrapText(ctx, verseText, 100, 320, 880, 68, 10);

    // Reflection (if any)
    if (reflection) {
      ctx.fillStyle = t.sub;
      ctx.font = `400 30px ${f.css}`;
      wrapText(ctx, `"${reflection}"`, 100, nextY + 20, 880, 44, 4);
    }

    // Verse reference
    ctx.fillStyle = t.accent;
    ctx.font = `bold 36px ${f.css}`;
    ctx.fillText(`— ${verseRef}`, 100, H - 120);

    // Bottom border
    ctx.fillStyle = borderGrad;
    ctx.fillRect(0, H - 4, W, 4);

    // Watermark
    ctx.fillStyle = t.sub;
    ctx.font = `400 24px ${f.css}`;
    ctx.textAlign = 'right';
    ctx.fillText('Shared from BibleAI', W - 80, H - 80);
    ctx.textAlign = 'left';

    setImageUrl(canvas.toDataURL('image/png'));
  }, [theme, fontStyle, verseRef, verseText, reflection]);

  useEffect(() => {
    if (open) renderCanvas();
  }, [open, renderCanvas]);

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `bibleai-${verseRef.replace(/[^a-z0-9]/gi, '-')}.png`;
    a.click();
  };

  const handleCreateShareLink = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('shared_verses')
        .insert({
          user_id: user.id,
          verse_ref: verseRef,
          verse_text: verseText,
          reflection: reflection || null,
          theme,
          font_style: fontStyle,
        })
        .select('id')
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/share/${data.id}`;
      setShareLink(link);
      setTab('share');
    } catch (err) {
      console.error('Failed to create share link:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`"${verseText.slice(0, 200)}..." — ${verseRef}\n\nShared via BibleAI`);
    const url = shareLink ? encodeURIComponent(shareLink) : '';
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing; download image and prompt
    handleDownload();
    alert('Image downloaded! Open Instagram and share it from your camera roll.');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true" aria-label="Verse Image Creator">
      <div className="bg-navy-950 border border-white/10 rounded-3xl w-full max-w-4xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gold-400/10 rounded-xl flex items-center justify-center">
              <Palette className="w-4 h-4 text-gold-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Verse Image Creator</h2>
              <p className="text-navy-400 text-xs">{verseRef}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-navy-400 hover:text-white hover:bg-white/5 transition-all" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Preview */}
          <div className="flex-1 flex items-center justify-center p-6 bg-navy-900/50 min-h-[280px]">
            <canvas ref={canvasRef} className="hidden" />
            {imageUrl ? (
              <img src={imageUrl} alt="Verse preview" className="w-full max-w-sm rounded-2xl shadow-2xl border border-white/10" />
            ) : (
              <div className="w-full max-w-sm aspect-square rounded-2xl bg-navy-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full lg:w-80 flex flex-col border-t lg:border-t-0 lg:border-l border-white/5 overflow-y-auto">
            {/* Tabs */}
            <div className="flex border-b border-white/5">
              {(['design', 'share'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${tab === t ? 'text-gold-400 border-b-2 border-gold-400' : 'text-navy-400 hover:text-white'}`}>
                  {t === 'design' ? <><Palette className="w-3.5 h-3.5 inline mr-1.5" />Design</> : <><Share2 className="w-3.5 h-3.5 inline mr-1.5" />Share</>}
                </button>
              ))}
            </div>

            {tab === 'design' && (
              <div className="p-5 space-y-6">
                {/* Theme */}
                <div>
                  <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Theme</p>
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map(t => (
                      <button key={t.id} onClick={() => { setTheme(t.id); setTimeout(renderCanvas, 50); }}
                        className={`p-2 rounded-xl border text-xs font-semibold transition-all ${theme === t.id ? 'border-gold-400 text-gold-400' : 'border-white/10 text-navy-400 hover:border-white/30'}`}
                        style={{ background: t.bg }}>
                        <span style={{ color: t.accent }}>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                {/* Font */}
                <div>
                  <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Font Style</p>
                  <div className="space-y-2">
                    {FONTS.map(f => (
                      <button key={f.id} onClick={() => { setFontStyle(f.id); setTimeout(renderCanvas, 50); }}
                        className={`w-full p-3 rounded-xl border text-sm transition-all text-left ${fontStyle === f.id ? 'border-gold-400 bg-gold-400/5 text-white' : 'border-white/10 text-navy-400 hover:border-white/30'}`}
                        style={{ fontFamily: f.css }}>
                        <Type className="w-3.5 h-3.5 inline mr-2" />{f.label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Preview refresh */}
                <button onClick={renderCanvas}
                  className="w-full py-3 rounded-xl border border-white/10 text-navy-400 text-xs font-bold uppercase tracking-wider hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2">
                  <Eye className="w-3.5 h-3.5" /> Refresh Preview
                </button>
              </div>
            )}

            {tab === 'share' && (
              <div className="p-5 space-y-4">
                {/* Download */}
                <button onClick={handleDownload}
                  className="w-full py-3.5 rounded-xl bg-gold-gradient text-navy-950 font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                  <Download className="w-4 h-4" /> Download PNG
                </button>

                {/* Create share link */}
                {!shareLink ? (
                  <button onClick={handleCreateShareLink} disabled={saving}
                    className="w-full py-3.5 rounded-xl border border-gold-400/30 text-gold-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-gold-400/5 transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    {saving ? 'Creating Link...' : 'Create Share Link'}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 p-3 bg-navy-900 rounded-xl border border-white/10">
                      <p className="flex-1 text-xs text-navy-300 truncate">{shareLink}</p>
                      <button onClick={() => handleCopy(shareLink)} className="p-1.5 rounded-lg text-navy-400 hover:text-gold-400 transition-colors">
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-navy-500 text-center">Share this link anywhere — it shows a beautiful verse card!</p>
                  </div>
                )}

                {/* Social sharing */}
                <div className="pt-2 border-t border-white/5">
                  <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-3">Share to Social</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleTwitterShare}
                      className="py-3 rounded-xl border border-sky-500/30 text-sky-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-sky-500/10 transition-all">
                      <Twitter className="w-4 h-4" /> Twitter/X
                    </button>
                    <button onClick={handleInstagramShare}
                      className="py-3 rounded-xl border border-pink-500/30 text-pink-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-pink-500/10 transition-all">
                      <Instagram className="w-4 h-4" /> Instagram
                    </button>
                  </div>
                </div>

                {/* Copy verse text */}
                <button onClick={() => handleCopy(`"${verseText}" — ${verseRef}`)}
                  className="w-full py-3 rounded-xl border border-white/10 text-navy-400 text-xs font-bold flex items-center justify-center gap-2 hover:text-white hover:border-white/30 transition-all">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
                  Copy Verse Text
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
