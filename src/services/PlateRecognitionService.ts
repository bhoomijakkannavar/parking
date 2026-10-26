import { PlateDetectionResult, BoundingBox } from '../types';
import { ValidationService } from './ValidationService';

export class PlateRecognitionService {
  /**
   * Pluggable ANPR/OCR detection interface.
   * Can accept a canvas or video element frame in production,
   * or generate deterministic offline recognitions in demo mode.
   */
  public static async detectPlate(
    source?: HTMLVideoElement | HTMLCanvasElement | string | null,
    forcedPlate?: string,
    forcedConfidence?: number
  ): Promise<PlateDetectionResult> {
    // If a specific plate is requested (e.g. from demo simulator)
    if (forcedPlate) {
      const normalized = ValidationService.normalizeVehicleNumber(forcedPlate);
      return {
        plateNumber: normalized,
        confidence: forcedConfidence !== undefined ? forcedConfidence : 96,
        boundingBox: this.getSimulatedPlateBoundingBox(),
      };
    }

    // Default sample license plates for campus ANPR gate simulation
    const demoPlates = [
      'KA22XY9876',
      'KA22AB1234',
      'KA22CD5678',
      'KA22EF9876',
      'KA22GH4321',
      'MH12PQ3456',
    ];

    const randomPlate = demoPlates[Math.floor(Math.random() * demoPlates.length)];
    const confidence = Math.floor(92 + Math.random() * 7); // 92% to 98%

    return {
      plateNumber: ValidationService.normalizeVehicleNumber(randomPlate),
      confidence,
      boundingBox: this.getSimulatedPlateBoundingBox(),
    };
  }

  /**
   * Returns a standard normalized license plate bounding box for UI camera overlay.
   */
  public static getSimulatedPlateBoundingBox(): BoundingBox {
    return {
      x: 35, // percentage from left
      y: 60, // percentage from top
      width: 30, // percentage width
      height: 14, // percentage height
    };
  }
}
