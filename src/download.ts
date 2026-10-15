import { lessonFilename, makeLessonHtml, toPortableLesson } from './export';
import type { AnyLesson } from './lesson';

async function readAsset(name: string, signal: AbortSignal) {
  const response = await fetch(import.meta.env.BASE_URL + 'offline/' + name, { signal });
  if (!response.ok) throw new Error('The offline lesson files could not load. Restart the app and try again.');
  const value = await response.text();
  if (!value.trim()) throw new Error('The offline lesson files are empty. Rebuild the app and try again.');
  return value;
}

export async function downloadLesson(lesson: AnyLesson, includeNotes: boolean, isCurrent: () => boolean) {
  const data = toPortableLesson(lesson, includeNotes);
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const [js, css, licenses] = await Promise.all([
      readAsset('lesson.js', controller.signal), readAsset('lesson.css', controller.signal), readAsset('licenses.txt', controller.signal),
    ]);
    if (!isCurrent()) throw new Error('The lesson changed while preparing the download. Review the current lesson and try again.');
    const html = makeLessonHtml(data, { js, css, licenses });
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = lessonFilename(data.title);
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    // Let the browser finish acquiring the download before releasing its URL.
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
    return { filename: lessonFilename(data.title), bytes: new Blob([html]).size };
  } finally { window.clearTimeout(timeout); controller.abort(); }
}

