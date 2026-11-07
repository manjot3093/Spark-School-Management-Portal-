import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import { examsAPI } from '../../services/api';

type Option = { _id: string; name: string; section?: string; classId?: string | { _id: string } };
const relatedId = (value?: string | { _id: string }) => typeof value === 'string' ? value : value?._id;
type Question = { text: string; marks: number; answer: string };
type Paper = { _id: string; title: string; classId: string; subjectId: string; topics: string[]; instructions: string; totalMarks: number; status: 'draft' | 'approved'; questions: Question[] };

function exportPdf(paper: Paper, answerKey: boolean, className: string, subjectName: string) {
  const pdf = new jsPDF();
  let y = 20;
  const line = (text: string, size = 11) => {
    pdf.setFontSize(size);
    const rows = pdf.splitTextToSize(text, 175) as string[];
    if (y + rows.length * 6 > 275) { pdf.addPage(); y = 20; }
    pdf.text(rows, 18, y);
    y += rows.length * 6 + 4;
  };
  line(paper.title, 17);
  line(`${className} | ${subjectName} | Total marks: ${paper.totalMarks}`);
  if (answerKey) line('ANSWER KEY', 14);
  if (paper.instructions) line(`Instructions: ${paper.instructions}`);
  paper.questions.forEach((q, i) => {
    line(`${i + 1}. ${q.text} (${q.marks} marks)`);
    if (answerKey) line(`Answer: ${q.answer}`);
  });
  pdf.save(`${paper.title.replace(/[^a-z0-9-]/gi, '_')}-${answerKey ? 'answer-key' : 'question-paper'}.pdf`);
}

const QuestionPapers: React.FC<{ classes: Option[]; subjects: Option[] }> = ({ classes, subjects }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [paper, setPaper] = useState<Paper | null>(null);
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [topics, setTopics] = useState('');
  const [marks, setMarks] = useState(50);
  const [instructions, setInstructions] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = async () => {
    try { const result = await examsAPI.listPapers(); setPapers(result.data || []); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load papers'); }
  };
  useEffect(() => { void refresh(); }, []);

  const generate = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await examsAPI.generatePaper({ classId, subjectId, title, topics: topics.split(',').map(value => value.trim()).filter(Boolean), totalMarks: Number(marks), instructions });
      setPaper(result.data); setMessage('Draft ready. Review every question and answer before approving.'); await refresh();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not generate paper'); }
    finally { setBusy(false); }
  };
  const open = async (id: string) => {
    setBusy(true); setError('');
    try { const result = await examsAPI.getPaper(id); setPaper(result.data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load paper'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!paper) return;
    setBusy(true); setError('');
    try { const result = await examsAPI.updatePaper(paper._id, { title: paper.title, instructions: paper.instructions, questions: paper.questions.map(q => ({ ...q, marks: Number(q.marks) })) }); setPaper(result.data); setMessage('Draft saved.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save draft'); }
    finally { setBusy(false); }
  };
  const approve = async () => {
    if (!paper) return;
    setBusy(true); setError('');
    try { const result = await examsAPI.approvePaper(paper._id); setPaper(result.data); setMessage('Paper approved and ready to export.'); await refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not approve paper'); }
    finally { setBusy(false); }
  };
  const editQuestion = (index: number, field: keyof Question, value: string) => {
    if (!paper) return;
    setPaper({ ...paper, questions: paper.questions.map((q, i) => i === index ? { ...q, [field]: field === 'marks' ? Number(value) : value } : q) });
  };
  const className = classes.find(c => c._id === paper?.classId)?.name || 'Class';
  const subjectName = subjects.find(s => s._id === paper?.subjectId)?.name || 'Subject';

  return <div className="space-y-6">
    <div><h2 className="text-xl font-bold text-[#1d3568]">AI question papers</h2><p className="text-sm text-gray-600">Enter a teacher brief, review the draft, then export separate student and answer key PDFs.</p></div>
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}
    {message && <p role="status" className="rounded bg-green-50 p-3 text-green-800">{message}</p>}
    <form onSubmit={generate} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
      <label className="text-sm">Class<select required value={classId} onChange={e => { setClassId(e.target.value); setSubjectId(''); }} className="mt-1 w-full rounded border p-2"><option value="">Select class</option>{classes.map(c => <option key={c._id} value={c._id}>{c.name} {c.section}</option>)}</select></label>
      <label className="text-sm">Subject<select required value={subjectId} onChange={e => setSubjectId(e.target.value)} className="mt-1 w-full rounded border p-2"><option value="">Select subject</option>{subjects.filter(s => !s.classId || relatedId(s.classId) === classId).map(s => <option key={s._id} value={s._id}>{s.name}</option>)}</select></label>
      <label className="text-sm">Paper title<input required maxLength={200} value={title} onChange={e => setTitle(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm">Total marks<input required type="number" min="1" max="500" value={marks} onChange={e => setMarks(Number(e.target.value))} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm md:col-span-2">Topics, separated by commas<input required value={topics} onChange={e => setTopics(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <label className="text-sm md:col-span-2">Instructions<textarea value={instructions} onChange={e => setInstructions(e.target.value)} className="mt-1 w-full rounded border p-2" /></label>
      <button disabled={busy} className="rounded bg-[#1d3568] px-4 py-2 text-white disabled:opacity-50 md:col-span-2">{busy ? 'Working…' : 'Generate draft'}</button>
    </form>
    <section><h3 className="mb-2 font-semibold">Saved papers</h3>{papers.length === 0 ? <p className="text-sm text-gray-600">No question papers yet.</p> : <div className="flex flex-wrap gap-2">{papers.map(item => <button key={item._id} onClick={() => void open(item._id)} className="rounded border px-3 py-2 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">{item.title} · {item.status}</button>)}</div>}</section>
    {paper && <section className="space-y-4 rounded-lg border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{paper.status === 'draft' ? 'Review draft' : 'Approved paper'}</h3><span className="text-sm">{paper.questions.reduce((sum, q) => sum + Number(q.marks), 0)} / {paper.totalMarks} marks</span></div>
      <label className="block text-sm">Title<input disabled={paper.status !== 'draft'} value={paper.title} onChange={e => setPaper({ ...paper, title: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
      <label className="block text-sm">Instructions<textarea disabled={paper.status !== 'draft'} value={paper.instructions} onChange={e => setPaper({ ...paper, instructions: e.target.value })} className="mt-1 w-full rounded border p-2" /></label>
      {paper.questions.map((q, i) => <div key={i} className="space-y-2 rounded bg-[#edf3ff] p-3"><label className="block text-sm">Question {i + 1}<textarea disabled={paper.status !== 'draft'} value={q.text} onChange={e => editQuestion(i, 'text', e.target.value)} className="mt-1 w-full rounded border p-2" /></label><label className="block text-sm">Marks<input disabled={paper.status !== 'draft'} type="number" min="1" max="100" value={q.marks} onChange={e => editQuestion(i, 'marks', e.target.value)} className="mt-1 w-24 rounded border p-2" /></label><label className="block text-sm">Model answer<textarea disabled={paper.status !== 'draft'} value={q.answer} onChange={e => editQuestion(i, 'answer', e.target.value)} className="mt-1 w-full rounded border p-2" /></label></div>)}
      <div className="flex flex-wrap gap-2">{paper.status === 'draft' ? <><button disabled={busy} onClick={() => void save()} className="rounded border border-[#1d3568] px-4 py-2 text-[#1d3568]">Save edits</button><button disabled={busy || paper.questions.reduce((sum, q) => sum + Number(q.marks), 0) !== paper.totalMarks} onClick={() => void approve()} className="rounded bg-[#1d3568] px-4 py-2 text-white disabled:opacity-50">Approve paper</button></> : <><button onClick={() => exportPdf(paper, false, className, subjectName)} className="rounded bg-[#1d3568] px-4 py-2 text-white">Download student PDF</button><button onClick={() => exportPdf(paper, true, className, subjectName)} className="rounded border border-[#1d3568] px-4 py-2 text-[#1d3568]">Download answer key PDF</button></>}</div>
    </section>}
  </div>;
};

export default QuestionPapers;
