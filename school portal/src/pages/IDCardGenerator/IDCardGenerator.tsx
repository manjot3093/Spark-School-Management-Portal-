import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';

type TemplateKey = 'student-1' | 'student-2' | 'teacher-1' | 'teacher-2';

const IDCardGenerator: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [template, setTemplate] = useState<TemplateKey>('student-1');
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [personPhotoFile, setPersonPhotoFile] = useState<File | null>(null);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);
  const [personPhotoUrl, setPersonPhotoUrl] = useState<string | null>(null);
  const [name, setName] = useState('Student Name');
  const [idNumber, setIdNumber] = useState('STD-001');
  const [classOrDept, setClassOrDept] = useState('Class 1');
  const [role, setRole] = useState('Student');

  // card dimensions (px)
  const width = 400;
  const height = 250;

  useEffect(() => {
    // revoke object URLs on unmount
    return () => {
      if (schoolLogoUrl) URL.revokeObjectURL(schoolLogoUrl);
      if (personPhotoUrl) URL.revokeObjectURL(personPhotoUrl);
    };
  }, [schoolLogoUrl, personPhotoUrl]);

  useEffect(() => {
    renderCanvas();
  }, [template, schoolLogoUrl, personPhotoUrl, name, idNumber, classOrDept, role]);

  const onSchoolLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setSchoolLogoFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setSchoolLogoUrl(url);
    } else {
      setSchoolLogoUrl(null);
    }
  };

  const onPersonPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPersonPhotoFile(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setPersonPhotoUrl(url);
    } else {
      setPersonPhotoUrl(null);
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const renderCanvas = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.clearRect(0, 0, width, height);

    // Template styles
    if (template.startsWith('student')) {
      // light blue student style
      ctx.fillStyle = '#f3f9ff';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#0b63d6';
      ctx.fillRect(0, 0, width, 50);
    } else {
      // teacher style - light gray with green header
      ctx.fillStyle = '#fbfff6';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#1f9d5a';
      ctx.fillRect(0, 0, width, 50);
    }

    // School logo (left of header)
    try {
      if (schoolLogoUrl) {
        const logo = await loadImage(schoolLogoUrl);
        const logoSize = 40;
        ctx.drawImage(logo, 10, 5, logoSize, logoSize);
      } else {
        // placeholder square
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillRect(10, 5, 40, 40);
      }
    } catch (err) {
      console.warn('Failed to load school logo', err);
    }

    // Title text in header
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SCHOOL NAME', width / 2, 32);

    // Photo box on right
    const photoX = width - 110;
    const photoY = 60;
    const photoW = 90;
    const photoH = 110;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(photoX - 5, photoY - 5, photoW + 10, photoH + 10);
    ctx.strokeStyle = '#ccc';
    ctx.strokeRect(photoX - 5, photoY - 5, photoW + 10, photoH + 10);

    try {
      if (personPhotoUrl) {
        const p = await loadImage(personPhotoUrl);
        // fit cover
        const ratio = Math.max(photoW / p.width, photoH / p.height);
        const sw = photoW / ratio;
        const sh = photoH / ratio;
        const sx = (p.width - sw) / 2;
        const sy = (p.height - sh) / 2;
        ctx.drawImage(p, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
      } else {
        // placeholder
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.fillStyle = '#999';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No Photo', photoX + photoW / 2, photoY + photoH / 2);
      }
    } catch (err) {
      console.warn('Failed to load person photo', err);
    }

    // Text fields
    ctx.fillStyle = '#222';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(name, 20, 90);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#333';
    ctx.fillText(`ID: ${idNumber}`, 20, 115);
    ctx.fillText(classOrDept, 20, 140);
    ctx.fillText(role, 20, 165);

    // Footer stripe
    ctx.fillStyle = '#f1f1f1';
    ctx.fillRect(0, height - 40, width, 40);
    ctx.fillStyle = '#555';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Valid: Academic Year', 20, height - 18);
  };

  const downloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '-')}-idcard.png`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadPDF = async () => {
    // Try to dynamically import jsPDF if available
    try {
      // jsPDF is optional. If not installed, we'll show a toast (dynamic import suppressed by ts-ignore)
      // @ts-ignore
      const { jsPDF } = await import('jspdf');
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: [width, height] });
      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      pdf.save(`${name.replace(/\s+/g, '-')}-idcard.pdf`);
    } catch (err) {
      console.warn('jsPDF not available or failed to load', err);
      toast.error('PDF export requires the jsPDF library. Install it with: npm install jspdf');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 sm:px-8 sm:py-8">
        <p className="text-xs font-bold uppercase tracking-[.16em] text-orange-600 mb-2">School identity / ID cards</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">ID card generator</h1>
        <p className="text-slate-600 mt-1">Prepare a card, check the preview, then download a print-ready file.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(280px,370px)_minmax(0,1fr)] gap-5 items-start">
        <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="font-bold text-lg text-slate-900">Card details</h2>
          <div>
            <label htmlFor="card-template" className="block text-sm font-semibold mb-2">Template</label>
            <select id="card-template" value={template} onChange={(e) => setTemplate(e.target.value as TemplateKey)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg">
              <option value="student-1">Student Template 1</option>
              <option value="student-2">Student Template 2</option>
              <option value="teacher-1">Teacher Template 1</option>
              <option value="teacher-2">Teacher Template 2</option>
            </select>
          </div>

          <div>
            <label htmlFor="card-logo" className="block text-sm font-semibold mb-2">School logo (PNG/JPG)</label>
            <input id="card-logo" className="block w-full text-sm" type="file" accept="image/png,image/jpeg" onChange={onSchoolLogoChange} />
          </div>

          <div>
            <label htmlFor="card-photo" className="block text-sm font-semibold mb-2">Person photo (PNG/JPG)</label>
            <input id="card-photo" className="block w-full text-sm" type="file" accept="image/png,image/jpeg" onChange={onPersonPhotoChange} />
          </div>

          <div>
            <label htmlFor="card-name" className="block text-sm font-semibold mb-2">Name</label>
            <input id="card-name" required maxLength={100} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label htmlFor="card-id" className="block text-sm font-semibold mb-2">ID number</label>
            <input id="card-id" required maxLength={50} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
          </div>

          <div>
            <label htmlFor="card-class" className="block text-sm font-semibold mb-2">Class / department</label>
            <input id="card-class" maxLength={80} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg" value={classOrDept} onChange={(e) => setClassOrDept(e.target.value)} />
          </div>

          <div>
            <label htmlFor="card-role" className="block text-sm font-semibold mb-2">Role</label>
            <select id="card-role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2.5 border border-slate-300 rounded-lg">
              <option>Student</option>
              <option>Teacher</option>
            </select>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200">
            <button type="button" onClick={renderCanvas} className="px-4 py-2.5 bg-slate-100 text-[#163f5d] font-semibold rounded-lg hover:bg-slate-200">Refresh preview</button>
            <button type="button" onClick={downloadPNG} className="px-4 py-2.5 bg-[#163f5d] text-white font-semibold rounded-lg hover:bg-[#0e314b]">Download PNG</button>
            <button type="button" onClick={downloadPDF} className="px-4 py-2.5 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600">Download PDF</button>
          </div>
        </div>

        <div className="min-w-0">
          <div className="bg-white p-5 sm:p-7 rounded-xl border border-slate-200">
            <h2 className="font-bold text-lg text-slate-900 mb-5">Live preview</h2>
            <div className="flex items-center justify-center">
              <canvas ref={canvasRef} className="max-w-full h-auto shadow-xl rounded-sm" style={{ border: '1px solid #e5e7eb' }} />
            </div>
            <p className="text-xs text-gray-500 mt-2">Preview of ID card (locked layout). Upload a school logo to include it.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IDCardGenerator;
