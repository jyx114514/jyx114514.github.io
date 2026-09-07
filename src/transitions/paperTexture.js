import { CanvasTexture, SRGBColorSpace } from 'three';

export function paperTexture(patterned = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#f1f8ff';
  ctx.fillRect(0, 0, 256, 384);
  ctx.strokeStyle = '#c9e0ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 250, 378);
  if (patterned) {
    ctx.strokeStyle = 'rgba(78,140,181,.15)';
    ctx.lineWidth = 1;
    for (let y = 110; y < 330; y += 17) {
      ctx.beginPath(); ctx.moveTo(28, y); ctx.lineTo(y % 3 ? 224 : 174, y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(58, 61, 23, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(150, 38, 72, 43);
    ctx.beginPath(); ctx.moveTo(36, 61); ctx.lineTo(80, 61); ctx.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
