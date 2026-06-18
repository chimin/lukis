interface PreviewModalProps {
  text: string;
  title: string;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export function PreviewModal({ text, title, onClose, onCopy, onDownload }: PreviewModalProps) {
  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{title}</span>
          <button onClick={onClose} className="preview-close">×</button>
        </div>
        <pre className="preview-code">{text}</pre>
        <div className="preview-actions">
          <button onClick={onCopy} className="btn">Copy</button>
          <button onClick={onDownload} className="btn">Download</button>
        </div>
      </div>
    </div>
  );
}
