import { createElement, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Clock3, Download, GraduationCap, Lightbulb, ListChecks, NotebookPen, Trophy } from 'lucide-react';
import { trainingDays } from './trainingContent';
import './training.css';

const emptyProgress = { completed: [], passed: [], notes: {}, day: 1 };
function readProgress(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (!value) return emptyProgress;
    return {
      completed: Array.isArray(value.completed) ? value.completed.filter(id => trainingDays.some(d => d.lessons.some(l => l.id === id))) : [],
      passed: Array.isArray(value.passed) ? value.passed.filter(id => trainingDays.some(d => d.id === id)) : [],
      notes: value.notes && typeof value.notes === 'object' ? value.notes : {},
      day: trainingDays.some(d => d.id === value.day) ? value.day : 1,
    };
  } catch { return emptyProgress; }
}

export default function TrainingWorkspace({ email }) {
  const storageKey = `gpc-training-prototype-v1:${email || 'guest'}`;
  const [progress, setProgress] = useState(() => readProgress(storageKey));
  const [lessonIndex, setLessonIndex] = useState(0);
  const [tab, setTab] = useState('lesson');
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [notice, setNotice] = useState('');
  const [saveError, setSaveError] = useState(false);
  const content = useRef(null);
  const day = trainingDays.find(item => item.id === progress.day);
  const lesson = day.lessons[lessonIndex];
  const dayDone = day.lessons.filter(item => progress.completed.includes(item.id)).length;
  const total = trainingDays.reduce((sum, item) => sum + item.lessons.length + 1, 0);
  const percent = Math.round((progress.completed.length + progress.passed.length) / total * 100);
  const score = day.questions.filter((q, index) => answers[index] === q.correct).length;

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(progress)); setSaveError(false); }
    catch { setSaveError(true); }
  }, [progress, storageKey]);



  function selectDay(id) {
    setProgress(previous => ({ ...previous, day: id }));
    setLessonIndex(0); setTab('lesson'); setAnswers({}); setSubmitted(false); setNotice('');
    content.current?.scrollTo({ top: 0 });
  }
  function finishLesson() {
    setProgress(previous => ({ ...previous, completed: [...new Set([...previous.completed, lesson.id])] }));
    if (lessonIndex < day.lessons.length - 1) setLessonIndex(lessonIndex + 1);
    else setTab('quiz');
    content.current?.scrollTo({ top: 0 });
  }
  function submitQuiz(event) {
    event.preventDefault(); setSubmitted(true);
    if (score === day.questions.length) setProgress(previous => ({ ...previous, passed: [...new Set([...previous.passed, day.id])] }));
  }
  async function downloadDay() {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      let y = 20;
      const write = (text, size = 11) => {
        pdf.setFontSize(size);
        for (const line of pdf.splitTextToSize(text, 170)) {
          if (y > 275) { pdf.addPage(); y = 20; }
          pdf.text(line, 20, y); y += size * 0.5 + 2;
        }
        y += 4;
      };
      write(`GPC Academy / Day ${day.id}`, 12); write(day.title, 22);
      write('PROTOTYPE - Sample learning material'); write(day.description);
      day.lessons.forEach(item => { write(item.title, 16); write(item.intro); item.steps.forEach(step => { write(step.title, 12); write(step.text); }); write(`Practice: ${item.exercise}`); });
      write('Knowledge check', 16);
      day.questions.forEach((q, i) => { write(`${i + 1}. ${q.prompt}`); q.options.forEach((option, j) => write(`${String.fromCharCode(65 + j)}. ${option}`)); });
      write('Your notes', 16); write(String(progress.notes[day.id] || 'No notes yet.'));
      pdf.save(`gpc-academy-day-${day.id}.pdf`); setNotice('Day guide downloaded.');
    } catch { setNotice('Download could not be created. Please try again.'); }
  }
  function handleKeys(event) {
    if (event.target.getAttribute('role') === 'tab' && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const tabs = ['lesson', 'quiz', 'notes'];
      const index = tabs.indexOf(tab);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
      setTab(tabs[next]);
      document.getElementById(`training-tab-${tabs[next]}`)?.focus();
    }

  }

  return (
    <div className="training-page">
      <section className="training-workspace" aria-labelledby="training-title" onKeyDown={handleKeys}>
        <header className="training-header">
          <div className="training-brand"><span className="training-brand-icon"><GraduationCap size={23} /></span><div><strong id="training-title">GPC Academy</strong><small>A little learning. A lot of possibility.</small></div><span className="training-preview">Prototype</span></div>
        </header>
        <div className="training-layout">
          <aside className="training-sidebar">
            <div className="training-course-label">YOUR LEARNING PATH</div>
            <h2>From first steps<br />to everyday confidence.</h2>
            <div className="training-progress-label"><span>Course progress</span><strong>{percent}%</strong></div>
            <progress value={percent} max="100" aria-label="Course progress" />
            <p className="training-muted training-small">{progress.passed.filter(id => trainingDays.find(d => d.id === id).lessons.every(l => progress.completed.includes(l.id))).length} of 8 days completed</p>
            <nav className="training-days" aria-label="Training days">
              {trainingDays.map(item => {
                const complete = progress.passed.includes(item.id) && item.lessons.every(l => progress.completed.includes(l.id));
                return <button key={item.id} onClick={() => selectDay(item.id)} aria-label={`Day ${item.id}: ${item.title}`} className={`training-day ${day.id === item.id ? 'is-active' : ''}`} aria-current={day.id === item.id ? 'step' : undefined}>
                  <span className={`training-day-number ${complete ? 'is-complete' : ''}`}>{complete ? <Check size={16} /> : String(item.id).padStart(2, '0')}</span>
                  <span><small>DAY {item.id}{complete ? ' · COMPLETE' : ''}</small><strong>{item.title}</strong></span><ArrowRight size={14} />
                </button>;
              })}
            </nav>
            <div className="training-sidebar-note"><BookOpen size={18} /><span>Make room for a small win.<small>About 20 minutes a day, at your pace.</small></span></div>
          </aside>
          <div className="training-main" ref={content}>
            <div className="training-heading-row"><span className="training-eyebrow">YOUR WORKSPACE ESSENTIALS <span>/</span> DAY {day.id} OF 8</span><button className="training-button secondary" onClick={downloadDay}><Download size={16} /> Download day guide</button></div>
            <div className="training-day-heading"><div><h1>{day.title}</h1><p>{day.description}</p></div><span className="training-time"><Clock3 size={15} /> 20 min</span></div>
            <div className="training-day-summary"><span><span className="training-live-dot" />{progress.passed.includes(day.id) && dayDone === 3 ? 'Day complete. Nicely done!' : 'One step closer to confident work'}</span><span>{dayDone} / 3 lessons <span className="training-divider">·</span> {progress.passed.includes(day.id) ? 'Quiz passed' : '1 knowledge check'}</span></div>
            <div className="training-segments" aria-label={`${dayDone} of 3 lessons completed`}>{day.lessons.map(item => <span key={item.id} className={progress.completed.includes(item.id) ? 'filled' : ''} />)}<span className={progress.passed.includes(day.id) ? 'filled' : ''} /></div>
            <div className="training-content-grid">
              <div>
                <div className="training-tabs" role="tablist" aria-label="Day content">{[['lesson', BookOpen, 'Lessons'], ['quiz', ListChecks, 'Knowledge check'], ['notes', NotebookPen, 'My notes']].map(([value, icon, label]) => <button key={value} id={`training-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="training-panel" onClick={() => setTab(value)}> {createElement(icon, { size: 16 })}{label}</button>)}</div>
                <section className="training-lesson-card" id="training-panel" role="tabpanel" aria-labelledby={`training-tab-${tab}`}>
                  {tab === 'lesson' && <>
                    <div className="training-lesson-kicker"><span>LESSON {lessonIndex + 1} OF 3</span><span><Clock3 size={13} /> {lesson.minutes} min read</span></div>
                    <h2>{lesson.title}</h2><p className="training-intro">{lesson.intro}</p>
                    <div className="training-concept"><div className="training-concept-icon"><ListChecks size={28} /></div><div><span>THE EVERYDAY WORKFLOW</span><strong>A clear goal. A little context. A next step.</strong><p>Good habits make great work feel easier.</p></div></div>
                    {lesson.steps.map((step, index) => <div className="training-step" key={step.title}><span>{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>)}
                    <div className="training-practice"><Lightbulb size={20} /><div><h3>Make it yours</h3><p>{lesson.exercise}</p><button onClick={() => setTab('notes')}>Add a practice note <ArrowRight size={14} /></button></div></div>
                    <footer className="training-lesson-footer"><button className="training-button secondary" disabled={lessonIndex === 0} onClick={() => setLessonIndex(lessonIndex - 1)}><ArrowLeft size={15} /> Previous</button><button className="training-button primary" onClick={finishLesson}>{progress.completed.includes(lesson.id) ? 'Continue' : 'Complete & continue'}<ArrowRight size={16} /></button></footer>
                  </>}
                  {tab === 'quiz' && <><span className="training-eyebrow">PUT IT INTO PRACTICE</span><h2>A quick confidence check</h2><p className="training-intro">Three questions to help the learning stick. Get all three right to complete your day. You can try as many times as you like.</p>{dayDone < 3 ? <div className="training-practice"><BookOpen size={22} /><div><h3>A little learning first</h3><p>Complete the three lessons to unlock your knowledge check.</p><button onClick={() => { setLessonIndex(day.lessons.findIndex(l => !progress.completed.includes(l.id))); setTab('lesson'); }}>Continue learning <ArrowRight size={14} /></button></div></div> : <form onSubmit={submitQuiz}>{day.questions.map((q, index) => <fieldset className="training-question" key={q.prompt}><legend>{index + 1}. {q.prompt}</legend>{q.options.map((option, choice) => <label key={option} className={`training-answer ${answers[index] === choice ? 'selected' : ''} ${submitted && q.correct === choice ? 'correct' : ''}`}><input type="radio" name={`question-${index}`} checked={answers[index] === choice} disabled={submitted} onChange={() => setAnswers(previous => ({ ...previous, [index]: choice }))} />{option}{submitted && q.correct === choice && <CheckCircle2 size={17} />}</label>)}{submitted && <p className="training-feedback">{answers[index] === q.correct ? 'Correct. ' : 'Not quite. '}{q.explanation}</p>}</fieldset>)}{submitted ? <div className="training-result" role="status"><Trophy size={25} /><h3>{score === 3 ? 'You did it. Another day in the books.' : `${score} of 3 correct. Give it another go.`}</h3><p>{score === 3 ? (percent === 100 ? 'Your learning path is complete. You can revisit any day whenever you like.' : 'Your progress is saved. Keep the momentum going.') : 'Review the explanations above, then try again.'}</p><button type="button" className="training-button primary" onClick={() => { if (score === 3 && day.id < 8) selectDay(day.id + 1); else { setAnswers({}); setSubmitted(false); } }}>{score === 3 && day.id < 8 ? 'Continue to next day' : 'Try the quiz again'}<ArrowRight size={16} /></button></div> : <button className="training-button primary" disabled={Object.keys(answers).length !== 3} type="submit">Check my answers <ArrowRight size={16} /></button>}</form>}</>}
                  {tab === 'notes' && <><span className="training-eyebrow">YOUR PERSONAL TAKEAWAYS</span><h2>A space for your thoughts</h2><p className="training-intro">Capture an idea, work through the practice, or jot down a question to revisit.</p><label htmlFor="training-notes" className="training-note-label">Day {day.id} notes</label><textarea id="training-notes" value={typeof progress.notes[day.id] === 'string' ? progress.notes[day.id] : ''} onChange={event => setProgress(previous => ({ ...previous, notes: { ...previous.notes, [day.id]: event.target.value } }))} placeholder="One thing I learned today…" /><p className="training-small training-muted">{saveError ? 'Browser storage is unavailable. Download your notes to keep them.' : 'Automatically saved in this browser. Included in your day guide.'}</p></>}
                </section>
              </div>
              <aside className="training-day-outline"><span className="training-eyebrow">IN THIS DAY</span>{day.lessons.map((item, index) => <button key={item.id} className={tab === 'lesson' && lessonIndex === index ? 'active' : ''} onClick={() => { setLessonIndex(index); setTab('lesson'); }}><span className={progress.completed.includes(item.id) ? 'training-outline-check' : ''}>{progress.completed.includes(item.id) ? <CheckCircle2 size={18} /> : <BookOpen size={17} />}</span><span><strong>{item.title}</strong><small>{item.minutes} min · Lesson {index + 1}</small></span></button>)}<button className={tab === 'quiz' ? 'active' : ''} onClick={() => setTab('quiz')}><ListChecks size={18} /><span><strong>Knowledge check</strong><small>{progress.passed.includes(day.id) ? 'Passed' : '3 questions · 5 min'}</small></span></button><div className="training-takeaway"><Lightbulb size={21} /><h3>Progress over perfection</h3><p>Take your time. Revisit a lesson, try something out, and make the learning your own.</p></div><p className="training-prototype-note">Sample curriculum for preview.<br />Final training content is coming later.</p></aside>
            </div>
            <div className="training-bottom"><span>{saveError ? 'Progress could not be saved in this browser.' : 'Your progress is saved on this device.'}</span><span role="status">{notice}</span></div>
          </div>
        </div>
      </section>
    </div>
  );
}
