import { IdCardDetectionResult, BoundingBox } from '../types';
import { ValidationService } from './ValidationService';

export class IdCardRecognitionService {
  /**
   * Scans an optical source (video, canvas, image file) or processes a simulated preset
   * to detect a college student/staff ID card and extract its member ID.
   */
  public static async detectIdCard(
    source?: HTMLVideoElement | HTMLCanvasElement | File | string | null,
    forcedId?: string,
    forcedConfidence?: number
  ): Promise<IdCardDetectionResult> {
    // If a specific ID is forced (e.g. from demo preset simulator)
    if (forcedId) {
      const cleanId = forcedId.trim().toUpperCase();
      const masked = ValidationService.maskMemberId(cleanId);
      return {
        cardDetected: true,
        idNumber: cleanId,
        maskedIdNumber: masked,
        confidence: forcedConfidence !== undefined ? forcedConfidence : 96,
        rawText: `NATIONAL INSTITUTE OF TECHNOLOGY\nID: ${cleanId}\nCAMPUS CARD`,
        boundingBox: this.getSimulatedIdCardBoundingBox(),
      };
    }

    // If source is a File (Image upload)
    if (source && typeof (source as File).name === 'string') {
      const file = source as File;
      // Extract potential ID from filename if named like STU-2023-045.jpg or use default detected card
      const match = file.name.toUpperCase().match(/(STU|FAC|STF|ADM)-[A-Z0-9]+-[0-9]+/);
      const extracted = match ? match[0] : 'STU-2023-045';
      const masked = ValidationService.maskMemberId(extracted);
      return {
        cardDetected: true,
        idNumber: extracted,
        maskedIdNumber: masked,
        confidence: 94,
        rawText: `NATIONAL INSTITUTE OF TECHNOLOGY\nSTUDENT IDENTIFICATION\nID NO: ${extracted}`,
        boundingBox: this.getSimulatedIdCardBoundingBox(),
      };
    }

    // Default simulated ID card candidates
    const demoIds = [
      'STU-2023-045', // Rohan Verma (Student) - Bike KA-05-ST-2020
      'FAC-CS-101',  // Prof. Arvind Sharma (Faculty) - Car KA-01-FA-1001, Bike KA-01-FA-2002
      'STU-2022-811', // Ananya Roy (Student) - Car KA-02-AR-8899
      'STF-ADM-012',  // Suresh Kumar (Staff) - Bike KA-04-SK-5555
    ];

    const randomId = demoIds[Math.floor(Math.random() * demoIds.length)];
    const confidence = Math.floor(91 + Math.random() * 8); // 91% - 98%
    const masked = ValidationService.maskMemberId(randomId);

    return {
      cardDetected: true,
      idNumber: randomId,
      maskedIdNumber: masked,
      confidence,
      rawText: `INSTITUTIONAL ID CARD\nMEMBER ID: ${randomId}\nVALID CAMPUS PERMIT`,
      boundingBox: this.getSimulatedIdCardBoundingBox(),
    };
  }

  /**
   * Returns a standard normalized ID card bounding box for UI camera overlay.
   */
  public static getSimulatedIdCardBoundingBox(): BoundingBox {
    return {
      x: 65, // percentage from left (right side of camera feed)
      y: 20, // percentage from top
      width: 28, // percentage width
      height: 38, // percentage height
      label: 'COLLEGE ID CARD',
    };
  }
}
