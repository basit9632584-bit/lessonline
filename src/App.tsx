import { lazy, Suspense } from 'react';
import QuestionWorkspace from './QuestionWorkspace';
const TeacherApp = lazy(() => import('./TeacherApp'));
export default function App() {
  const showTeacher = new URLSearchParams(window.location.search).get('view') === 'teacher';
  return showTeacher ? <Suspense fallback={<p style={{padding:24}}>Opening the lesson builder…</p>}><a href="/" style={{display:'inline-block',padding:'12px 24px'}}>Back to questions</a><TeacherApp /></Suspense> : <QuestionWorkspace />;
}
