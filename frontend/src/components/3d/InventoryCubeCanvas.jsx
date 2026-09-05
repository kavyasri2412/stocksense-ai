import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function InventoryCubeCanvas({ height = '400px', interactive = true }) {
  const mountRef = useRef(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    let scene, camera, renderer, animationFrameId;
    let mainGroup, cubes = [], particleSystem;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    try {
      const width = currentMount.clientWidth || 400;
      const heightVal = currentMount.clientHeight || 400;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(45, width / heightVal, 0.1, 1000);
      camera.position.z = 8.5;

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'default' });
      renderer.setSize(width, heightVal);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      currentMount.appendChild(renderer.domElement);

      mainGroup = new THREE.Group();
      scene.add(mainGroup);

      // Lighting
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      const directionalLight1 = new THREE.DirectionalLight(0x10b981, 2.0);
      directionalLight1.position.set(5, 5, 5);
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0x71717a, 1.5);
      directionalLight2.position.set(-5, -5, -3);
      scene.add(directionalLight2);

      // 3x3 Modular Inventory Grid Blocks
      const boxGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
      const edgeGeo = new THREE.EdgesGeometry(boxGeo);

      const materials = [
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3, metalness: 0.8 }),
        new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.2, metalness: 0.9 }),
        new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.85 })
      ];
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x3f3f46 });
      const emeraldLineMat = new THREE.LineBasicMaterial({ color: 0x10b981 });

      const positions = [
        [-1, 1, 0], [0, 1, 0], [1, 1, 0],
        [-1, 0, 0], [0, 0, 0], [1, 0, 0],
        [-1, -1, 0], [0, -1, 0], [1, -1, 0],
        [-0.5, 0.5, 1], [0.5, 0.5, 1], [-0.5, -0.5, 1], [0.5, -0.5, 1]
      ];

      positions.forEach((pos, idx) => {
        const isAccent = idx % 4 === 0;
        const mat = isAccent ? materials[2] : materials[idx % 2];
        const mesh = new THREE.Mesh(boxGeo, mat);
        mesh.position.set(pos[0] * 1.1, pos[1] * 1.1, pos[2] * 1.1);

        const wireframe = new THREE.LineSegments(edgeGeo, isAccent ? emeraldLineMat : lineMaterial);
        mesh.add(wireframe);

        mesh.userData = {
          initialY: mesh.position.y,
          speed: 0.005 + (idx * 0.002),
          offset: idx * 0.5
        };

        cubes.push(mesh);
        mainGroup.add(mesh);
      });

      // Background Ambient Particle Lattice
      const particleCount = 60;
      const particleGeo = new THREE.BufferGeometry();
      const particlePositions = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount * 3; i += 3) {
        particlePositions[i] = (Math.random() - 0.5) * 12;
        particlePositions[i + 1] = (Math.random() - 0.5) * 12;
        particlePositions[i + 2] = (Math.random() - 0.5) * 8;
      }

      particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
      const particleMat = new THREE.PointsMaterial({
        color: 0x52525b,
        size: 0.05,
        transparent: true,
        opacity: 0.6
      });
      particleSystem = new THREE.Points(particleGeo, particleMat);
      scene.add(particleSystem);

      // Mouse tracking
      const handleMouseMove = (e) => {
        if (!interactive) return;
        const rect = currentMount.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseY = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      };

      if (interactive) {
        window.addEventListener('mousemove', handleMouseMove);
      }

      // Resize observer
      const resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          const newWidth = entry.contentRect.width;
          const newHeight = entry.contentRect.height;
          if (newWidth > 0 && newHeight > 0) {
            camera.aspect = newWidth / newHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(newWidth, newHeight);
          }
        }
      });
      resizeObserver.observe(currentMount);

      // Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Smooth mouse lag
        targetX += (mouseX - targetX) * 0.05;
        targetY += (mouseY - targetY) * 0.05;

        mainGroup.rotation.y = elapsedTime * 0.15 + (targetX * 0.5);
        mainGroup.rotation.x = Math.sin(elapsedTime * 0.2) * 0.1 + (targetY * 0.3);

        // Gentle floating individual blocks
        cubes.forEach((cube) => {
          cube.position.y = cube.userData.initialY + Math.sin(elapsedTime * 1.5 + cube.userData.offset) * 0.08;
        });

        particleSystem.rotation.y = elapsedTime * 0.03;

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        if (interactive) window.removeEventListener('mousemove', handleMouseMove);
        resizeObserver.disconnect();
        cancelAnimationFrame(animationFrameId);
        if (renderer && renderer.domElement && currentMount.contains(renderer.domElement)) {
          currentMount.removeChild(renderer.domElement);
          renderer.dispose();
        }
      };
    } catch (err) {
      console.warn("Three.js WebGL initialization skipped or failed:", err);
      setHasWebGL(false);
    }
  }, [interactive]);

  if (!hasWebGL) {
    return (
      <div className="flex items-center justify-center bg-neutral-900/60 rounded-2xl border border-neutral-800" style={{ height }}>
        <div className="text-center p-6">
          <div className="w-16 h-16 mx-auto rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-emerald-400 font-mono text-xl font-bold">
            3D
          </div>
          <p className="text-xs text-neutral-400 mt-2">StockSense 3D Inventory Visualizer</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={mountRef} 
      className="w-full relative overflow-hidden rounded-2xl flex items-center justify-center"
      style={{ height }}
    />
  );
}
