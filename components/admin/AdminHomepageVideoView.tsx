import { useEffect, useState } from 'react';
import { Surface } from '../ui/Page';
import { homepageVideos, HomepageVideoSetting, loadHomepageVideo, saveHomepageVideo } from '../../lib/homepageVideos';

export default function AdminHomepageVideoView() {
  const [saved, setSaved] = useState<HomepageVideoSetting | null>(null);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const load = async () => {
    setLoading(true); setError(''); setMessage('');
    try { const value = await loadHomepageVideo(); setSaved(value); setSelected(value.video_id); }
    catch { setError('Unable to load the saved video. Check your connection and reload.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const video = homepageVideos.find(item => item.id === selected);
  return <Surface className="space-y-5 p-6 sm:p-8">
    <div><h2 className="text-xl font-bold">Homepage Video</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Choose a repository video, preview it, then save to update the homepage for all visitors.</p></div>
    {loading && <p role="status">Loading saved video…</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    {message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
    {!loading && saved && <form className="space-y-5" onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError(''); setMessage('');
      try { const value = await saveHomepageVideo(selected, saved.updated_at); setSaved(value); setMessage('Homepage video saved. Visitors will see it when they open the homepage.'); }
      catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save the video.'); }
      finally { setSaving(false); }
    }}>
      <div><label htmlFor="homepage-video" className="mb-2 block text-sm font-semibold">Available videos</label>
        <select id="homepage-video" value={selected} disabled={saving} onChange={event => { setSelected(event.target.value); setPreviewFailed(false); setMessage(''); }} className="w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
          {!video && <option value={selected}>Saved video is unavailable — choose a replacement</option>}
          {homepageVideos.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </div>
      {video && <div className="space-y-2"><video key={video.id} src={video.url} controls playsInline preload="metadata" aria-label="Homepage video preview" onError={() => setPreviewFailed(true)} className="aspect-video w-full rounded-2xl bg-brand-950" />
        {previewFailed && <p role="alert" className="text-sm text-red-600">The preview could not load. Try another video.</p>}
        <p className="break-all text-xs text-slate-500">{video.id}</p>
      </div>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={saving || !video || previewFailed || selected === saved.video_id} className="rounded-xl bg-brand-900 px-5 py-3 text-sm font-bold text-white disabled:opacity-50 dark:bg-gold-400 dark:text-brand-950">{saving ? 'Saving…' : 'Save homepage video'}</button>
        <button type="button" disabled={saving || selected === saved.video_id} onClick={() => { setSelected(saved.video_id); setPreviewFailed(false); setMessage(''); }} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold disabled:opacity-50">Cancel changes</button>
      </div>
    </form>}
    {!loading && <button type="button" disabled={saving} onClick={() => { setPreviewFailed(false); void load(); }} className="text-sm font-semibold underline underline-offset-4">Reload saved selection</button>}
  </Surface>;
}
