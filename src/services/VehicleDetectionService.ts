import { VehicleDetectionResult, VehicleType, BoundingBox } from '../types';

export class VehicleDetectionService {
  /**
   * Pluggable vehicle classifier interface.
   * Can accept video frame / bounding canvas for YOLO / MobileNet classification,
   * or simulate realistic classified detections.
   */
  public static async detectVehicle(
    source?: HTMLVideoElement | HTMLCanvasElement | null,
    forcedType?: VehicleType,
    forcedConfidence?: number
  ): Promise<VehicleDetectionResult> {
    if (forcedType) {
      return {
        vehicleDetected: true,
        vehicleType: forcedType,
        confidence: forcedConfidence !== undefined ? forcedConfidence : 95,
        boundingBox: this.getSimulatedVehicleBoundingBox(forcedType),
      };
    }

    // Default probabilistic sample: 65% two-wheelers on college campuses, 35% four-wheelers
    const detectedType: VehicleType = Math.random() > 0.35 ? 'TWO_WHEELER' : 'FOUR_WHEELER';
    const confidence = Math.floor(91 + Math.random() * 8); // 91% to 98%

    return {
      vehicleDetected: true,
      vehicleType: detectedType,
      confidence,
      boundingBox: this.getSimulatedVehicleBoundingBox(detectedType),
    };
  }

  /**
   * Generates realistic vehicle boundary coordinates for visual HUD overlay.
   */
  public static getSimulatedVehicleBoundingBox(type: VehicleType): BoundingBox {
    if (type === 'TWO_WHEELER') {
      return {
        x: 28,
        y: 20,
        width: 44,
        height: 65,
      };
    }
    return {
      x: 18,
      y: 22,
      width: 64,
      height: 60,
    };
  }
}
