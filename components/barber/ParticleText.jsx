import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

extend({ TextGeometry });

// Use jsdelivr which supports CORS properly
const fontUrl = 'https://cdn.jsdelivr.net/npm/three/examples/fonts/helvetiker_bold.typeface.json';

// Interactive particle system that forms text
const Particles = () => {
  const { mouse, viewport } = useThree();
  const pointsRef = useRef(null);
  
  // Custom shader material for particles
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0 },
        uMouse: { value: new THREE.Vector3(0, 0, 0) },
        uColor: { value: new THREE.Color('#FF6600') },
        uHoverColor: { value: new THREE.Color('#00FFFF') } // Cyan color burst
    },
    vertexShader: `
        uniform float uTime;
        uniform vec3 uMouse;
        attribute float aScale;
        attribute vec3 aRandom;
        
        varying float vHoverMix;

        void main() {
            vec3 pos = position;
            
            float dist = distance(pos.xy, uMouse.xy);
            float radius = 5.0; 
            float force = smoothstep(radius, 0.0, dist);
            
            // Pass interaction strength to fragment for color
            vHoverMix = force;

            // --- VORTEX SWIRL EFFECT ---
            vec2 toParticle = pos.xy - uMouse.xy;
            float angle = atan(toParticle.y, toParticle.x);
            float len = length(toParticle);
            
            // Swirl rotation
            float swirl = force * 4.0; 
            float s = sin(swirl);
            float c = cos(swirl);
            
            // Rotate position around mouse
            vec2 rotated = vec2(
                toParticle.x * c - toParticle.y * s,
                toParticle.x * s + toParticle.y * c
            );
            
            // Mix original position with rotated position
            vec3 targetPos = vec3(uMouse.xy + rotated, pos.z);
            pos = mix(pos, targetPos, force * 0.8);

            // Add chaotic z-displacement when hovering
            pos.z += sin(uTime * 10.0 + pos.x) * force * 0.5;

            // Standard drift
            pos.x += sin(uTime * aRandom.x + position.y) * 0.01;
            pos.y += cos(uTime * aRandom.y + position.x) * 0.01;

            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            
            gl_PointSize = (18.0 * aScale) * (1.0 / -mvPosition.z);
        }
    `,
    fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uHoverColor;
        varying float vHoverMix;

        void main() {
            float r = distance(gl_PointCoord, vec2(0.5));
            if (r > 0.5) discard;
            float alpha = 1.0 - smoothstep(0.3, 0.5, r);
            
            // Vivid color mix on hover
            vec3 finalColor = mix(uColor, uHoverColor, vHoverMix);
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }), []);

  const [geometry, setGeometry] = useState(null);

  // Load font and create particle geometry from text
  useEffect(() => {
    const loader = new FontLoader();
    loader.load(fontUrl, (font) => {
        const denseGeo = new TextGeometry('PRECISION', {
             font: font,
             size: 7.5,
             depth: 0.5,
             curveSegments: 12, 
             bevelEnabled: true,
             bevelThickness: 0.1,
             bevelSize: 0.05,
             bevelSegments: 4
        });
        denseGeo.center();
        
        const posAttribute = denseGeo.attributes.position;
        const positions = [];
        const scales = [];
        const randoms = [];

        // High density particles
        for (let i = 0; i < posAttribute.count; i++) {
            const x = posAttribute.getX(i);
            const y = posAttribute.getY(i);
            const z = posAttribute.getZ(i);

            for(let j=0; j<4; j++) {
                 positions.push(
                    x + (Math.random()-0.5) * 0.25,
                    y + (Math.random()-0.5) * 0.25,
                    z + (Math.random()-0.5) * 0.25
                 );
                 scales.push(Math.random() * 0.6 + 0.4);
                 randoms.push(Math.random(), Math.random(), Math.random());
            }
        }
        
        const bufferGeo = new THREE.BufferGeometry();
        bufferGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        bufferGeo.setAttribute('aScale', new THREE.Float32BufferAttribute(scales, 1));
        bufferGeo.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 3));
        
        setGeometry(bufferGeo);
    });
  }, []);

  useFrame((state) => {
    if (material) {
        material.uniforms.uTime.value = state.clock.getElapsedTime();
        material.uniforms.uMouse.value.set(
            (state.mouse.x * viewport.width) / 2,
            (state.mouse.y * viewport.height) / 2,
            0
        );
    }
    
    // RESPONSIVE SCALING
    if (pointsRef.current && geometry) {
        const baseWidth = 45;
        const targetScale = (viewport.width * 0.85) / baseWidth;
        const finalScale = Math.min(1.0, targetScale);
        
        pointsRef.current.scale.setScalar(finalScale);
    }
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

// Main ParticleText component
export const ParticleText = () => {
  return (
    <div className="w-full h-full bg-[#1F0B05]">
        <Canvas camera={{ position: [0, 0, 20], fov: 45 }}>
            <ambientLight intensity={0.5} />
            <Particles />
        </Canvas>
    </div>
  );
};

