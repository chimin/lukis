export async function exportPng(svgElement: SVGSVGElement, filename = 'diagram.png') {
  const PAD = 40;
  const scale = 2;
  const rect = svgElement.getBBox();
  const width = (rect.width || svgElement.clientWidth || 800) + PAD * 2;
  const height = (rect.height || svgElement.clientHeight || 600) + PAD * 2;

  const cloned = svgElement.cloneNode(true) as SVGSVGElement;
  cloned.setAttribute('width', String(width));
  cloned.setAttribute('height', String(height));
  cloned.setAttribute('viewBox', `${rect.x - PAD} ${rect.y - PAD} ${width} ${height}`);

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(cloned);
  svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + svgString;

  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.width = width * scale;
  img.height = height * scale;

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(url);

  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }, 'image/png');
}
