import React, { useRef, useMemo, useState, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Text, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// --- CONSTANTS ---
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const COLORS = {
  '♠': '#000000',
  '♥': '#ff0000',
  '♣': '#000000',
  '♦': '#ff0000'
};

// --- GEOMETRY ---
const createCardGeometry = () => {
    const shape = new THREE.Shape();
    const w = 1.0; 
    const h = 1.4;
    const r = 0.05; 

    shape.moveTo(-w/2 + r, -h/2);
    shape.lineTo(w/2 - r, -h/2);
    shape.quadraticCurveTo(w/2, -h/2, w/2, -h/2 + r);
    shape.lineTo(w/2, h/2 - r);
    shape.quadraticCurveTo(w/2, h/2, w/2 - r, h/2);
    shape.lineTo(-w/2 + r, h/2);
    shape.quadraticCurveTo(-w/2, h/2, -w/2, h/2 - r);
    shape.lineTo(-w/2, -h/2 + r);
    shape.quadraticCurveTo(-w/2, -h/2, -w/2 + r, -h/2);

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

// --- INDIVIDUAL CARD COMPONENT ---
const PokerCard3D = ({ rank, suit, position, rotation, scale, phase, rotSpeed, yOffset, backTexture }) => {
  const groupRef = useRef();
  const { viewport, camera } = useThree();
  const geometry = useMemo(() => createCardGeometry(), []);
  
  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    
    // --- SCROLL LOGIC ---
    const dist = camera.position.z;
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const visibleHeight = 2 * Math.tan(vFOV / 2) * dist;
    
    const startY = - (visibleHeight / 2) - 1.0; 
    const globalRise = (scrollY / vh) * 35; 

    // Base animation
    groupRef.current.rotation.x += rotSpeed.x * delta;
    groupRef.current.rotation.y += rotSpeed.y * delta;
    groupRef.current.rotation.z += rotSpeed.z * delta;

    let targetY = startY + globalRise - yOffset;
    
    // Loop the cards if they go too high
    const totalHeight = 40; // Approximate height of the card column
    while (targetY > visibleHeight / 2 + 2) {
        targetY -= totalHeight;
    }
    
    // Sine wave float
    targetY += Math.sin(time * 0.8 + phase) * 0.2;
    const targetX = position[0] + Math.cos(time * 0.5 + phase) * 0.1;

    groupRef.current.position.y = targetY;
    groupRef.current.position.x = targetX;
  });

  const color = COLORS[suit];

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geometry}>
        {/* Material indices for ExtrudeGeometry: 0=front/back, 1=sides */}
        <meshStandardMaterial attach="material-0" color="#ffffff" metalness={0.1} roughness={0.5} />
        <meshStandardMaterial attach="material-1" color="#936DFF" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* FRONT FACE DECORATION */}
      <group position={[0, 0, 0.02]}>
        {/* Top Left */}
        <group position={[-0.35, 0.55, 0]}>
            <Text
                position={[0, 0, 0]}
                fontSize={0.15}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {rank}
            </Text>
            <Text
                position={[0, -0.15, 0]}
                fontSize={0.12}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {suit}
            </Text>
        </group>

        {/* Center Big Suit */}
        <Text
            position={[0, 0, 0]}
            fontSize={0.6}
            color={color}
            anchorX="center"
            anchorY="middle"
        >
            {suit}
        </Text>

        {/* Bottom Right (Rotated) */}
        <group position={[0.35, -0.55, 0]} rotation={[0, 0, Math.PI]}>
            <Text
                position={[0, 0, 0]}
                fontSize={0.15}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {rank}
            </Text>
            <Text
                position={[0, -0.15, 0]}
                fontSize={0.12}
                color={color}
                anchorX="center"
                anchorY="middle"
            >
                {suit}
            </Text>
        </group>
      </group>

      {/* BACK FACE DECORATION */}
      <group position={[0, 0, -0.02]} rotation={[0, Math.PI, 0]}>
         <mesh position={[0, 0, 0]}>
            <planeGeometry args={[1.0, 1.4]} />
            <meshStandardMaterial map={backTexture} />
         </mesh>
      </group>
    </group>
  );
};

// --- DECK MANAGER ---
const FloatingDeck = ({ count = 60 }) => {
  const backTexture = useTexture('/umbra_back.jpg');
  
  const cards = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
        const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
        const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
        
        data.push({
            id: i,
            suit,
            rank,
            position: [(Math.random() - 0.5) * 18, 0, 0],
            yOffset: (i * 0.6) + (Math.random() * 2),
            rotSpeed: {
                x: (Math.random() - 0.5) * 1.0,
                y: (Math.random() - 0.5) * 1.0,
                z: (Math.random() - 0.5) * 0.5
            },
            phase: Math.random() * Math.PI * 2,
            rotation: [
                Math.random() * Math.PI, 
                Math.random() * Math.PI, 
                Math.random() * Math.PI
            ],
            scale: 0.8
        });
    }
    return data;
  }, [count]);

  return (
    <>
      {cards.map((card) => (
        <PokerCard3D key={card.id} {...card} backTexture={backTexture} />
      ))}
    </>
  );
};

// --- MAIN COMPONENT ---
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
        
        <directionalLight position={[10, 5, 5]} intensity={2.0} color="#ffffff" />
        <directionalLight position={[-10, 5, 2]} intensity={1.5} color="#C049FF" />
        <directionalLight position={[0, -10, 5]} intensity={1.0} color="#936DFF" />
        
        <Suspense fallback={null}>
            <FloatingDeck count={50} />
        </Suspense>
      </Canvas>
    </div>
  );
};

