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

    // Overlay Graphics - REMOVED FOR UMBRA
    // The texture should now just be the clean image
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
};

