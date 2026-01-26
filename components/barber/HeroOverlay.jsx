import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

// --- REALISTIC CARD GEOMETRY ---
// Creates a simple rounded card shape
const createCardGeometry = () => {
    const shape = new THREE.Shape();
    // Standard poker card ratio 2.5 : 3.5
    const w = 1.0; 
    const h = 1.4;
    const r = 0.05; 

    // Outer contour with rounded corners
    shape.moveTo(-w/2 + r, -h/2);
    shape.lineTo(w/2 - r, -h/2);
    shape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    shape.lineTo(w/2, h/2 - r);
    shape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    shape.lineTo(-w/2 + r, h/2);
    shape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    shape.lineTo(-w/2, -h/2 + r);
    shape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);

    // Extrude to give depth
    const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 0.01, 
        bevelEnabled: true,
        bevelSegments: 2,
        bevelSize: 0.01, 
        bevelThickness: 0.01
    });
    geometry.center();
    return geometry;
};

// Instanced mesh of falling/floating cards
const HeroCards = ({ count = 60 }) => {
  const meshRef = useRef(null);
  const { viewport, mouse, camera } = useThree();
  const geometry = useMemo(() => createCardGeometry(), []);
  
  // Metallic/Holographic material for cards
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#936DFF', 
    metalness: 0.8,   
    roughness: 0.2,
    envMapIntensity: 2.0,
  }), []);

  // Pre-calculate properties for each card instance
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
        data.push({
            // Spread across width
            x: (Math.random() - 0.5) * 18, 
            
            // Spread vertically: Linear distribution + noise
            yOffset: (i * 0.4) + (Math.random() * 2), 
            
            // FIXED Z: All at same depth so they look identical in size
            z: 0, 
            
            rotSpeed: {
                x: (Math.random() - 0.5) * 1.0,
                y: (Math.random() - 0.5) * 1.0,
                z: (Math.random() - 0.5) * 0.5
            },
            phase: Math.random() * Math.PI * 2,
            rotation: new THREE.Euler(
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
            ),
            // FIXED SCALE: Uniform size
            scale: 0.8 
        });
    }
    return data;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    
    // --- SCROLL LOGIC ---
    // Calculate the exact bottom of the visible frustum at Z=0
    const dist = camera.position.z;
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    
    // Start Y is just below the bottom edge of the screen
    const startY = - (visibleHeight / 2) - 1.0; 
    
    // Global Rise: How much the whole column moves up based on scroll
    const globalRise = (scrollY / vh) * 35; 

    const mouseX = (mouse.x * viewport.width) / 2;
    const mouseY = (mouse.y * viewport.height) / 2;

    particles.forEach((p, i) => {
        // Continuous idle rotation
        p.rotation.x += p.rotSpeed.x * delta;
        p.rotation.y += p.rotSpeed.y * delta;
        p.rotation.z += p.rotSpeed.z * delta;

        let targetX = p.x;
        
        // Target Y: startY + Rise - Offset
        let targetY = startY + globalRise - p.yOffset; 
        
        let targetZ = p.z;

        // Sine wave float for organic feel
        targetY += Math.sin(time * 0.8 + p.phase) * 0.2;
        targetX += Math.cos(time * 0.5 + p.phase) * 0.1;

        // Mouse Repulsion
        const dx = targetX - mouseX;
        const dy = targetY - mouseY;
        const distToMouse = Math.sqrt(dx * dx + dy * dy);
        
        if (distToMouse < 4) {
            const force = (4 - distToMouse) * 0.15;
            const angle = Math.atan2(dy, dx);
            targetX += Math.cos(angle) * force;
            targetY += Math.sin(angle) * force;
            
            // Interaction spin
            p.rotation.x += force * 0.3;
            p.rotation.z += force * 0.3;
        }

        dummy.position.set(targetX, targetY, targetZ);
        dummy.rotation.copy(p.rotation);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} geometry={geometry} material={material} />
  );
};

// Main overlay component with 3D canvas
export const HeroOverlay = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <Canvas 
        eventSource={typeof document !== 'undefined' ? document.body : undefined}
        eventPrefix="client"
        style={{ pointerEvents: 'none' }}
        camera={{ position: [0, 0, 15], fov: 35 }} 
        gl={{ alpha: true, antialias: true }} 
        dpr={[1, 2]}
      >
        <Environment preset="city" environmentIntensity={1.0} />
        
        <ambientLight intensity={0.4} />
        
        {/* Multiple directional lights for metallic reflections */}
        <directionalLight position={[10, 5, 5]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[-10, 5, 2]} intensity={1.5} color="#C049FF" />
        <directionalLight position={[0, -10, 5]} intensity={1.0} color="#936DFF" />
        
        <HeroCards />
      </Canvas>
    </div>
  );
};

