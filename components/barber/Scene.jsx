import React, { useMemo, Suspense } from 'react';
import { Canvas, useLoader, useThree } from '@react-three/fiber';
import { Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';
import { ClothCard } from './ClothCard';
import { createColorfulCardTexture } from '../../lib/barber/textureGenerator';

// Error boundary for 3D scene failures
class SceneErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() { 
    return { hasError: true }; 
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <mesh><boxGeometry /><meshBasicMaterial color="red" wireframe /></mesh>;
    }
    return this.props.children;
  }
}

// Main 3D scene content with floating cloth card
const SceneContent = () => {
  const { viewport } = useThree();

  // Load the generated Umbra card texture
  const darkCardBg = useLoader(THREE.TextureLoader, '/umbra-card.png', (loader) => {
    loader.setCrossOrigin('anonymous');
  });

  const texture = useMemo(() => {
    if (!darkCardBg.image) return null;
    return createColorfulCardTexture(darkCardBg.image);
  }, [darkCardBg]);

  // RESPONSIVE SIZING
  const CARD_ASPECT = 1.6; 
  const targetWidthFromWidth = viewport.width * 0.85;
  const targetWidthFromHeight = (viewport.height * 0.85) / CARD_ASPECT;
  const FINAL_WIDTH = Math.min(targetWidthFromWidth, targetWidthFromHeight);
  const FINAL_HEIGHT = FINAL_WIDTH * CARD_ASPECT;

  if (!texture) return null;

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 7]} intensity={2.0} />
      {/* Colorful lights to enhance the cloth wrinkles */}
      <pointLight position={[-5, 2, 5]} intensity={1.5} color="#936DFF" />
      <pointLight position={[5, -2, 5]} intensity={1.0} color="#00FFFF" />
      
      <group position={[0, 0, 0]}>
         <Float 
            speed={1.5} 
            rotationIntensity={0.1} 
            floatIntensity={0.2} 
            floatingRange={[-0.1, 0.1]}
         >
            <ClothCard 
                texture={texture} 
                position={[0, 0, 0]} 
                scale={[FINAL_WIDTH, FINAL_HEIGHT, 1]} 
            />
         </Float>
      </group>
      
      <Environment preset="night" />
    </>
  );
};

// Main Scene component wrapper
export const Scene = () => {
  return (
    <div className="w-full h-full relative">
      <Canvas camera={{ position: [0, 0, 14], fov: 35 }} dpr={[1, 2]}>
        <SceneErrorBoundary fallback={<Text color="#FF6600">Loading...</Text>}>
          <Suspense fallback={null}>
              <SceneContent />
          </Suspense>
        </SceneErrorBoundary>
      </Canvas>
    </div>
  );
};

