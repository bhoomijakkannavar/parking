import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParkingSlot } from '../../types';
import { VEHICLE_TYPE_LABELS } from '../../constants';
import { ReceiptService } from '../../services/ReceiptService';
import {
  RotateCcw,
  Eye,
  Bike,
  Car,
  Compass,
  Layers,
  Sparkles,
  Play,
  Pause,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface IsometricParking3DProps {
  slots: ParkingSlot[];
  selectedSlot?: ParkingSlot | null;
  onSelectSlot: (slot: ParkingSlot) => void;
  statusFilter?: 'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'SECURITY_LOCKED';
  zoneFilter?: 'ALL' | 'TWO_WHEELER' | 'FOUR_WHEELER';
}

// Safe Canvas rounded rectangle drawer with fallback
function drawCanvasRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
  }
}

export const IsometricParking3D: React.FC<IsometricParking3DProps> = ({
  slots,
  selectedSlot,
  onSelectSlot,
  statusFilter = 'ALL',
  zoneFilter = 'ALL',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const slotsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Interactive registry of slot floors for fast raycasting & color tinting
  const slotFloorsRef = useRef<Map<string, { mesh: THREE.Mesh; slot: ParkingSlot; baseColor: number }>>(
    new Map()
  );
  const hoveredSlotIdRef = useRef<string | null>(null);

  const [hoveredSlot, setHoveredSlot] = useState<ParkingSlot | null>(null);
  const [internalSelectedSlot, setInternalSelectedSlot] = useState<ParkingSlot | null>(
    selectedSlot || null
  );
  const [cameraView, setCameraView] = useState<'ISOMETRIC' | 'TOP_DOWN' | 'FRONT'>('ISOMETRIC');
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(false);
  const [webGlError, setWebGlError] = useState<string | null>(null);

  // Sync selectedSlot prop
  useEffect(() => {
    if (selectedSlot !== undefined) {
      setInternalSelectedSlot(selectedSlot);
    }
  }, [selectedSlot]);

  // Create canvas texture for slot labels
  const createTextTexture = (text: string, subText?: string, isOccupied = false): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Badge background
      ctx.fillStyle = isOccupied ? 'rgba(24, 92, 54, 0.95)' : 'rgba(255, 255, 255, 0.96)';
      ctx.beginPath();
      drawCanvasRoundRect(ctx, 10, 10, 236, 108, 16);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = isOccupied ? '#3F8F5B' : '#A8DDB8';
      ctx.lineWidth = 4;
      ctx.stroke();

      // Main Slot ID
      ctx.fillStyle = isOccupied ? '#FFFFFF' : '#183025';
      ctx.font = 'bold 44px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, subText ? 50 : 64);

      // Secondary status text
      if (subText) {
        ctx.fillStyle = isOccupied ? '#A8DDB8' : '#3F8F5B';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(subText, 128, 92);
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    return texture;
  };

  // Build 3D Car Model
  const createCarMesh = (plateNumber?: string): THREE.Group => {
    const carGroup = new THREE.Group();

    // Chassis / Lower Body
    const bodyGeo = new THREE.BoxGeometry(4.2, 1.2, 2.2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1f7a4a,
      roughness: 0.3,
      metalness: 0.5,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    bodyMesh.position.y = 0.9;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carGroup.add(bodyMesh);

    // Cabin / Roof
    const roofGeo = new THREE.BoxGeometry(2.4, 0.9, 1.9);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x183025,
      roughness: 0.2,
      metalness: 0.4,
    });
    const roofMesh = new THREE.Mesh(roofGeo, roofMat);
    roofMesh.position.set(-0.2, 1.8, 0);
    roofMesh.castShadow = true;
    carGroup.add(roofMesh);

    // Windshield & Windows
    const glassGeo = new THREE.BoxGeometry(2.45, 0.75, 1.92);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(-0.2, 1.75, 0);
    carGroup.add(glassMesh);

    // 4 Wheels with Rims
    const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18231d, roughness: 0.8 });
    const hubMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.8 });

    const wheelPositions = [
      { x: -1.3, z: 1.15 },
      { x: 1.3, z: 1.15 },
      { x: -1.3, z: -1.15 },
      { x: 1.3, z: -1.15 },
    ];

    wheelPositions.forEach((pos) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(pos.x, 0.5, pos.z);
      wheel.castShadow = true;

      const hubGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.42, 8);
      hubGeo.rotateX(Math.PI / 2);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      wheel.add(hub);

      carGroup.add(wheel);
    });

    // Front Headlights
    const headlightGeo = new THREE.BoxGeometry(0.1, 0.25, 0.4);
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
    });
    const headlightL = new THREE.Mesh(headlightGeo, headlightMat);
    headlightL.position.set(2.11, 0.9, 0.75);
    carGroup.add(headlightL);

    const headlightR = new THREE.Mesh(headlightGeo, headlightMat);
    headlightR.position.set(2.11, 0.9, -0.75);
    carGroup.add(headlightR);

    // Rear Taillights
    const taillightMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xb91c1c,
      emissiveIntensity: 0.8,
    });
    const taillightL = new THREE.Mesh(headlightGeo, taillightMat);
    taillightL.position.set(-2.11, 0.9, 0.75);
    carGroup.add(taillightL);

    const taillightR = new THREE.Mesh(headlightGeo, taillightMat);
    taillightR.position.set(-2.11, 0.9, -0.75);
    carGroup.add(taillightR);

    // License Plate Strip
    if (plateNumber) {
      const plateGeo = new THREE.BoxGeometry(0.08, 0.3, 0.9);
      const plateMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const plateMesh = new THREE.Mesh(plateGeo, plateMat);
      plateMesh.position.set(2.12, 0.65, 0);
      carGroup.add(plateMesh);
    }

    return carGroup;
  };

  // Build 3D Motorcycle Model
  const createMotorcycleMesh = (): THREE.Group => {
    const bikeGroup = new THREE.Group();

    // Bike Frame
    const frameGeo = new THREE.BoxGeometry(1.6, 0.6, 0.5);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1f7a4a,
      metalness: 0.6,
      roughness: 0.3,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.y = 0.8;
    frameMesh.castShadow = true;
    bikeGroup.add(frameMesh);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.8, 0.25, 0.45);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.9 });
    const seatMesh = new THREE.Mesh(seatGeo, seatMat);
    seatMesh.position.set(-0.2, 1.15, 0);
    bikeGroup.add(seatMesh);

    // Tank
    const tankGeo = new THREE.BoxGeometry(0.6, 0.4, 0.48);
    const tankMat = new THREE.MeshStandardMaterial({
      color: 0x185c36,
      metalness: 0.8,
      roughness: 0.2,
    });
    const tankMesh = new THREE.Mesh(tankGeo, tankMat);
    tankMesh.position.set(0.4, 1.15, 0);
    bikeGroup.add(tankMesh);

    // Handlebars
    const barGeo = new THREE.BoxGeometry(0.15, 0.1, 1.2);
    const barMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb, metalness: 0.9 });
    const barMesh = new THREE.Mesh(barGeo, barMat);
    barMesh.position.set(0.65, 1.45, 0);
    bikeGroup.add(barMesh);

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.25, 16);
    wheelGeo.rotateX(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18231d, roughness: 0.8 });

    const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
    frontWheel.position.set(0.85, 0.42, 0);
    frontWheel.castShadow = true;
    bikeGroup.add(frontWheel);

    const rearWheel = new THREE.Mesh(wheelGeo, wheelMat);
    rearWheel.position.set(-0.85, 0.42, 0);
    rearWheel.castShadow = true;
    bikeGroup.add(rearWheel);

    // Headlight
    const lightGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfffbeb,
      emissive: 0xfef08a,
      emissiveIntensity: 0.9,
    });
    const lightMesh = new THREE.Mesh(lightGeo, lightMat);
    lightMesh.position.set(0.9, 1.2, 0);
    bikeGroup.add(lightMesh);

    return bikeGroup;
  };

  // Build Low-Poly Campus Tree
  const createCampusTree = (x: number, z: number): THREE.Group => {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 2.2, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78533b, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.1;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const folGeo = new THREE.ConeGeometry(1.8, 3.5, 7);
    const folMat = new THREE.MeshStandardMaterial({
      color: 0x2e8555,
      roughness: 0.6,
      flatShading: true,
    });
    const fol = new THREE.Mesh(folGeo, folMat);
    fol.position.y = 3.6;
    fol.castShadow = true;
    treeGroup.add(fol);

    return treeGroup;
  };

  // Build Campus Lamppost
  const createLampPost = (x: number, z: number): THREE.Group => {
    const postGroup = new THREE.Group();
    postGroup.position.set(x, 0, z);

    const postGeo = new THREE.CylinderGeometry(0.12, 0.16, 5.5, 8);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x374151, metalness: 0.8 });
    const post = new THREE.Mesh(postGeo, postMat);
    post.position.y = 2.75;
    post.castShadow = true;
    postGroup.add(post);

    const lampGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: 0xfef08a,
      emissiveIntensity: 1.2,
    });
    const lamp = new THREE.Mesh(lampGeo, lampMat);
    lamp.position.y = 5.5;
    postGroup.add(lamp);

    return postGroup;
  };

  // Rebuild the 15 parking slot meshes inside slotsGroupRef
  const rebuildSlotsMesh = useCallback(() => {
    const slotsGroup = slotsGroupRef.current;
    if (!slotsGroup) return;

    // Dispose and clear existing children
    while (slotsGroup.children.length > 0) {
      const child = slotsGroup.children[0];
      slotsGroup.remove(child);
      child.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    slotFloorsRef.current.clear();

    // 1. Build TWO-WHEELER BAYS (Top Row: Z = -9.5, X spread)
    const twoWheelers = slots.filter((s) => s.type === 'TWO_WHEELER');
    const tSpacing = 4.8;
    const tStartX = -((twoWheelers.length - 1) * tSpacing) / 2;

    twoWheelers.forEach((slot, idx) => {
      const isFilteredOut =
        (zoneFilter !== 'ALL' && zoneFilter !== 'TWO_WHEELER') ||
        (statusFilter !== 'ALL' && slot.status !== statusFilter);

      const slotGroup = new THREE.Group();
      const x = tStartX + idx * tSpacing;
      const z = -9.5;
      slotGroup.position.set(x, 0.4, z);
      slotGroup.userData = { slotId: slot.id, slot };

      const isOccupied = slot.status === 'OCCUPIED';
      const isReserved = slot.status === 'RESERVED';
      const isLocked = slot.status === 'SECURITY_LOCKED';
      const isSelected = internalSelectedSlot?.id === slot.id;

      // Base color logic
      const baseColor = isSelected
        ? 0x6ee7b7
        : isLocked
        ? 0x7f1d1d
        : isReserved
        ? 0x78350f
        : isOccupied
        ? 0x1f3b2b
        : 0x3b4740;

      // Bay Floor Plate (width 3.6, length 6.4)
      const floorGeo = new THREE.BoxGeometry(3.6, 0.1, 6.4);
      const floorMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.6,
        opacity: isFilteredOut ? 0.35 : 1,
        transparent: isFilteredOut,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.receiveShadow = true;
      floorMesh.userData = { slotId: slot.id, slot, isFloor: true };
      slotGroup.add(floorMesh);

      // Register floor mesh for raycast & hover
      slotFloorsRef.current.set(slot.id, { mesh: floorMesh, slot, baseColor });

      // Bay Outline Wireframe
      const outlineGeo = new THREE.BoxGeometry(3.8, 0.12, 6.6);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: isSelected
          ? 0x10b981
          : isLocked
          ? 0xef4444
          : isReserved
          ? 0xf59e0b
          : isOccupied
          ? 0x22c55e
          : 0xffffff,
        wireframe: true,
      });
      const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
      slotGroup.add(outlineMesh);

      // 3D Motorcycle if occupied
      if (isOccupied) {
        const bikeMesh = createMotorcycleMesh();
        bikeMesh.position.set(0, 0, 0);
        bikeMesh.rotation.y = Math.PI / 2;
        if (isFilteredOut) {
          bikeMesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.4;
            }
          });
        }
        slotGroup.add(bikeMesh);
      }

      // Selection Beacon Pin if selected
      if (isSelected) {
        const pinGeo = new THREE.ConeGeometry(0.6, 1.4, 8);
        pinGeo.rotateX(Math.PI);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x34d399,
          emissiveIntensity: 0.8,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(0, 3.8, 0);
        slotGroup.add(pin);
      }

      // Bay ID Label Texture Plate
      const labelTexture = createTextTexture(slot.id, isOccupied ? 'PARKED' : '2W FREE', isOccupied);
      const labelGeo = new THREE.PlaneGeometry(2.4, 1.2);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 2.6, 3.4);
      labelMesh.rotation.x = -Math.PI / 4;
      slotGroup.add(labelMesh);

      slotsGroup.add(slotGroup);
    });

    // 2. Build FOUR-WHEELER BAYS (Bottom Row: Z = 10.5, X spread)
    const fourWheelers = slots.filter((s) => s.type === 'FOUR_WHEELER');
    const fSpacing = 10.2;
    const fStartX = -((fourWheelers.length - 1) * fSpacing) / 2;

    fourWheelers.forEach((slot, idx) => {
      const isFilteredOut =
        (zoneFilter !== 'ALL' && zoneFilter !== 'FOUR_WHEELER') ||
        (statusFilter !== 'ALL' && slot.status !== statusFilter);

      const slotGroup = new THREE.Group();
      const x = fStartX + idx * fSpacing;
      const z = 10.5;
      slotGroup.position.set(x, 0.4, z);
      slotGroup.userData = { slotId: slot.id, slot };

      const isOccupied = slot.status === 'OCCUPIED';
      const isReserved = slot.status === 'RESERVED';
      const isLocked = slot.status === 'SECURITY_LOCKED';
      const isSelected = internalSelectedSlot?.id === slot.id;
      const baseColor = isSelected
        ? 0x6ee7b7
        : isLocked
        ? 0x7f1d1d
        : isReserved
        ? 0x78350f
        : isOccupied
        ? 0x1f3b2b
        : 0x3b4740;

      // Bay Floor Plate (width 8.4, length 10.8)
      const floorGeo = new THREE.BoxGeometry(8.4, 0.1, 10.8);
      const floorMat = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.6,
        opacity: isFilteredOut ? 0.35 : 1,
        transparent: isFilteredOut,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.receiveShadow = true;
      floorMesh.userData = { slotId: slot.id, slot, isFloor: true };
      slotGroup.add(floorMesh);

      // Register floor mesh
      slotFloorsRef.current.set(slot.id, { mesh: floorMesh, slot, baseColor });

      // Bay Outline Wireframe
      const outlineGeo = new THREE.BoxGeometry(8.6, 0.12, 11.0);
      const outlineMat = new THREE.MeshBasicMaterial({
        color: isSelected
          ? 0x10b981
          : isLocked
          ? 0xef4444
          : isReserved
          ? 0xf59e0b
          : isOccupied
          ? 0x22c55e
          : 0xffffff,
        wireframe: true,
      });
      const outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
      slotGroup.add(outlineMesh);

      // Wheel Stopper Curb at rear
      const stopGeo = new THREE.BoxGeometry(6.4, 0.35, 0.5);
      const stopMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
      const stopper = new THREE.Mesh(stopGeo, stopMat);
      stopper.position.set(0, 0.2, 4.6);
      stopper.castShadow = true;
      slotGroup.add(stopper);

      // 3D Car if occupied
      if (isOccupied) {
        const carMesh = createCarMesh(slot.vehicleNumber);
        carMesh.position.set(0, 0, 0);
        carMesh.rotation.y = Math.PI / 2;
        if (isFilteredOut) {
          carMesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material) {
              child.material.transparent = true;
              child.material.opacity = 0.4;
            }
          });
        }
        slotGroup.add(carMesh);
      }

      // Selection Beacon Pin if selected
      if (isSelected) {
        const pinGeo = new THREE.ConeGeometry(0.8, 1.8, 8);
        pinGeo.rotateX(Math.PI);
        const pinMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x34d399,
          emissiveIntensity: 0.8,
        });
        const pin = new THREE.Mesh(pinGeo, pinMat);
        pin.position.set(0, 4.2, 0);
        slotGroup.add(pin);
      }

      // Bay ID Label Texture Plate
      const labelTexture = createTextTexture(
        slot.id,
        isOccupied ? slot.vehicleNumber || 'PARKED' : '4W FREE',
        isOccupied
      );
      const labelGeo = new THREE.PlaneGeometry(3.6, 1.8);
      const labelMat = new THREE.MeshBasicMaterial({
        map: labelTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const labelMesh = new THREE.Mesh(labelGeo, labelMat);
      labelMesh.position.set(0, 3.2, -5.6);
      labelMesh.rotation.x = Math.PI / 4;
      slotGroup.add(labelMesh);

      slotsGroup.add(slotGroup);
    });
  }, [slots, statusFilter, zoneFilter, internalSelectedSlot]);

  // Main Scene Setup and Render Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 0. Verify WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
      if (!gl) {
        setWebGlError('WebGL hardware acceleration is not supported on this device/display adapter.');
        return;
      }
    } catch {
      setWebGlError('Unable to initialize WebGL graphics context.');
      return;
    }

    const width = container.clientWidth || 840;
    const height = container.clientHeight || 520;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf7fbf8);
    scene.fog = new THREE.FogExp2(0xf7fbf8, 0.012);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 1000);
    camera.position.set(38, 34, 38);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    // 3. Renderer with soft shadow maps
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.minDistance = 15;
    controls.maxDistance = 90;
    controls.target.set(0, 1.2, 0);
    controls.autoRotate = isAutoRotating;
    controls.autoRotateSpeed = 1.0;
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xdcfce7, 0xf1f5f9, 0.65);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(30, 45, 25);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    // 6. Campus Architectural Terrain
    // Outer Grass Island
    const grassGeo = new THREE.BoxGeometry(64, 1.2, 46);
    const grassMat = new THREE.MeshStandardMaterial({ color: 0xe8f5ec, roughness: 0.9 });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.6;
    grass.receiveShadow = true;
    scene.add(grass);

    // Curb Border
    const curbGeo = new THREE.BoxGeometry(56.8, 0.4, 38.8);
    const curbMat = new THREE.MeshStandardMaterial({ color: 0xd1fae5, roughness: 0.7 });
    const curb = new THREE.Mesh(curbGeo, curbMat);
    curb.position.y = 0.15;
    curb.receiveShadow = true;
    scene.add(curb);

    // Asphalt Parking Lot
    const asphaltGeo = new THREE.BoxGeometry(55, 0.35, 37);
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x2d3732,
      roughness: 0.85,
      metalness: 0.1,
    });
    const asphalt = new THREE.Mesh(asphaltGeo, asphaltMat);
    asphalt.position.y = 0.2;
    asphalt.receiveShadow = true;
    scene.add(asphalt);

    // Central Driving Lane Divider
    const laneLineGeo = new THREE.BoxGeometry(48, 0.05, 0.3);
    const laneLineMat = new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.5 });
    const laneLine = new THREE.Mesh(laneLineGeo, laneLineMat);
    laneLine.position.set(0, 0.4, 1);
    scene.add(laneLine);

    // Perimeter Trees
    const treeCoords = [
      [-28, -19],
      [28, -19],
      [-28, 19],
      [28, 19],
      [-28, 0],
      [28, 0],
    ];
    treeCoords.forEach(([tx, tz]) => {
      scene.add(createCampusTree(tx, tz));
    });

    // Street Lampposts
    const lampCoords = [
      [-24, -16],
      [24, -16],
      [-24, 16],
      [24, 16],
    ];
    lampCoords.forEach(([lx, lz]) => {
      scene.add(createLampPost(lx, lz));
    });

    // Campus Gate Barriers
    const createGateBarrier = (x: number, z: number) => {
      const gateGroup = new THREE.Group();
      gateGroup.position.set(x, 0.4, z);

      const postGeo = new THREE.BoxGeometry(0.8, 1.8, 0.8);
      const postMat = new THREE.MeshStandardMaterial({ color: 0x185c36, metalness: 0.7 });
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.y = 0.9;
      gateGroup.add(post);

      const armGeo = new THREE.BoxGeometry(4.5, 0.18, 0.18);
      const armMat = new THREE.MeshStandardMaterial({ color: 0xfef08a });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(2.2, 1.4, 0);
      gateGroup.add(arm);

      return gateGroup;
    };
    scene.add(createGateBarrier(-24, 1));
    scene.add(createGateBarrier(24, 1));

    // 7. Add Slots Root Group to Scene
    scene.add(slotsGroupRef.current);

    // Immediately populate slots
    rebuildSlotsMesh();

    // 8. Responsive Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newWidth, height: newHeight } = entry.contentRect;
        if (newWidth > 0 && newHeight > 0 && rendererRef.current && cameraRef.current) {
          cameraRef.current.aspect = newWidth / newHeight;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(newWidth, newHeight);
        }
      }
    });
    resizeObserver.observe(container);

    // 9. Animation Render Loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      // Clean scene
      scene.clear();
    };
  }, []); // Mount effect

  // Synchronize slot rebuilds when slots, filters, or selection change
  useEffect(() => {
    rebuildSlotsMesh();
  }, [rebuildSlotsMesh]);

  // Sync auto-rotation state with controls
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = isAutoRotating;
    }
  }, [isAutoRotating]);

  // Fast Raycast Pointer Move without triggering full geometry rebuilds
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);

      const slotGroups = slotsGroupRef.current.children;
      const intersects = raycasterRef.current.intersectObjects(slotGroups, true);

      if (intersects.length > 0) {
        let current: THREE.Object3D | null = intersects[0].object;
        while (current && current.parent && !current.userData?.slotId) {
          current = current.parent;
        }

        if (current && current.userData?.slot) {
          const slot = current.userData.slot as ParkingSlot;
          const slotId = slot.id;

          if (hoveredSlotIdRef.current !== slotId) {
            // Restore previous floor mesh
            if (hoveredSlotIdRef.current) {
              const prev = slotFloorsRef.current.get(hoveredSlotIdRef.current);
              if (prev && prev.mesh.material instanceof THREE.MeshStandardMaterial) {
                prev.mesh.material.color.setHex(prev.baseColor);
              }
            }

            // Tint current floor mesh
            const curr = slotFloorsRef.current.get(slotId);
            if (curr && curr.mesh.material instanceof THREE.MeshStandardMaterial) {
              curr.mesh.material.color.setHex(0xa7f3d0);
            }

            hoveredSlotIdRef.current = slotId;
            setHoveredSlot(slot);
            container.style.cursor = 'pointer';
          }
          return;
        }
      }

      // No intersection: restore previous floor mesh
      if (hoveredSlotIdRef.current) {
        const prev = slotFloorsRef.current.get(hoveredSlotIdRef.current);
        if (prev && prev.mesh.material instanceof THREE.MeshStandardMaterial) {
          prev.mesh.material.color.setHex(prev.baseColor);
        }
        hoveredSlotIdRef.current = null;
        setHoveredSlot(null);
        container.style.cursor = 'default';
      }
    },
    []
  );

  const handleClick = useCallback(() => {
    if (hoveredSlot) {
      setInternalSelectedSlot(hoveredSlot);
      onSelectSlot(hoveredSlot);
    }
  }, [hoveredSlot, onSelectSlot]);

  // Camera Presets
  const setCameraPreset = (preset: 'ISOMETRIC' | 'TOP_DOWN' | 'FRONT') => {
    setCameraView(preset);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (preset === 'ISOMETRIC') {
      camera.position.set(38, 34, 38);
      controls.target.set(0, 1.2, 0);
    } else if (preset === 'TOP_DOWN') {
      camera.position.set(0, 52, 0.1);
      controls.target.set(0, 0, 0);
    } else if (preset === 'FRONT') {
      camera.position.set(0, 16, 44);
      controls.target.set(0, 2, 0);
    }
    controls.update();
  };

  const handleZoom = (direction: 'IN' | 'OUT') => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;
    const factor = direction === 'IN' ? 0.8 : 1.25;
    camera.position.lerp(controls.target, 1 - factor);
    controls.update();
  };

  return (
    <div className="card-classic p-6 space-y-4">
      {/* Top Header & 3D Camera Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D5EBDD]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#EAF8EE] border border-[#D5EBDD] flex items-center justify-center text-[#185C36]">
            <Compass className="w-4 h-4 text-[#3F8F5B]" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#185C36] uppercase tracking-wider flex items-center gap-1.5">
              <span>Interactive 3D Architectural Parking Model</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EAF8EE] text-[#185C36] font-mono border border-[#D5EBDD]">
                WebGL / Three.js
              </span>
            </h3>
            <p className="text-[11px] text-[#5E7165]">
              Real-time 3D models of all 15 bays with vehicle silhouettes, lighting, and raycast inspection.
            </p>
          </div>
        </div>

        {/* View Angle Presets & Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#F7F9F8] p-1 rounded-xl border border-[#D5EBDD] text-xs font-semibold">
          <button
            onClick={() => setCameraPreset('ISOMETRIC')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraView === 'ISOMETRIC'
                ? 'bg-white text-[#185C36] shadow-xs font-bold'
                : 'text-[#66736B] hover:text-[#18231D]'
            }`}
          >
            Isometric
          </button>
          <button
            onClick={() => setCameraPreset('TOP_DOWN')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraView === 'TOP_DOWN'
                ? 'bg-white text-[#185C36] shadow-xs font-bold'
                : 'text-[#66736B] hover:text-[#18231D]'
            }`}
          >
            Top-Down
          </button>
          <button
            onClick={() => setCameraPreset('FRONT')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              cameraView === 'FRONT'
                ? 'bg-white text-[#185C36] shadow-xs font-bold'
                : 'text-[#66736B] hover:text-[#18231D]'
            }`}
          >
            Front Angle
          </button>

          {/* Zoom In & Out */}
          <div className="h-4 w-px bg-[#D5EBDD] mx-0.5" />
          <button
            onClick={() => handleZoom('IN')}
            className="p-1.5 rounded-lg hover:bg-white text-[#66736B] hover:text-[#18231D] cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleZoom('OUT')}
            className="p-1.5 rounded-lg hover:bg-white text-[#66736B] hover:text-[#18231D] cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Auto-Rotate Toggle */}
          <button
            onClick={() => setIsAutoRotating(!isAutoRotating)}
            className={`p-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
              isAutoRotating ? 'bg-[#3F8F5B] text-white shadow-xs' : 'hover:bg-white text-[#66736B]'
            }`}
            title={isAutoRotating ? 'Pause Orbit Animation' : 'Start Slow Orbit Animation'}
          >
            {isAutoRotating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Camera View */}
          <button
            onClick={() => setCameraPreset('ISOMETRIC')}
            className="p-1.5 rounded-lg hover:bg-white text-[#66736B] hover:text-[#18231D] cursor-pointer"
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative rounded-2xl overflow-hidden border border-[#D5EBDD] bg-[#F7FBF8] shadow-inner select-none">
        {webGlError ? (
          <div className="p-12 text-center text-xs text-[#B45353] space-y-2">
            <p className="font-bold text-sm">3D Graphics Initialization Error</p>
            <p>{webGlError}</p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="w-full h-[520px] cursor-grab active:cursor-grabbing"
            onPointerMove={handlePointerMove}
            onClick={handleClick}
          />
        )}

        {/* Orbit Interaction Hint Banner (Top-Left overlay) */}
        <div className="absolute top-3 left-3 pointer-events-none px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-xs border border-[#D5EBDD] text-[11px] text-[#5E7165] font-medium shadow-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3F8F5B] animate-camera-pulse"></span>
          <span>Left-click + drag to orbit • Scroll to zoom • Click bay to inspect</span>
        </div>

        {/* Legend Overlay (Top-Right overlay) */}
        <div className="absolute top-3 right-3 pointer-events-none px-3 py-1.5 rounded-xl bg-white/90 backdrop-blur-xs border border-[#D5EBDD] text-[10px] text-[#183025] font-medium shadow-xs flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#1F7A4A] border border-[#185C36]"></span>
            <span>Occupied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#3B4740] border border-white"></span>
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#6EE7B7] border border-[#10B981]"></span>
            <span>Selected</span>
          </div>
        </div>

        {/* Active Hover / Raycast Tooltip Pill (Bottom-Left overlay) */}
        {hoveredSlot && (
          <div className="absolute bottom-3 left-3 pointer-events-none px-3.5 py-2 rounded-xl bg-white/95 backdrop-blur-xs border border-[#3F8F5B] text-xs shadow-md animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm text-[#185C36]">{hoveredSlot.id}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hoveredSlot.status === 'OCCUPIED'
                    ? 'bg-[#E8F2EB] text-[#285C3F] border border-[#3F7D58]'
                    : 'bg-[#F1F3F2] text-[#66736B]'
                }`}
              >
                {hoveredSlot.status}
              </span>
              <span className="text-[11px] text-[#66736B]">
                {VEHICLE_TYPE_LABELS[hoveredSlot.type]}
              </span>
              {hoveredSlot.vehicleNumber && (
                <span className="font-mono font-bold text-xs text-[#18231D]">
                  • {hoveredSlot.vehicleNumber}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Selected Bay Floating Inspection Card */}
      {internalSelectedSlot && (
        <div className="p-4 rounded-2xl bg-[#D9FBE5] border border-[#A8DDB8] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs animate-in fade-in duration-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#A8DDB8] flex items-center justify-center font-mono font-black text-base text-[#185C36] shadow-xs">
              {internalSelectedSlot.id}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#183025] text-sm">
                  Bay {internalSelectedSlot.id} ({VEHICLE_TYPE_LABELS[internalSelectedSlot.type]})
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    internalSelectedSlot.status === 'OCCUPIED'
                      ? 'bg-[#C8F1D5] text-[#185C36]'
                      : 'bg-white text-[#185C36] border border-[#A8DDB8]'
                  }`}
                >
                  {internalSelectedSlot.status}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-[#5E7165] mt-0.5">
                {internalSelectedSlot.vehicleNumber ? (
                  <span>
                    Occupant Plate:{' '}
                    <strong className="font-mono text-[#183025]">
                      {internalSelectedSlot.vehicleNumber}
                    </strong>
                  </span>
                ) : (
                  <span>Ready for compatible incoming vehicle</span>
                )}
                {internalSelectedSlot.entryHour !== undefined && (
                  <span>
                    Check-in:{' '}
                    <strong>{ReceiptService.formatHour(internalSelectedSlot.entryHour)}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectSlot(internalSelectedSlot)}
              className="btn-primary-muted px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Bay Details</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
