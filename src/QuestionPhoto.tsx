import { useEffect, useRef, useState } from 'react';
import { preparePhoto, validatePhotoResponse } from './photo-input.ts';
import type { PreparedPhoto } from './photo-input.ts';
import './question-photo.css';
type Props = { sourceRevision: number; onText: (text: string, issues: string[], expectedRevision: number) => boolean; onInvalidate: () => void; onGateChange: (allowed: boolean) => void };
export default function QuestionPhoto({ sourceRevision, onText, onInvalidate, onGateChange }: Props) {
  const [photo, setPhoto] = useState<PreparedPhoto | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('Choose an image to preview it on this device.');
  const input = useRef<HTMLInputElement>(null);
  const inspection = useRef<HTMLDialogElement>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; generation.current++; controller.current?.abort(); controller.current = null; inspection.current?.close(); };
  }, []);
  useEffect(() => {
    if (controller.current) {
      generation.current++; controller.current.abort(); controller.current = null;
      setReading(false); setMessage('Reading cancelled because the question text changed. Your image is preserved.');
    }
  }, [sourceRevision]);
  function stop(messageText: string) {
    generation.current++; controller.current?.abort(); controller.current = null;
    setReading(false); setPreparing(false); setMessage(messageText);
  }
  async function select(file: File | undefined) {
    if (!file) return;
    inspection.current?.close(); stop('Preparing a local preview…');
    const request = generation.current;
    setError(''); setPreparing(true); onInvalidate(); onGateChange(false);
    try {
      const prepared = await preparePhoto(file);
      if (!mounted.current || generation.current !== request) return;
      setPhoto(prepared); setMessage('Local preview ready. Choose Read question to run the reader on this device.');
    } catch (failure) {
      if (mounted.current && generation.current === request) {
        setError(failure instanceof Error ? failure.message : 'Choose another readable image.');
        setMessage(photo ? 'Image could not be prepared. Your previous preview and editable text are preserved. Choose another image or read the previous preview.' : 'Image could not be prepared. Choose another PNG or JPEG, or paste your question. Your editable text is preserved.');
      }
    } finally {
      if (mounted.current && generation.current === request) setPreparing(false);
      if (input.current) input.current.value = '';
    }
  }
  function remove() {
    inspection.current?.close(); stop('Image removed. Your editable question text is preserved.'); setPhoto(null); setError(''); onInvalidate(); onGateChange(true);
    if (input.current) input.current.value = '';
  }
  async function read() {
    if (!photo || reading || preparing) return;
    stop('Reading the question…'); const request = generation.current;
    const active = new AbortController(); controller.current = active;
    let timedOut = false;
    const timeout = window.setTimeout(() => { timedOut = true; active.abort(); }, 90000);
    setReading(true); setError(''); onInvalidate(); onGateChange(false);
    try {
      const { readLocalQuestion } = await import('./localOcr.ts');
      if (active.signal.aborted || !mounted.current || generation.current !== request) return;
      const result = await readLocalQuestion(photo.image, { signal: active.signal, onProgress: progress => {
        if (mounted.current && generation.current === request) setMessage(`${progress.status.toLowerCase().includes('recogniz') ? 'Reading the question' : 'Preparing the local reader'} · ${Math.round(progress.progress * 100)}%`);
      } });
      const parsed = validatePhotoResponse(result);
      if (!mounted.current || generation.current !== request) return;
      controller.current = null;
      if (!onText(parsed.text, parsed.issues, sourceRevision)) return;
      onGateChange(true); setMessage('Question read. Check and correct the editable text and mathematical notation below.');
    } catch (failure) {
      if (!mounted.current || generation.current !== request) return;
      setMessage('Reading stopped. Your image and editable text are preserved.');
      setError(timedOut ? 'Reading took too long. Your image and text are preserved. Try again or paste the question.' : failure instanceof Error && failure.name !== 'AbortError' ? failure.message : 'Reading cancelled. Your image and text are preserved.');
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current && generation.current === request) { controller.current = null; setReading(false); }
    }
  }
  return <div className="q-photo">
    <label className="q-photo-file-label" htmlFor="q-photo-file">Choose photo or screenshot</label><input id="q-photo-file" ref={input} type="file" accept="image/png,image/jpeg" onChange={event => void select(event.target.files?.[0])} aria-describedby="q-photo-limits" />
    <p id="q-photo-limits" className="q-helper">One PNG or JPEG, up to 5 MB. Crop to just the question for clearer reading.</p>
    {preparing && <p className="q-helper" role="status">Preparing the local image preview…</p>}
    {photo && <><figure className="q-photo-preview"><img src={photo.image} alt="Prepared question image for reading on this device" /><figcaption>{photo.resized ? `PNG resized locally: ${photo.originalWidth} × ${photo.originalHeight} → ${photo.width} × ${photo.height} pixels.` : `Prepared PNG: ${photo.width} × ${photo.height} pixels.`} This prepared PNG is the local image the reader uses. Resizing can reduce fine detail; crop the question before selecting it if notation is hard to read.</figcaption><button type="button" className="q-photo-secondary q-photo-inspect" onClick={() => inspection.current?.showModal()}>Inspect prepared image</button></figure><div className="q-photo-actions"><button type="button" className="q-photo-secondary" onClick={() => input.current?.click()}>Replace image</button><button type="button" className="q-photo-secondary" onClick={remove}>Remove image</button></div>
      <p className="q-photo-disclosure">Read question runs on this device. Your image stays in this browser. Best with printed English questions; check minus signs, decimals and exponents in the editable text. The reader loads when needed.</p>
      <button type="button" className="q-primary" onClick={() => void read()} disabled={reading || preparing}>Read question</button>{reading && <button type="button" className="q-photo-secondary q-photo-cancel" onClick={() => stop('Reading cancelled. Your image and text are preserved.')}>Cancel reading</button>}</>}
    <p className="q-helper q-photo-status" role="status">{message}</p>

    {photo && <dialog ref={inspection} className="q-photo-dialog" aria-labelledby="q-photo-inspection-title"><div className="q-photo-dialog-header"><h2 id="q-photo-inspection-title">Inspect the prepared image</h2><button type="button" className="q-photo-secondary" onClick={() => inspection.current?.close()} autoFocus>Close image</button></div><p className="q-helper">This is the prepared PNG, not the original file at full resolution. Check signs, decimal points and exponents against the editable question. Scroll across the image if needed; choose a clearer crop if fine notation is missing.</p><div className="q-photo-inspection-region" role="region" aria-label="Prepared local question image" tabIndex={0}><img src={photo.image} width={photo.width} height={photo.height} alt="Prepared PNG question image for checking the recognized text" /></div></dialog>}
    {error && <p className="q-photo-error" role="alert">{error}</p>}

  </div>;
}









