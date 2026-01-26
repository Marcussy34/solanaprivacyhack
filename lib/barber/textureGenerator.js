import * as THREE from 'three';
import { COLORS } from './constants';

// Helper to draw oval numbers on canvas
const drawOvalNumber = (ctx, num, x, y, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(x, y, 24, 14, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = 'bold 16px Roboto Condensed';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString().padStart(2, '0'), x, y + 2);
};

// --- COLORFUL CARD GENERATOR ---
// Creates a canvas texture with the poster design overlaid on an image
export const createColorfulCardTexture = (img) => {
    const canvas = document.createElement('canvas');
    const width = 1000;
    const height = 1600;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return new THREE.CanvasTexture(canvas);

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, width, height);

    // Draw Image fully vivid
    if (img) {
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width / 2) - (img.width / 2) * scale;
        const y = (height / 2) - (img.height / 2) * scale;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    }

    // Overlay Graphics
    const ORANGE = COLORS.PRIMARY;
    const WHITE = '#FFFFFF';
    
    ctx.strokeStyle = ORANGE;
    ctx.fillStyle = WHITE;

    // Header
    const headerH = 160;
    ctx.lineWidth = 4;
    
    // Top/Bottom Lines
    ctx.beginPath();
    ctx.moveTo(0, 4); ctx.lineTo(width, 4);
    ctx.moveTo(0, headerH); ctx.lineTo(width, headerH);
    ctx.stroke();

    // Vertical Separators
    ctx.beginPath();
    ctx.moveTo(160, 0); ctx.lineTo(160, headerH);
    ctx.moveTo(width - 160, 0); ctx.lineTo(width - 160, headerH);
    ctx.stroke();

    // Left Icon
    ctx.strokeStyle = WHITE;
    ctx.beginPath();
    ctx.moveTo(60, headerH/2); ctx.lineTo(100, headerH/2);
    ctx.stroke();
    ctx.strokeStyle = ORANGE;

    // Header Text
    ctx.font = 'bold 30px Oswald';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('20', width/2 - 200, headerH/2);
    ctx.fillText('16', width/2 + 200, headerH/2);
    
    ctx.save();
    ctx.translate(width/2, headerH/2);
    ctx.scale(1, 1.4);
    ctx.font = 'bold 120px Oswald';
    ctx.fillStyle = ORANGE;
    ctx.fillText("ANGIE'S", 0, 5);
    ctx.restore();

    // Right Logo
    const logoX = width - 80;
    ctx.fillStyle = WHITE;
    ctx.font = 'bold 28px Oswald';
    ctx.fillText('BARBER', logoX, headerH/2 - 30);
    ctx.fillText('BARBER', logoX, headerH/2);
    ctx.fillText('BARBER', logoX, headerH/2 + 30);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

