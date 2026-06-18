import { useState, useEffect, useRef, useCallback } from 'react';
import type { DiagramData } from '../types';
import { exportSvg } from '../utils/exportSvg';
import { exportPng } from '../utils/exportPng';
import { exportPlantUml } from '../utils/exportPlantUml';
import { exportMermaid } from '../utils/exportMermaid';

interface ExportDropdownProps {
  svgRef: React.RefObject<SVGSVGElement | null>;
  diagramData: DiagramData;
  showToast: (msg: string) => void;
  onPreview: (format: 'puml' | 'mmd') => void;
}

export function ExportDropdown({ svgRef, diagramData, showToast, onPreview }: ExportDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleTextExport = useCallback(
    async (format: 'puml' | 'mmd', action: 'download' | 'copy') => {
      const text = format === 'puml' ? exportPlantUml(diagramData) : exportMermaid(diagramData);
      const label = format === 'puml' ? 'PlantUML' : 'Mermaid';
      if (action === 'copy') {
        await navigator.clipboard.writeText(text);
        showToast(`${label} copied to clipboard`);
      } else {
        const ext = format === 'puml' ? 'puml' : 'mmd';
        const blob = new Blob([text], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `diagram.${ext}`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      setOpen(false);
    },
    [diagramData, showToast]
  );

  const handleImageExport = useCallback(
    async (format: 'svg' | 'png', action: 'download' | 'copy') => {
      if (!svgRef.current) return;
      if (action === 'copy') {
        try {
          const cloned = svgRef.current.cloneNode(true) as SVGSVGElement;
          if (!cloned.getAttribute('xmlns')) cloned.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(cloned);
          const url = URL.createObjectURL(new Blob([svgString], { type: 'image/svg+xml' }));
          const img = new Image();
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url; });
          const rect = svgRef.current.getBBox();
          const w = (rect.width || 800) + 80;
          const h = (rect.height || 600) + 80;
          const canvas = document.createElement('canvas');
          canvas.width = w * 2;
          canvas.height = h * 2;
          const ctx = canvas.getContext('2d')!;
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 40, 40, w, h);
          URL.revokeObjectURL(url);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
          if (blob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            showToast('Image copied to clipboard');
          }
        } catch {
          if (format === 'svg') exportSvg(svgRef.current!);
          else exportPng(svgRef.current!);
        }
      } else if (format === 'svg') {
        exportSvg(svgRef.current);
      } else {
        exportPng(svgRef.current);
      }
      setOpen(false);
    },
    [svgRef, showToast]
  );

  const handleAction = useCallback(
    async (format: 'svg' | 'png' | 'puml' | 'mmd', action: 'download' | 'copy' | 'preview') => {
      if (action === 'preview') {
        onPreview(format as 'puml' | 'mmd');
        return;
      }
      if (format === 'puml' || format === 'mmd') {
        await handleTextExport(format, action);
      } else {
        await handleImageExport(format, action);
      }
    },
    [handleTextExport, handleImageExport, onPreview]
  );

  const rows: Array<{ label: string; format: 'svg' | 'png' | 'puml' | 'mmd'; showPreview?: boolean }> = [
    { label: 'SVG', format: 'svg' },
    { label: 'PNG', format: 'png' },
    { label: 'PlantUML', format: 'puml', showPreview: true },
    { label: 'Mermaid', format: 'mmd', showPreview: true },
  ];

  return (
    <div className="export-dropdown-wrapper" ref={ref}>
      <button className="btn btn-export" onClick={() => setOpen((o) => !o)} title="Export diagram">
        Export ▾
      </button>
      {open && (
        <div className="export-dropdown">
          {rows.map((row) => (
            <div key={row.label} className="export-row">
              <span className="export-label">{row.label}</span>
              <div className="export-actions">
                <button onClick={() => handleAction(row.format, 'download')} className="export-icon-btn" title={`Download ${row.label}`}>
                  <DownloadIcon />
                </button>
                <button onClick={() => handleAction(row.format, 'copy')} className="export-icon-btn" title={`Copy ${row.label}`}>
                  <CopyIcon />
                </button>
                {row.showPreview && (
                  <button onClick={() => handleAction(row.format, 'preview')} className="export-icon-btn" title={`Preview ${row.label}`}>
                    <EyeIcon />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DownloadIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
}

function CopyIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
}

function EyeIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
