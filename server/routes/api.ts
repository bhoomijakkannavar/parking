import { Router, Request, Response } from 'express';
import { ParkingDbService } from '../services/ParkingDbService';
import { VehicleType, OwnerCategory } from '../services/FeeCalculator';

export const apiRouter = Router();

const getParam = (param: string | string[] | undefined): string => {
  return Array.isArray(param) ? (param[0] ?? '') : (param ?? '');
};

// ---- HEALTH CHECK ----
apiRouter.get('/health', (_req: Request, res: Response) => {
  try {
    const slots = ParkingDbService.getSlots();
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      slotsCount: slots.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ status: 'error', database: 'disconnected', error: message });
  }
});

// ---- DASHBOARD ----
apiRouter.get('/dashboard', (_req: Request, res: Response) => {
  try {
    const data = ParkingDbService.getDashboard();
    res.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- SLOTS ----
apiRouter.get('/slots', (_req: Request, res: Response) => {
  try {
    const slots = ParkingDbService.getSlots();
    // Normalize field names to match frontend expectations
    const normalized = slots.map((s) => ({
      id: s.id,
      type: s.type,
      status: s.status,
      vehicleId: s.current_vehicle_id || undefined,
      vehicleNumber: s.current_vehicle_number || undefined,
      ownerCategory: s.current_owner_category || undefined,
      entryHour: s.current_entry_hour !== null ? s.current_entry_hour : undefined,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- VEHICLES ----
apiRouter.get('/vehicles', (req: Request, res: Response) => {
  try {
    const statusParam = req.query.status as 'PARKED' | 'EXITED' | undefined;
    const vehicles = ParkingDbService.getVehicles(statusParam);
    const normalized = vehicles.map((v) => ({
      id: v.id,
      vehicleNumber: v.vehicle_number,
      vehicleType: v.vehicle_type,
      ownerCategory: v.owner_category,
      slotId: v.current_slot_id || '',
      entryHour: v.current_entry_hour || 0,
      status: v.status,
      createdAt: v.created_at,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/vehicles/:vehicleNumber', (req: Request, res: Response) => {
  try {
    const found = ParkingDbService.findVehicle(getParam(req.params.vehicleNumber));
    if (!found) {
      return res.status(404).json({ success: false, message: 'Vehicle not found.' });
    }
    const session = ParkingDbService.findActiveSession(found.vehicle_number);
    res.json({
      success: true,
      data: {
        id: found.id,
        vehicleNumber: found.vehicle_number,
        vehicleType: found.vehicle_type,
        ownerCategory: found.owner_category,
        slotId: found.current_slot_id || '',
        entryHour: found.current_entry_hour || 0,
        status: found.status,
        createdAt: found.created_at,
        activeSession: session || null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- SESSIONS ----
apiRouter.get('/sessions/active', (_req: Request, res: Response) => {
  try {
    const active = ParkingDbService.getActiveSessions();
    const normalized = active.map((s) => ({
      id: s.id,
      vehicleId: s.vehicle_id,
      slotId: s.slot_id,
      vehicleNumber: s.vehicle_number,
      vehicleType: s.vehicle_type,
      ownerCategory: s.owner_category,
      entryHour: s.entry_hour,
      status: s.status,
      createdAt: s.created_at,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- ENTRY ----
apiRouter.post('/parking/entry', (req: Request, res: Response) => {
  try {
    const { vehicleNumber, vehicleType, ownerCategory, entryHour, origin } = req.body;

    if (!vehicleNumber || typeof vehicleNumber !== 'string') {
      return res.status(400).json({ success: false, message: 'Valid vehicle number is required.' });
    }
    if (!['TWO_WHEELER', 'FOUR_WHEELER'].includes(vehicleType)) {
      return res.status(400).json({ success: false, message: 'Valid vehicle type is required (TWO_WHEELER or FOUR_WHEELER).' });
    }
    if (!['STAFF', 'STUDENT', 'VISITOR'].includes(ownerCategory)) {
      return res.status(400).json({ success: false, message: 'Valid owner category is required (STAFF, STUDENT, VISITOR).' });
    }
    if (entryHour === undefined || isNaN(Number(entryHour))) {
      return res.status(400).json({ success: false, message: 'Valid entry hour (0-23) is required.' });
    }

    const result = ParkingDbService.parkVehicle({
      vehicleNumber: String(vehicleNumber),
      vehicleType: vehicleType as VehicleType,
      ownerCategory: ownerCategory as OwnerCategory,
      entryHour: Number(entryHour),
      origin: origin || 'MANUAL',
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    // Format response to match frontend types
    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        slot: {
          id: result.slot!.id,
          type: result.slot!.type,
          status: result.slot!.status,
          vehicleId: result.slot!.current_vehicle_id || undefined,
          vehicleNumber: result.slot!.current_vehicle_number || undefined,
          ownerCategory: result.slot!.current_owner_category || undefined,
          entryHour: result.slot!.current_entry_hour !== null ? result.slot!.current_entry_hour : undefined,
        },
        vehicle: {
          id: result.vehicle!.id,
          vehicleNumber: result.vehicle!.vehicle_number,
          vehicleType: result.vehicle!.vehicle_type,
          ownerCategory: result.vehicle!.owner_category,
          slotId: result.vehicle!.current_slot_id || '',
          entryHour: result.vehicle!.current_entry_hour || 0,
          status: result.vehicle!.status,
          createdAt: result.vehicle!.created_at,
        },
        session: {
          id: result.session!.id,
          vehicleId: result.session!.vehicle_id,
          slotId: result.session!.slot_id,
          vehicleNumber: result.session!.vehicle_number,
          vehicleType: result.session!.vehicle_type,
          ownerCategory: result.session!.owner_category,
          entryHour: result.session!.entry_hour,
          status: result.session!.status,
          createdAt: result.session!.created_at,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- EXIT ----
apiRouter.post('/parking/exit', (req: Request, res: Response) => {
  try {
    const { searchKey, exitHour } = req.body;

    if (!searchKey || typeof searchKey !== 'string') {
      return res.status(400).json({ success: false, message: 'Please provide a vehicle number or slot ID.' });
    }
    if (exitHour === undefined || isNaN(Number(exitHour))) {
      return res.status(400).json({ success: false, message: 'Valid exit hour is required.' });
    }

    const result = ParkingDbService.checkoutVehicle(String(searchKey), Number(exitHour));

    if (!result.success) {
      return res.status(400).json(result);
    }

    let parsedBreakdown = [];
    try {
      parsedBreakdown = JSON.parse(result.receipt!.breakdown_json);
    } catch {
      parsedBreakdown = [];
    }

    res.json({
      success: true,
      message: result.message,
      data: {
        session: {
          id: result.session!.id,
          vehicleId: result.session!.vehicle_id,
          slotId: result.session!.slot_id,
          vehicleNumber: result.session!.vehicle_number,
          vehicleType: result.session!.vehicle_type,
          ownerCategory: result.session!.owner_category,
          entryHour: result.session!.entry_hour,
          exitHour: result.session!.exit_hour || undefined,
          duration: result.session!.duration || undefined,
          fee: result.session!.fee !== null ? result.session!.fee : undefined,
          status: result.session!.status,
          receiptId: result.session!.receipt_id || undefined,
          createdAt: result.session!.created_at,
          completedAt: result.session!.completed_at || undefined,
        },
        receipt: {
          id: result.receipt!.id,
          sessionId: result.receipt!.session_id,
          vehicleNumber: result.receipt!.vehicle_number,
          vehicleType: result.receipt!.vehicle_type,
          ownerCategory: result.receipt!.owner_category,
          slotId: result.receipt!.slot_id,
          entryHour: result.receipt!.entry_hour,
          exitHour: result.receipt!.exit_hour,
          duration: result.receipt!.duration,
          fee: result.receipt!.fee,
          breakdown: parsedBreakdown,
          createdAt: result.receipt!.created_at,
        },
        feeResult: result.feeResult,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- HISTORY ----
apiRouter.get('/parking/history', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const history = ParkingDbService.getHistory(limit);
    const normalized = history.map((s) => ({
      id: s.id,
      vehicleId: s.vehicle_id,
      slotId: s.slot_id,
      vehicleNumber: s.vehicle_number,
      vehicleType: s.vehicle_type,
      ownerCategory: s.owner_category,
      entryHour: s.entry_hour,
      exitHour: s.exit_hour || undefined,
      duration: s.duration || undefined,
      fee: s.fee !== null ? s.fee : undefined,
      status: s.status,
      receiptId: s.receipt_id || undefined,
      createdAt: s.created_at,
      completedAt: s.completed_at || undefined,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- RECEIPTS ----
apiRouter.get('/receipts', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const receipts = ParkingDbService.getReceipts(limit);
    const normalized = receipts.map((r) => {
      let breakdown = [];
      try {
        breakdown = JSON.parse(r.breakdown_json);
      } catch {
        breakdown = [];
      }
      return {
        id: r.id,
        sessionId: r.session_id,
        vehicleNumber: r.vehicle_number,
        vehicleType: r.vehicle_type,
        ownerCategory: r.owner_category,
        slotId: r.slot_id,
        entryHour: r.entry_hour,
        exitHour: r.exit_hour,
        duration: r.duration,
        fee: r.fee,
        breakdown,
        createdAt: r.created_at,
      };
    });
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/receipts/:id', (req: Request, res: Response) => {
  try {
    const receipt = ParkingDbService.getReceiptById(getParam(req.params.id));
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found.' });
    }
    let breakdown = [];
    try {
      breakdown = JSON.parse(receipt.breakdown_json);
    } catch {
      breakdown = [];
    }
    res.json({
      success: true,
      data: {
        id: receipt.id,
        sessionId: receipt.session_id,
        vehicleNumber: receipt.vehicle_number,
        vehicleType: receipt.vehicle_type,
        ownerCategory: receipt.owner_category,
        slotId: receipt.slot_id,
        entryHour: receipt.entry_hour,
        exitHour: receipt.exit_hour,
        duration: receipt.duration,
        fee: receipt.fee,
        breakdown,
        createdAt: receipt.created_at,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- MEMBERS ----
apiRouter.get('/members', (_req: Request, res: Response) => {
  try {
    const members = ParkingDbService.getMembers();
    res.json({ success: true, data: members });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/members', (req: Request, res: Response) => {
  try {
    const { id, name, role, department, registeredVehicles, passId } = req.body;
    if (!id || !name || !role || !department) {
      return res.status(400).json({ success: false, message: 'ID, name, role, and department are required.' });
    }
    ParkingDbService.addMember({
      id,
      name,
      role,
      department,
      registeredVehicles: registeredVehicles || [],
      passId,
    });
    res.status(201).json({ success: true, message: 'Member registered successfully.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- COLLEGE ID VERIFICATION ----
apiRouter.post('/verify-id', (req: Request, res: Response) => {
  try {
    const { idCardNumber, plateNumber, confidence, isManualOverride, overrideReason } = req.body;
    const result = ParkingDbService.verifyCollegeId({
      idCardNumber,
      plateNumber,
      confidence: confidence !== undefined ? Number(confidence) : undefined,
      isManualOverride: Boolean(isManualOverride),
      overrideReason: overrideReason ? String(overrideReason) : undefined,
    });
    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- CAMERA EVENTS ----
apiRouter.get('/camera-events', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const events = ParkingDbService.getCameraEvents(limit);
    const normalized = events.map((e) => ({
      id: e.id,
      timestamp: e.timestamp,
      plateNumber: e.plate_number,
      vehicleType: e.vehicle_type,
      ownerCategory: e.owner_category || undefined,
      gateType: e.gate_type,
      confidence: e.confidence,
      mode: e.mode,
      action: e.action,
      actionSummary: e.action_summary,
      slotId: e.slot_id || undefined,
      fee: e.fee !== null ? e.fee : undefined,
      faceDetected: Boolean(e.face_detected),
      memberId: e.member_id || undefined,
      memberName: e.member_name || undefined,
      role: e.role || undefined,
      idCardNumberMasked: e.id_card_number_masked || undefined,
      idVerificationStatus: e.id_verification_status || undefined,
      idVerificationReason: e.id_verification_reason || undefined,
      overrideReason: e.override_reason || undefined,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/camera-events', (req: Request, res: Response) => {
  try {
    const event = req.body;
    if (!event.plateNumber || !event.gateType) {
      return res.status(400).json({ success: false, message: 'Plate number and gate type required.' });
    }
    const created = ParkingDbService.addCameraEvent(event);
    res.status(201).json({ success: true, data: created });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- ALERTS ----
apiRouter.get('/alerts', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const alerts = ParkingDbService.getAlerts(limit);
    const normalized = alerts.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      message: a.message,
      details: a.details || undefined,
      timestamp: a.timestamp,
      status: a.status,
      vehicleNumber: a.vehicle_number || undefined,
      slotId: a.slot_id || undefined,
    }));
    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.all('/alerts/:id/resolve', (req: Request, res: Response) => {
  try {
    const updated = ParkingDbService.resolveAlert(getParam(req.params.id));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }
    res.json({ success: true, message: 'Alert resolved.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- WRONG PARKING DETECTION & SURVEILLANCE ----
apiRouter.post('/wrong-parking/detect', (req: Request, res: Response) => {
  try {
    const { vehicleNumber, detectedSlotId, confidence, cameraId, cameraZone, confidenceThreshold, isDemo } = req.body;
    if (!vehicleNumber || !detectedSlotId) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number and detected slot ID are required for optical parking verification.',
      });
    }

    const result = ParkingDbService.detectWrongParking({
      vehicleNumber,
      detectedSlotId,
      confidence: confidence !== undefined ? Number(confidence) : undefined,
      cameraId: cameraId ? String(cameraId) : undefined,
      cameraZone: cameraZone ? String(cameraZone) : undefined,
      confidenceThreshold: confidenceThreshold !== undefined ? Number(confidenceThreshold) : undefined,
      isDemo: isDemo !== undefined ? Boolean(isDemo) : undefined,
    });

    res.json({ success: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/wrong-parking/incidents', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    const statusParam = req.query.status as any;
    const incidents = ParkingDbService.getWrongParkingIncidents(limit, statusParam);

    const normalized = incidents.map((inc) => ({
      id: inc.id,
      vehicleNumber: inc.vehicle_number,
      vehicleNumberMasked: inc.vehicle_number_masked,
      allocatedSlotId: inc.allocated_slot_id,
      detectedSlotId: inc.detected_slot_id,
      cameraId: inc.camera_id,
      cameraZone: inc.camera_zone,
      confidence: inc.confidence,
      status: inc.status,
      severity: inc.severity,
      sirenTriggered: Boolean(inc.siren_triggered),
      sirenMuted: Boolean(inc.siren_muted),
      acknowledgedBy: inc.acknowledged_by || undefined,
      acknowledgedAt: inc.acknowledged_at || undefined,
      resolvedBy: inc.resolved_by || undefined,
      resolvedAt: inc.resolved_at || undefined,
      resolutionNotes: inc.resolution_notes || undefined,
      isDemo: Boolean(inc.is_demo),
      createdAt: inc.created_at,
      updatedAt: inc.updated_at,
    }));

    res.json({ success: true, data: normalized });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/wrong-parking/incidents/:id/acknowledge', (req: Request, res: Response) => {
  try {
    const { operatorRole, operatorId, notes } = req.body;
    const result = ParkingDbService.acknowledgeWrongParkingIncident(getParam(req.params.id), {
      operatorRole: operatorRole || req.headers['x-operator-role'] as string,
      operatorId: operatorId || req.headers['x-operator-id'] as string,
      notes,
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/wrong-parking/incidents/:id/resolve', (req: Request, res: Response) => {
  try {
    const { operatorRole, operatorId, notes, isFalsePositive } = req.body;
    const result = ParkingDbService.resolveWrongParkingIncident(getParam(req.params.id), {
      operatorRole: operatorRole || req.headers['x-operator-role'] as string,
      operatorId: operatorId || req.headers['x-operator-id'] as string,
      notes,
      isFalsePositive: Boolean(isFalsePositive),
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/wrong-parking/incidents/:id/mute', (req: Request, res: Response) => {
  try {
    const { operatorRole, operatorId, reason } = req.body;
    const result = ParkingDbService.muteIncidentAlarm(getParam(req.params.id), {
      operatorRole,
      operatorId,
      reason,
    });

    if (!result.success) {
      return res.status(404).json(result);
    }
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/wrong-parking/alarm/test', (_req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      mode: 'SOFTWARE_SIMULATION',
      message: 'Test alarm signal dispatched. Local software audio alarm sound generated in browser.',
      notice: 'No physical hardware speaker is connected. Physical vehicle horn is never triggered.',
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- VIP & EMERGENCY PRIORITY RESERVATIONS ----

apiRouter.get('/reservations', (req: Request, res: Response) => {
  try {
    const { status, reservationType, slotId, searchQuery, limit } = req.query;
    const reservations = ParkingDbService.getReservations({
      status: status as string,
      reservationType: reservationType as string,
      slotId: slotId as string,
      searchQuery: searchQuery as string,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: reservations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/reservations/audit-logs', (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 100;
    const logs = ParkingDbService.getReservationAuditLogs(limit);
    res.json({ success: true, data: logs });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.get('/reservations/:id', (req: Request, res: Response) => {
  try {
    const reservation = ParkingDbService.getReservationById(getParam(req.params.id));
    if (!reservation) {
      return res.status(404).json({ success: false, message: 'Reservation not found.' });
    }
    res.json({ success: true, data: reservation });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/reservations', (req: Request, res: Response) => {
  try {
    const {
      reservationType,
      slotId,
      vehicleNumber,
      guestName,
      startTime,
      endTime,
      reason,
      contactDepartment,
      notes,
      operatorRole,
      operatorId,
      securityPin,
    } = req.body;

    const opRole = operatorRole || (req.headers['x-operator-role'] as string);
    const opId = operatorId || (req.headers['x-operator-id'] as string);
    const pin = securityPin || (req.headers['x-security-pin'] as string);

    const result = ParkingDbService.createReservation({
      reservationType,
      slotId,
      vehicleNumber,
      guestName,
      startTime,
      endTime,
      reason,
      contactDepartment,
      notes,
      operatorRole: opRole,
      operatorId: opId,
      securityPin: pin,
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (result.conflict) {
      return res.status(409).json(result);
    }
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/reservations/:id/cancel', (req: Request, res: Response) => {
  try {
    const { reason, operatorRole, operatorId, securityPin } = req.body;
    const opRole = operatorRole || (req.headers['x-operator-role'] as string);
    const opId = operatorId || (req.headers['x-operator-id'] as string);
    const pin = securityPin || (req.headers['x-security-pin'] as string);

    const result = ParkingDbService.cancelReservation(getParam(req.params.id), {
      reason,
      operatorRole: opRole,
      operatorId: opId,
      securityPin: pin,
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/reservations/fast-track', (req: Request, res: Response) => {
  try {
    const { vehicleNumber, reservationId, operatorRole, operatorId, securityPin } = req.body;
    const opRole = operatorRole || (req.headers['x-operator-role'] as string);
    const opId = operatorId || (req.headers['x-operator-id'] as string);
    const pin = securityPin || (req.headers['x-security-pin'] as string);

    const result = ParkingDbService.processFastTrackArrival({
      vehicleNumber,
      reservationId,
      operatorRole: opRole,
      operatorId: opId,
      securityPin: pin,
    });

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- SECURITY-CONTROLLED SLOT LOCKS ----

apiRouter.get('/slots/locks', (_req: Request, res: Response) => {
  try {
    const locks = ParkingDbService.getSecurityLocks();
    res.json({ success: true, data: locks });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/slots/:id/lock', (req: Request, res: Response) => {
  try {
    const { lockType, reason, reservationId, operatorRole, operatorId, securityPin } = req.body;
    const opRole = operatorRole || (req.headers['x-operator-role'] as string);
    const opId = operatorId || (req.headers['x-operator-id'] as string);
    const pin = securityPin || (req.headers['x-security-pin'] as string);

    const result = ParkingDbService.lockSlot({
      slotId: getParam(req.params.id),
      lockType: lockType || 'SECURITY_LOCKED',
      reason,
      reservationId,
      operatorRole: opRole,
      operatorId: opId,
      securityPin: pin,
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/slots/:id/unlock', (req: Request, res: Response) => {
  try {
    const { releaseReason, operatorRole, operatorId, securityPin } = req.body;
    const opRole = operatorRole || (req.headers['x-operator-role'] as string);
    const opId = operatorId || (req.headers['x-operator-id'] as string);
    const pin = securityPin || (req.headers['x-security-pin'] as string);

    const result = ParkingDbService.unlockSlot({
      slotId: getParam(req.params.id),
      releaseReason,
      operatorRole: opRole,
      operatorId: opId,
      securityPin: pin,
    });

    if (result.unauthorized) {
      return res.status(403).json(result);
    }
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

// ---- SYSTEM SEED & RESET ----
apiRouter.post('/system/seed', (_req: Request, res: Response) => {
  try {
    ParkingDbService.seedRealisticDemoData();
    res.json({ success: true, message: 'Demo data seeded into SQLite database.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});

apiRouter.post('/system/reset', (_req: Request, res: Response) => {
  try {
    ParkingDbService.resetSystem();
    res.json({ success: true, message: 'System reset. All 15 slots are now AVAILABLE.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ success: false, error: message });
  }
});
