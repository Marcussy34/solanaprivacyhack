import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

// --- AUDIO UTILS ---
// Creates a rustle sound when hovering over the cloth
const createAudioContext = () => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  return Ctx ? new Ctx() : null;
};

const playHoverRustle = (ctx) => {
  if (!ctx || ctx.state === 'suspended') {
      ctx?.resume().catch(() => {});
      return;
  }
  
  const duration = 0.2;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Pink noise for rustle effect
  let b0, b1, b2, b3, b4, b5, b6;
  b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.08; 
    b6 = white * 0.115926;
  }

  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = buffer;
  
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, ctx.currentTime);
  gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.05);
  gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;

  noiseSrc.connect(filter);
  filter.connect(gainNode);
  gainNode.connect(ctx.destination);
  noiseSrc.start();
};

// --- CUSTOM FOLDED PAPER MATERIAL ---
// Simulates a folded/crinkled paper effect with displacement
const PaperMaterial = shaderMaterial(
  {
    uTime: 0,
    uTexture: null,
    uBackTexture: null,
    uHover: 0,
    uMouse: new THREE.Vector2(0.5, 0.5),
    uResolution: new THREE.Vector2(1, 1),
  },
  // VERTEX SHADER
  `
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;

    uniform float uTime;
    uniform float uHover;
    uniform vec2 uMouse;

    // Simplex Noise for organic folds
    vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
    float snoise(vec2 v){
        const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                -0.577350269189626, 0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod(i, 289.0);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
        + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
    }

    void main() {
        vUv = uv;
        vec3 pos = position;

        // --- DEEP FOLD PHYSICS ---
        float foldFrequency = 1.0; // Reduced frequency for broader, stiffer folds
        float foldAmplitude = 0.04; // Significantly reduced amplitude for rigidity
        
        // Primary Fold (Diagonal)
        float n1 = snoise(uv * foldFrequency + vec2(0.0, uTime * 0.02));
        float crease1 = 1.0 - abs(n1);
        crease1 = pow(crease1, 3.0);
        
        // Secondary Fold (Crossing)
        float n2 = snoise(uv * 2.5 - vec2(uTime * 0.01));
        float crease2 = 1.0 - abs(n2);
        crease2 = pow(crease2, 4.0);

        // Micro crinkles
        float grain = snoise(uv * 15.0) * 0.01; // Reduced grain

        float elevation = (crease1 * foldAmplitude) + (crease2 * 0.02) + grain;
        
        // Interactive Press from mouse
        float dist = distance(uv, uMouse);
        float press = smoothstep(0.4, 0.0, dist) * 0.05; // Reduced press depth
        elevation -= press;

        pos.z += elevation;
        vElevation = elevation;

        // Computing normals for sharp shading
        float d1 = crease1 * 3.0;
        float d2 = crease2 * 2.0;
        
        vec3 objectNormal = normalize(vec3(-d1 * n1 - d2 * n2, -d1 * n1 - d2 * n2, 1.0));
        
        vNormal = normalMatrix * objectNormal;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // FRAGMENT SHADER
  `
    uniform sampler2D uTexture;
    uniform sampler2D uBackTexture;
    uniform float uHover;
    uniform float uTime;
    
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormal;

    void main() {
        vec3 color;
        if (gl_FrontFacing) {
            color = texture2D(uTexture, vUv).rgb;
        } else {
            // Flip UV x for back face to prevent mirroring
            vec2 backUv = vec2(1.0 - vUv.x, vUv.y);
            color = texture2D(uBackTexture, backUv).rgb;
        }

        // --- PAPER GRAIN & NOISE ---
        float grain = (fract(sin(dot(vUv, vec2(12.9898,78.233)*2.0)) * 43758.5453) - 0.5) * 0.05;
        color += grain;

        // --- PHYSICAL SHADING ---
        vec3 lightDir = normalize(vec3(1.0, 1.0, 2.0));
        // Flip normal for back face lighting
        vec3 normal = gl_FrontFacing ? vNormal : -vNormal;
        float diff = max(dot(normal, lightDir), 0.0);
        
        // Ambient Occlusion in valleys
        float ao = smoothstep(-0.05, 0.2, vElevation);
        
        // Highlights on ridges
        float highlight = smoothstep(0.1, 0.25, vElevation) * 0.1;

        // Increased ambient light for brightness (0.7 -> 0.9)
        color *= (0.9 + diff * 0.6);
        color *= (0.5 + ao * 0.5);
        color += highlight;

        gl_FragColor = vec4(color, 1.0);
    }
  `
);

extend({ PaperMaterial });

// Main ClothCard component
export const ClothCard = ({ 
  texture, 
  backTexture,
  position = [0,0,0], 
  scale = [1,1,1]
}) => {
  const materialRef = useRef(null);
  const meshRef = useRef(null);
  const [hovered, setHover] = useState(false);
  const audioCtxRef = useRef(null);

  useEffect(() => {
      audioCtxRef.current = createAudioContext();
      return () => {
          audioCtxRef.current?.close();
      }
  }, []);

  useFrame((state, delta) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      materialRef.current.uniforms.uHover.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uHover.value,
        hovered ? 1 : 0,
        delta * 8
      );
    }

    if (meshRef.current) {
        // Floating animation
        const time = state.clock.getElapsedTime();
        meshRef.current.position.y = Math.sin(time * 0.5) * 0.1; // Gentle float
    }
  });

  const handlePointerOver = () => {
      setHover(true);
      playHoverRustle(audioCtxRef.current); 
      document.body.style.cursor = 'grab'; 
  };

  const handlePointerOut = () => {
      setHover(false);
      document.body.style.cursor = 'auto';
  };

  const handlePointerMove = (e) => {
    if (e.uv && materialRef.current) {
        materialRef.current.uniforms.uMouse.value.set(e.uv.x, e.uv.y);
    }
  };

  return (
    <mesh 
        ref={meshRef} 
        position={new THREE.Vector3(...position)} 
        scale={new THREE.Vector3(...scale)}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onPointerMove={handlePointerMove}
    >
      {/* High segment count for smooth fold geometry */}
      <planeGeometry args={[1, 1, 128, 128]} />
      <paperMaterial 
        ref={materialRef} 
        uTexture={texture} 
        uBackTexture={backTexture || texture} // Fallback to front texture if no back provided
        transparent 
        side={THREE.DoubleSide} 
      />
    </mesh>
  );
};

