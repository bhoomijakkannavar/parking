export class CameraService {
  /**
   * Checks if user browser supports getUserMedia.
   */
  public static isCameraSupported(): boolean {
    return !!(
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    );
  }

  /**
   * Requests camera stream safely with user-friendly error translations.
   */
  public static async startCamera(): Promise<{
    success: boolean;
    stream?: MediaStream;
    error?: string;
  }> {
    if (!this.isCameraSupported()) {
      return {
        success: false,
        error: 'Camera access is not supported by this browser environment.',
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'environment', // prefer back camera on devices
        },
        audio: false,
      });

      return {
        success: true,
        stream,
      };
    } catch (err: unknown) {
      let friendlyError = 'Failed to access camera.';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          friendlyError = 'Camera permission denied. Please allow camera permissions in browser settings.';
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          friendlyError = 'No optical camera device found on this system.';
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          friendlyError = 'Camera is currently in use by another application or process.';
        } else if (err.name === 'OverconstrainedError') {
          friendlyError = 'Camera constraints could not be satisfied by available video hardware.';
        } else {
          friendlyError = `Camera error: ${err.message}`;
        }
      }

      return {
        success: false,
        error: friendlyError,
      };
    }
  }

  /**
   * Stops all active tracks on a video stream.
   */
  public static stopCamera(stream: MediaStream | null): void {
    if (!stream) return;
    try {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    } catch (err) {
      console.warn('CameraService.stopCamera error:', err);
    }
  }
}
