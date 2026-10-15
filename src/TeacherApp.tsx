import { useEffect, useRef, useState } from 'react';
import StudentLesson from './StudentLesson';
import CalculusStudent from './CalculusStudent';
import StatisticsStudent from './StatisticsStudent';
import ProbabilityStudent from './ProbabilityStudent';
import { analyzeNotes, NOTES_LIMIT, samples } from './notes';
import { parseCoefficient, equationText } from './math';
import { DRAFT_KEY, CURRENT_DRAFT_KEY, EXPLANATION_LIMIT, canReview, emptyLesson, emptyCalculusLesson, emptyStatisticsLesson, emptyProbabilityLesson, isCalculusLesson, isStatisticsLesson, isProbabilityLesson, matchingSources, parseStoredLesson, templateExplanation } from './lesson';
import type { AnyLesson } from './lesson';
import { analyzeCalculusNotes, calculusSamples, calculusExplanation, matchingCalculusSources, parseCalculusValue, quadraticText } from './calculus';
import { analyzeStatisticsNotes, statisticsSamples, statisticsExplanation, matchingStatisticsSources, parseDataset, formatStatisticsNumber } from './statistics';
import { analyzeProbabilityNotes, probabilitySamples, probabilityExplanation, matchingProbabilitySources, parseProbabilityValue } from './probability';
import { draftSnapshot, lessonTopic, readTopicDraft, saveTopicDraft } from './drafts';
import type { Topic } from './drafts';
import { downloadLesson } from './download';
type FieldKey = 'm' | 'b' | 'a' | 'c' | 'x0' | 'n' | 'p' | 'k';

function loadInitial() {
  try {
    const raw = localStorage.getItem(CURRENT_DRAFT_KEY) ?? localStorage.getItem(DRAFT_KEY);
    if (!raw) return { lesson: emptyLesson(), saved: null, notice: '' };
    const lesson = parseStoredLesson(raw);
    if (lesson) return { lesson, saved: draftSnapshot(lesson), notice: 'Your saved draft was restored from this browser.' };
    return { lesson: emptyLesson(), saved: null, notice: 'The saved draft could not be read. It has not been overwritten. You can start a new draft.' };
  } catch { return { lesson: emptyLesson(), saved: null, notice: 'Browser storage is unavailable. You can still work on this draft.' }; }
}

export default function TeacherApp() {
  const [initial] = useState(loadInitial);
  const [lesson, setLesson] = useState<AnyLesson>(initial.lesson);
  const [undo, setUndo] = useState<AnyLesson | null>(null);
  const [saved, setSaved] = useState<string | null>(initial.saved);
  const [notice, setNotice] = useState(initial.notice);
  const [view, setView] = useState<'teacher' | 'student'>('teacher');
  const [isWide, setIsWide] = useState(() => matchMedia('(min-width: 961px)').matches);
  const [analysisShown, setAnalysisShown] = useState(Boolean(initial.lesson.notes));
  const [confirmAttempt, setConfirmAttempt] = useState(false);
  const [manualChoice, setManualChoice] = useState(false);
  const [nim, setNim] = useState<'checking' | 'configured' | 'unavailable'>('checking');
  const [generating, setGenerating] = useState(false);
  const [generationNotice, setGenerationNotice] = useState('');
  const [includeNotes, setIncludeNotes] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadNotice, setDownloadNotice] = useState('');
  const current = useRef(lesson);
  const revision = useRef(0);
  const editGroup = useRef<string | null>(null);
  const pending = useRef<AbortController | null>(null);
  const topicDrafts = useRef<Partial<Record<Topic, AnyLesson>>>({});
  current.current = lesson;
  const calculus = isCalculusLesson(lesson);
  const statistics = isStatisticsLesson(lesson);
  const probability = isProbabilityLesson(lesson);
  const analysis = probability ? analyzeProbabilityNotes(lesson.notes) : statistics ? analyzeStatisticsNotes(lesson.notes) : calculus ? analyzeCalculusNotes(lesson.notes) : analyzeNotes(lesson.notes);
  const fields: { key: FieldKey; label: string }[] = probability
    ? [{ key: 'n', label: 'Number of trials' }, { key: 'p', label: 'Success probability' }, { key: 'k', label: 'Target successes' }]
    : calculus
    ? [{ key: 'a', label: 'Curve coefficient' }, { key: 'b', label: 'Linear coefficient' }, { key: 'c', label: 'Constant' }, { key: 'x0', label: 'Evaluation point' }]
    : statistics ? [] : [{ key: 'm', label: 'Slope' }, { key: 'b', label: 'Intercept' }];
  const drafts: Partial<Record<FieldKey, string>> = statistics ? {} : lesson.coefficientDrafts;
  const trialN = probability ? parseProbabilityValue(drafts.n ?? '', 'n').value : undefined;
  const fieldResults = fields.map(field => probability && (field.key === 'n' || field.key === 'p' || field.key === 'k')
    ? parseProbabilityValue(drafts[field.key] ?? '', field.key, trialN ?? 30)
    : calculus && (field.key === 'a' || field.key === 'b' || field.key === 'c' || field.key === 'x0')
      ? parseCalculusValue(drafts[field.key] ?? '', field.key)
      : parseCoefficient(drafts[field.key] ?? ''));
  const datasetResult = statistics ? parseDataset(lesson.datasetDraft) : null;
  const confirmedEquation = probability ? `n = ${lesson.parameters.n} · p = ${lesson.parameters.p} · k = ${lesson.parameters.k}` : statistics ? lesson.parameters.values.map(formatStatisticsNumber).join(', ') : calculus ? quadraticText(lesson.parameters) : equationText(lesson.parameters.m, lesson.parameters.b);
  const dirty = saved !== draftSnapshot(lesson);
  const blocked = analysis.kind === 'empty' || analysis.kind === 'unsupported';
  const ready = lesson.confirmed && !blocked;
  const exportReady = canReview(lesson) && lesson.reviewed;
  const exportReason = !lesson.confirmed || blocked ? 'Confirm supported lesson values first.' : lesson.explanationStale ? 'Update the explanation for the current values first.' : !lesson.title.trim() || !lesson.explanation.trim() ? 'Add a title and explanation first.' : !lesson.reviewed ? 'Mark this lesson as teacher reviewed before downloading.' : 'Downloads use your confirmed original values, including edits you have not saved locally.';

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/nim/status', { signal: controller.signal }).then(response => response.ok ? response.json() : null)
      .then(data => setNim(data?.configured === true ? 'configured' : 'unavailable'))
      .catch(() => { if (!controller.signal.aborted) setNim('unavailable'); });
    return () => { controller.abort(); pending.current?.abort(); };
  }, []);
  useEffect(() => {
    const media = matchMedia('(min-width: 961px)');
    const changed = () => setIsWide(media.matches);
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);

  function commit(next: AnyLesson, group: string | null = null) {
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    if (!group || group !== editGroup.current) setUndo(current.current);
    editGroup.current = group; revision.current += 1; current.current = next; setLesson(next);
    setNotice(''); setGenerationNotice(''); setDownloadNotice('');
  }
  function editText(key: 'notes' | 'title' | 'explanation', value: string) {
    const previous = current.current;
    commit({ ...previous, [key]: value, reviewed: false,
      ...(key === 'notes' ? { confirmed: false, sourceLineNumbers: [], explanationStale: Boolean(previous.explanation) } : {}),
      ...(key === 'explanation' ? { explanationOrigin: 'manual' as const, explanationStale: !previous.confirmed } : {}),
    }, key);
    if (key === 'notes') { setAnalysisShown(false); setManualChoice(false); setIncludeNotes(false); }
  }
  function changeTopic(topic: Topic) {
    const previous = current.current;
    if (lessonTopic(previous) === topic) return;
    topicDrafts.current[lessonTopic(previous)] = previous;
    let next = topicDrafts.current[topic];
    let stored: AnyLesson | null = null;
    try { stored = readTopicDraft(localStorage, topic); } catch { /* Editing remains available. */ }
    next ??= stored ?? (topic === 'probability' ? emptyProbabilityLesson() : topic === 'statistics' ? emptyStatisticsLesson() : topic === 'calculus' ? emptyCalculusLesson() : emptyLesson());
    commit(next); setSaved(stored ? draftSnapshot(stored) : null);
    setAnalysisShown(false); setConfirmAttempt(false); setManualChoice(false); setIncludeNotes(false);
    setNotice('Topic changed. Saved topics remain in this browser. Save any new edits before closing or reloading.');
  }
  function useSample(sample: { title: string; notes: string }) {
    const next = isProbabilityLesson(current.current) ? emptyProbabilityLesson() : isStatisticsLesson(current.current) ? emptyStatisticsLesson() : isCalculusLesson(current.current) ? emptyCalculusLesson() : emptyLesson();
    next.notes = sample.notes; next.title = sample.title;
    commit(next); setAnalysisShown(false); setConfirmAttempt(false); setManualChoice(false);
    setIncludeNotes(false);
    setNotice('Sample notes opened. Review the suggested values before continuing.');
  }
  function reviewValues() {
    setAnalysisShown(true); setConfirmAttempt(false); setManualChoice(false);
    const previous = current.current;
    if (analysis.kind === 'recognized' && isProbabilityLesson(previous) && 'parameters' in analysis && 'n' in analysis.parameters) {
      commit({ ...previous, coefficientDrafts: { n: String(analysis.parameters.n), p: String(analysis.parameters.p), k: String(analysis.parameters.k) }, confirmed: false, reviewed: false });
      setNotice('Suggested trial settings found. Check the model assumptions and each value, then confirm.');
    } else if (analysis.kind === 'recognized' && isStatisticsLesson(previous) && 'parameters' in analysis && 'values' in analysis.parameters) {
      commit({ ...previous, datasetDraft: analysis.parameters.values.join(', '), confirmed: false, reviewed: false });
      setNotice('Suggested dataset found. Check every value, then confirm.');
    } else if (analysis.kind === 'recognized' && isCalculusLesson(previous) && 'parameters' in analysis && 'a' in analysis.parameters) {
      commit({ ...previous, coefficientDrafts: { a: String(analysis.parameters.a), b: String(analysis.parameters.b), c: String(analysis.parameters.c), x0: previous.coefficientDrafts.x0 || '1' }, confirmed: false, reviewed: false });
      setNotice('Suggested coefficients found. Check the curve and choose an evaluation point, then confirm.');
    } else if (analysis.kind === 'recognized' && previous.version === 1 && 'm' in analysis) {
      commit({ ...previous, coefficientDrafts: { m: String(analysis.m), b: String(analysis.b) }, confirmed: false, reviewed: false });
      setNotice('Suggested values found. Check slope and intercept, then confirm them.');
    } else {
      commit({ ...previous, confirmed: false, reviewed: false });
      setNotice('message' in analysis ? analysis.message : 'Review the values for the current topic.');
    }
  }
  function changeCoefficient(key: FieldKey, raw: string) {
    const previous = current.current;
    if (isProbabilityLesson(previous) && (key === 'n' || key === 'p' || key === 'k')) commit({ ...previous, coefficientDrafts: { ...previous.coefficientDrafts, [key]: raw },
      confirmed: false, reviewed: false, explanationStale: Boolean(previous.explanation) }, 'coefficient-' + key);
    else if (isCalculusLesson(previous) && (key === 'a' || key === 'b' || key === 'c' || key === 'x0')) commit({ ...previous, coefficientDrafts: { ...previous.coefficientDrafts, [key]: raw },
      confirmed: false, reviewed: false, explanationStale: Boolean(previous.explanation) }, 'coefficient-' + key);
    else if (previous.version === 1 && (key === 'm' || key === 'b')) commit({ ...previous, coefficientDrafts: { ...previous.coefficientDrafts, [key]: raw },
      confirmed: false, reviewed: false, explanationStale: Boolean(previous.explanation) }, 'coefficient-' + key);
  }
  function changeDataset(raw: string) {
    const previous = current.current;
    if (isStatisticsLesson(previous)) commit({ ...previous, datasetDraft: raw, confirmed: false, reviewed: false,
      explanationStale: Boolean(previous.explanation) }, 'dataset');
  }
  function confirmValues() {
    setConfirmAttempt(true); setAnalysisShown(true);
    if (blocked) { setNotice('Use notes about the supported lesson topic before confirming values.'); return; }
    if (analysis.kind === 'ambiguous' && !manualChoice) { setNotice('Choose one relationship in the notes or explicitly use your manual values.'); return; }
    const previous = current.current;
    if (isStatisticsLesson(previous)) {
      const result = parseDataset(previous.datasetDraft);
      if (!result.value) { setNotice('Correct the dataset before confirming.'); document.getElementById('teacher-dataset')?.focus(); return; }
      const parameters = { values: result.value };
      const changed = JSON.stringify(previous.parameters) !== JSON.stringify(parameters);
      commit({ ...previous, parameters, confirmed: true, reviewed: false, sourceLineNumbers: matchingStatisticsSources(previous.notes, parameters),
        explanationStale: previous.explanationStale || (changed && Boolean(previous.explanation)) });
      setNotice('Dataset confirmed. Review the explanation next.'); return;
    }
    const invalidIndex = fieldResults.findIndex(result => result.value === undefined);
    if (invalidIndex !== -1) { setNotice('Correct the highlighted lesson value before confirming.'); document.getElementById('teacher-' + fields[invalidIndex].key)?.focus(); return; }
    if (isProbabilityLesson(previous)) {
      const parameters = { n: fieldResults[0].value!, p: fieldResults[1].value!, k: fieldResults[2].value! };
      const changed = JSON.stringify(previous.parameters) !== JSON.stringify(parameters);
      commit({ ...previous, parameters, confirmed: true, reviewed: false, sourceLineNumbers: matchingProbabilitySources(previous.notes, parameters),
        explanationStale: previous.explanationStale || (changed && Boolean(previous.explanation)) });
      setNotice('Trial settings confirmed. Review the explanation next.'); return;
    }
    if (isCalculusLesson(previous)) {
      const parameters = { a: fieldResults[0].value!, b: fieldResults[1].value!, c: fieldResults[2].value!, x0: fieldResults[3].value! };
      const changed = JSON.stringify(previous.parameters) !== JSON.stringify(parameters);
      commit({ ...previous, parameters, confirmed: true, reviewed: false,
        sourceLineNumbers: matchingCalculusSources(previous.notes, parameters),
        explanationStale: previous.explanationStale || (changed && Boolean(previous.explanation)) });
      setNotice('Curve coefficients and evaluation point confirmed. Review the explanation next.'); return;
    }
    const m = fieldResults[0].value!, b = fieldResults[1].value!;
    const changed = previous.parameters.m !== m || previous.parameters.b !== b;
    commit({ ...previous, parameters: { m, b }, confirmed: true, reviewed: false,
      sourceLineNumbers: matchingSources(previous.notes, m, b),
      explanationStale: previous.explanationStale || (changed && Boolean(previous.explanation)) });
    setNotice('Slope and intercept confirmed. The explanation still needs your review.');
  }
  function useTemplate() {
    if (!ready) return;
    const previous = current.current;
    commit({ ...previous, explanation: isProbabilityLesson(previous) ? probabilityExplanation(previous.parameters) : isStatisticsLesson(previous) ? statisticsExplanation(previous.parameters) : isCalculusLesson(previous) ? calculusExplanation(previous.parameters) : templateExplanation(previous.parameters.m, previous.parameters.b),
      explanationOrigin: 'template', explanationStale: false, reviewed: false });
    setNotice('Template explanation added. Review its wording before sharing.');
  }
  async function generateExplanation() {
    if (!ready || generating || nim !== 'configured' || current.current.version !== 1) return;
    const requestRevision = revision.current;
    const parameters = { ...current.current.parameters };
    const controller = new AbortController(); pending.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 35000);
    const announce = (message: string) => { setNotice(message); setGenerationNotice(message); };
    setGenerating(true); announce('Drafting an explanation from your confirmed slope and intercept…');
    try {
      const response = await fetch('/api/explanation', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parameters), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'The draft could not be generated.');
      if (typeof data?.explanation !== 'string' || !data.explanation.trim() || data.explanation.length > EXPLANATION_LIMIT) {
        throw new Error('The draft was not in the expected format.');
      }
      if (revision.current !== requestRevision) {
        announce('Your lesson changed while the draft was being generated. The response was discarded; your edits are preserved. Try again with the current values.');
        return;
      }
      if (current.current.version !== 1) return;
      commit({ ...current.current, explanation: data.explanation, explanationOrigin: 'nim', explanationStale: false, reviewed: false });
      announce('AI draft added. Check the explanation against your confirmed values before marking it reviewed.');
    } catch (error) {
      announce((controller.signal.aborted ? 'The draft timed out or was cancelled.' : error instanceof Error ? error.message : 'The draft could not be generated.') +
        ' Your notes and edits are preserved. Try again or use the template.');
    } finally { window.clearTimeout(timeout); pending.current = null; setGenerating(false); }
  }
  function saveDraft() {
    try { const snapshot = saveTopicDraft(localStorage, current.current); setSaved(snapshot); setNotice('Draft saved on this browser. Your other saved topics are kept.'); }
    catch { setNotice('The draft could not be saved on this browser. Your current edits are still here.'); }
  }
  async function downloadOffline() {
    if (!exportReady || downloading) return;
    const snapshot = current.current;
    const requestRevision = revision.current;
    setDownloading(true); setDownloadNotice('Preparing your offline lesson…');
    try {
      const result = await downloadLesson(snapshot, includeNotes, () => revision.current === requestRevision);
      setDownloadNotice('Download started: ' + result.filename + '. Open the HTML file in a browser; the lesson works without internet.');
    } catch (error) {
      setDownloadNotice((error instanceof Error && error.name === 'AbortError' ? 'Preparing the download timed out. Try again.' : error instanceof Error ? error.message : 'The lesson could not be downloaded. Try again.') + ' Your draft is still here.');
    } finally { setDownloading(false); }
  }
  function undoLast() {
    if (!undo) return;
    revision.current += 1; current.current = undo; setLesson(undo); setUndo(null); editGroup.current = null;
    try { const restored = readTopicDraft(localStorage, lessonTopic(undo)); setSaved(restored ? draftSnapshot(restored) : null); } catch { setSaved(null); }
    setAnalysisShown(Boolean(undo.notes)); setConfirmAttempt(false); setManualChoice(false);
    setIncludeNotes(false); setDownloadNotice('');
    setNotice('Last change undone.');
  }
  function limitPaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const field = event.currentTarget;
    const incoming = event.clipboardData.getData('text');
    if (field.value.length - (field.selectionEnd - field.selectionStart) + incoming.length > NOTES_LIMIT) {
      event.preventDefault(); setNotice('Paste up to 6,000 characters. Your existing notes are unchanged.');
    }
  }

  return <>
    <a className="skip-link" href="#workspace">Skip to workspace</a>
    <header className="site-header author-header"><a className="brand" href="#workspace" aria-label="lessonline, go to workspace"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M4 23V5M4 23h20M4 23L22 5" /></svg>lesson<span>line</span></a>
      <span className="header-label">Turn mathematics notes into a lesson.</span><span className={'review-pill' + (lesson.reviewed ? ' reviewed' : '')}>{lesson.reviewed ? 'Teacher reviewed' : 'Needs review'}</span></header>
    <main id="workspace" tabIndex={-1} className={'author-shell mode-' + view}>
      <div className="author-heading"><div><p className="eyebrow">Your mathematics notebook</p><h1>Make the idea visible.</h1><p className="lead">{probability ? 'Change the chance of success. See the possible outcomes.' : statistics ? 'Change one value. See how the centre and spread respond.' : calculus ? 'Show how a curve’s slope changes from point to point.' : 'Start with a straight line. Give students a way to explore it.'}</p></div>
        <div className="topic-switch" role="group" aria-label="Lesson topic"><button aria-pressed={lesson.version === 1} onClick={() => changeTopic('linear')}>Straight lines</button><button aria-pressed={calculus} onClick={() => changeTopic('calculus')}>Calculus <span>Derivatives</span></button><button aria-pressed={statistics} onClick={() => changeTopic('statistics')}>Statistics <span>Centre &amp; spread</span></button><button aria-pressed={probability} onClick={() => changeTopic('probability')}>Probability <span>Binomial trials</span></button></div></div>
      <div className="author-toolbar"><div className="view-switch" role="group" aria-label="Workspace view"><button aria-pressed={view === 'teacher'} onClick={() => setView('teacher')}>Teacher editor</button><button aria-pressed={view === 'student'} onClick={() => setView('student')}>Student preview</button></div>
        <div className="draft-actions"><span className="save-state">{saved ? dirty ? 'Unsaved changes' : 'Saved on this browser' : 'Draft stays here until saved'}</span><button className="secondary-button" onClick={undoLast} disabled={!undo}>Undo last change</button><button className="primary-button" onClick={saveDraft}>Save draft</button></div></div>
      <div className="workspace-notice" role="status" aria-live="polite" aria-atomic="true">{notice || (generating ? 'Drafting an explanation…' : '')}</div>
      <div className="teacher-layout">
        <section className="editor-panel" aria-label="Teacher editor">
          <section className="editor-section"><div className="section-heading"><span className="step-number">1</span><h2>Start with your notes</h2></div><p className="field-help" id="notes-help">{probability ? 'Use a labelled trial line: Binomial: n = 4, p = 0.5, k = 2. Or paste prose and enter the settings manually.' : statistics ? 'Paste notes with one labelled dataset line, for example: data: 2, 4, 4, 6, 9. Or use prose and enter values manually.' : calculus ? 'Paste notes about a quadratic derivative. Supported form: f(x) = ax² + bx + c, with numeric coefficients.' : 'Paste notes about a straight-line equation. Supported form: y = mx + b.'}</p>
            <label className="field-label" htmlFor="source-notes">Source notes</label><textarea id="source-notes" className="notes-input" rows={7} value={lesson.notes} maxLength={NOTES_LIMIT} onPaste={limitPaste} onChange={event => editText('notes', event.target.value)} onBlur={() => { editGroup.current = null; }} placeholder={probability ? 'For example:\nBinomial: n = 4, p = 0.5, k = 2\nFour independent trials, each with the same chance of success.' : statistics ? 'For example:\ndata: 2, 4, 4, 6, 9\nCompare the mean and median when one value changes.' : calculus ? 'For example:\nf(x) = x²\nExplore the tangent slope at different points.' : 'For example:\ny = 2x + 1\nThe slope is 2 and the intercept is 1.'} aria-describedby="notes-help notes-count" />
            <div className="notes-foot"><span id="notes-count">{lesson.notes.length.toLocaleString()} / 6,000 characters</span><span>or open a sample</span></div>
            <div className="sample-actions">{(probability ? probabilitySamples : statistics ? statisticsSamples : calculus ? calculusSamples : samples).map(sample => <button className="sample-button" key={sample.id} onClick={() => useSample(sample)}>{sample.title}<span aria-hidden="true">↗</span></button>)}</div>
            <button className="primary-button full-button" onClick={reviewValues} disabled={!lesson.notes.trim()}>Review values</button>
          </section>
          <section className="editor-section"><div className="section-heading"><span className="step-number">2</span><h2>{probability ? 'Confirm the trial model' : statistics ? 'Confirm the dataset' : 'Confirm the relationship'}</h2></div><p className="field-help">{probability ? 'Use this model for a fixed number of independent trials, two outcomes per trial, and the same success probability each time. p is a decimal probability, such as 0.5 for 50%.' : statistics ? 'Check every number. These values are treated as the whole population for this lesson.' : calculus ? 'Check the curve coefficients and choose where to evaluate its slope. a = 0 gives a straight line.' : 'Check the two numbers that drive the equation, graph, and table.'}</p>
            {analysisShown && <p className={'analysis-result ' + analysis.kind} role="status">{analysis.kind === 'recognized' ? 'Suggested values from your notes. Check them before continuing.' : analysis.message}</p>}
            {statistics ? <div><label className="field-label" htmlFor="teacher-dataset">Dataset values</label><textarea id="teacher-dataset" className="notes-input dataset-input" rows={3} maxLength={512} value={lesson.datasetDraft} aria-invalid={(confirmAttempt || Boolean(lesson.datasetDraft)) && Boolean(datasetResult?.error)} aria-describedby="coefficient-bounds dataset-error" onChange={event => changeDataset(event.target.value)} onBlur={() => { editGroup.current = null; }} placeholder="2, 4, 4, 6, 9" /><p className="input-error" id="dataset-error" role="status">{confirmAttempt || lesson.datasetDraft ? datasetResult?.error : ''}</p></div> : <div className="teacher-coefficients">{fields.map(({key, label}, index) => {
              const result = fieldResults[index];
              const showError = confirmAttempt || Boolean(drafts[key]);
              return <div key={key}><label className="field-label" htmlFor={'teacher-' + key}><span className={key === 'b' || key === 'x0' ? 'intercept-color' : 'slope-color'}>{key === 'x0' ? 'x₀' : key}</span> {label}</label><input id={'teacher-' + key} className="teacher-number" type="text" inputMode="decimal" autoComplete="off" maxLength={24} value={drafts[key] ?? ''} aria-invalid={showError && Boolean(result.error)} aria-describedby={'coefficient-bounds teacher-' + key + '-error'} onChange={event => changeCoefficient(key, event.target.value)} onBlur={() => { editGroup.current = null; }} /><p className="input-error" id={'teacher-' + key + '-error'} role="status">{showError ? result.error : ''}</p></div>;
            })}</div>}
            <p className="field-help bounds-help" id="coefficient-bounds">{probability ? 'n: whole number 1–30 · p: 0–1, up to two decimals · k: whole number 0–n. Choose a valid k if n changes.' : statistics ? '3–20 values · −100 to 100 · up to two decimals · commas or spaces between numbers' : calculus ? 'a, b, c: −5 to 5 · x₀: −3 to 3 · up to two decimals' : '−10 to 10 · up to two decimal places'}</p>
            {analysis.kind === 'ambiguous' && <label className="manual-choice"><input type="checkbox" checked={manualChoice} onChange={event => setManualChoice(event.target.checked)} />Use the values I entered manually for this lesson.</label>}
            <button className="secondary-button full-button" onClick={confirmValues} disabled={blocked}>{lesson.confirmed ? 'Values confirmed' : probability ? 'Confirm trial settings' : statistics ? 'Confirm dataset' : calculus ? 'Confirm curve and point' : 'Confirm slope and intercept'}</button>
            {lesson.confirmed && <p className="confirmed-note">Confirmed: {confirmedEquation}{calculus ? ` at x₀ = ${lesson.parameters.x0}.` : '.'} Explanation review is separate.</p>}
            {lesson.sourceLineNumbers.length > 0 && <div className="source-context"><p className="field-label">Value source in your notes</p>{lesson.sourceLineNumbers.slice(0, 3).map(line => <blockquote key={line}><span>Line {line}</span>{lesson.notes.split(/\r\n|\n|\r/)[line - 1]}</blockquote>)}<p className="field-help">Context for inspection, not a proof of the explanation.</p></div>}
            {lesson.confirmed && lesson.sourceLineNumbers.length === 0 && <p className="field-help manual-source">These are teacher-entered values. No matching {probability ? 'trial settings' : statistics ? 'dataset' : 'equation'} {probability ? 'were' : 'was'} found in the notes.</p>}
          </section>
          <section className="editor-section"><div className="section-heading"><span className="step-number">3</span><h2>Put the idea into words</h2></div><p className="field-help">{lesson.version === 2 ? 'Use the calculated template or write your own explanation. Check its wording before sharing.' : 'Use a template, write your own, or request an AI draft. All three need your review.'}</p>
            <div className={'generation-actions' + (lesson.version === 2 ? ' single-action' : '')}><button className="secondary-button" disabled={!ready} onClick={useTemplate}>Use template</button>{lesson.version === 1 && <button className="secondary-button" aria-describedby="nim-availability" aria-busy={generating} disabled={!ready || generating || nim !== 'configured'} onClick={generateExplanation}>{generating ? 'Drafting…' : 'Draft with NIM'}</button>}</div>
            {generationNotice && <p className="generation-notice">{generationNotice}</p>}
            <p className="field-help nim-note" id="nim-availability">{probability ? 'The template calculates from your confirmed trial settings. Your notes stay in this browser.' : statistics ? 'The template calculates from your confirmed dataset. Your notes and data stay in this browser.' : calculus ? 'The template uses your confirmed curve and point. Your notes stay in this browser.' : nim === 'checking' ? 'Checking AI draft availability…' : nim === 'configured' ? 'NIM receives only the confirmed slope and intercept. Your notes stay in this browser.' : 'AI drafting is unavailable here. The template and manual editing still work.'}</p>
            <label className="field-label" htmlFor="lesson-title">Lesson title</label><input id="lesson-title" className="text-field" value={lesson.title} maxLength={100} onChange={event => editText('title', event.target.value)} onBlur={() => { editGroup.current = null; }} />
            <div className="explanation-label"><label className="field-label" htmlFor="lesson-explanation">Explanation</label><span className="origin-label">{lesson.explanation ? lesson.explanationOrigin === 'nim' ? 'AI draft' : lesson.explanationOrigin === 'template' ? 'Template' : 'Teacher edited' : 'Write or draft'}</span></div><textarea id="lesson-explanation" rows={7} className="explanation-input" maxLength={EXPLANATION_LIMIT} value={lesson.explanation} onChange={event => editText('explanation', event.target.value)} onBlur={() => { editGroup.current = null; }} placeholder="Confirm values, then draft or write a short explanation." />
            {lesson.explanationStale && <p className="stale-note" role="status">Notes or values changed. Update or redraft the explanation before reviewing.</p>}
          </section>
          <section className="editor-section review-section"><div className="section-heading"><span className="step-number">4</span><h2>Give it your review</h2></div><p className="field-help" id="review-help">Check the {probability ? 'trial assumptions and settings' : statistics ? 'dataset' : 'equation'}, source context, and wording together. Teacher reviewed means you checked this draft; it is not a mathematical proof.</p>
            <button className="primary-button full-button" aria-describedby="review-help" disabled={!canReview(lesson) || lesson.reviewed} onClick={() => { commit({ ...current.current, reviewed: true }); setNotice('Marked as teacher reviewed. Further edits will reset this status.'); }}>{lesson.reviewed ? 'Teacher reviewed' : 'Mark as teacher reviewed'}</button>
          </section>
        </section>
        <section className="lesson-preview" aria-label="Live student preview"><div className="preview-heading"><span className="eyebrow">{view === 'teacher' ? 'Live lesson preview' : 'Student preview'}</span><span>{lesson.confirmed ? 'Confirmed values' : 'Example values · confirm your own'}</span></div>
          {view === 'student' && <p className="preview-help">Explore changes here. Your teacher draft and review status are unchanged.</p>}
          {(isWide || view === 'student') && (probability ? <ProbabilityStudent lesson={lesson} compact={view === 'teacher'} /> : statistics ? <StatisticsStudent lesson={lesson} compact={view === 'teacher'} /> : calculus ? <CalculusStudent lesson={lesson} compact={view === 'teacher'} /> : <StudentLesson lesson={lesson} compact={view === 'teacher'} />)}
        </section>
      </div>
    </main>
  </>;
}

