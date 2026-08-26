import { useCallback, useEffect, useRef, useState } from 'react';
import type { AttendanceStatus } from '@/models/attendanceStatus';
import { createUuid } from '@/utils/createUuid';
import { attendanceService } from '../services';
import type {
  AttendanceBatchResponse,
  AttendanceStatusSource,
} from '../attendance.types';

type ConfirmedParticipant = {
  usersId: number;
  status: string;
  statusSource: AttendanceStatusSource;
  biometricMarkedAt?: string | null;
};

type PendingChange = {
  status: AttendanceStatus;
  reason?: string;
};

type PendingChanges = Record<number, PendingChange>;

const DEBOUNCE_MS = 1_000;

const sameChange = (
  left: PendingChange | undefined,
  right: PendingChange | undefined
) => left?.status === right?.status && left?.reason === right?.reason;

export const useAttendanceBatchEditor = ({
  listId,
  confirmedParticipants,
  onConfirmed,
  onError,
}: {
  listId: number | null;
  confirmedParticipants: ConfirmedParticipant[];
  onConfirmed: (response: AttendanceBatchResponse) => void;
  onError: () => void;
}) => {
  const [pendingChanges, setPendingChanges] = useState<PendingChanges>({});
  const [pendingListId, setPendingListId] = useState<number | null>(listId);
  const [isSaving, setIsSaving] = useState(false);
  const pendingRef = useRef<PendingChanges>({});
  const pendingListIdRef = useRef<number | null>(listId);
  const confirmedRef = useRef(new Map<number, ConfirmedParticipant>());
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);
  const flushRef = useRef<() => Promise<boolean>>(async () => true);

  const replacePending = useCallback(
    (next: PendingChanges) => {
      pendingListIdRef.current = listId;
      pendingRef.current = next;
      setPendingListId(listId);
      setPendingChanges(next);
    },
    [listId]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const scheduleFlush = useCallback(() => {
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void flushRef.current();
    }, DEBOUNCE_MS);
  }, [clearTimer]);

  useEffect(() => {
    confirmedRef.current = new Map(
      confirmedParticipants.map(participant => [
        participant.usersId,
        participant,
      ])
    );
    if (pendingListIdRef.current !== listId) return;
    const next = { ...pendingRef.current };
    let changed = false;
    Object.entries(next).forEach(([rawUserId, pending]) => {
      const userId = Number(rawUserId);
      if (confirmedRef.current.get(userId)?.status === pending.status) {
        delete next[userId];
        changed = true;
      }
    });
    if (changed) replacePending(next);
  }, [confirmedParticipants, listId, replacePending]);

  useEffect(() => {
    clearTimer();
  }, [clearTimer, listId]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    if (!listId) return true;
    if (pendingListIdRef.current !== listId) {
      replacePending({});
      return true;
    }
    if (inFlightRef.current) {
      const previousSucceeded = await inFlightRef.current;
      if (!previousSucceeded) return false;
      return Object.keys(pendingRef.current).length ? flushRef.current() : true;
    }

    const snapshot = Object.fromEntries(
      Object.entries(pendingRef.current).filter(([rawUserId, pending]) => {
        const confirmed = confirmedRef.current.get(Number(rawUserId));
        return confirmed?.status !== pending.status;
      })
    ) as PendingChanges;
    if (!Object.keys(snapshot).length) {
      replacePending({});
      return true;
    }

    setIsSaving(true);
    const request = (async () => {
      try {
        const response = await attendanceService.updateBatch(
          listId,
          createUuid(),
          Object.entries(snapshot).map(([userId, change]) => ({
            userId: Number(userId),
            status: change.status,
            ...(change.reason ? { reason: change.reason } : {}),
          }))
        );
        response.participants.forEach(participant => {
          confirmedRef.current.set(participant.userId, {
            usersId: participant.userId,
            status: participant.status,
            statusSource: participant.statusSource,
            biometricMarkedAt: participant.biometricMarkedAt,
          });
        });
        const next = { ...pendingRef.current };
        Object.entries(snapshot).forEach(([rawUserId, sent]) => {
          const userId = Number(rawUserId);
          if (sameChange(next[userId], sent)) delete next[userId];
        });
        replacePending(next);
        onConfirmed(response);
        return true;
      } catch {
        const next = { ...pendingRef.current };
        Object.entries(snapshot).forEach(([rawUserId, sent]) => {
          const userId = Number(rawUserId);
          if (sameChange(next[userId], sent)) delete next[userId];
        });
        replacePending(next);
        onError();
        return false;
      } finally {
        inFlightRef.current = null;
        setIsSaving(false);
      }
    })();
    inFlightRef.current = request;
    const succeeded = await request;
    if (Object.keys(pendingRef.current).length) scheduleFlush();
    return succeeded;
  }, [clearTimer, listId, onConfirmed, onError, replacePending, scheduleFlush]);

  useEffect(() => {
    flushRef.current = flush;
  }, [flush]);

  const queueChange = useCallback(
    (userId: number, status: AttendanceStatus, reason?: string) => {
      const confirmed = confirmedRef.current.get(userId);
      const next =
        pendingListIdRef.current === listId ? { ...pendingRef.current } : {};
      if (confirmed?.status === status) {
        delete next[userId];
      } else {
        next[userId] = { status, ...(reason ? { reason } : {}) };
      }
      replacePending(next);
      if (Object.keys(next).length) scheduleFlush();
      else clearTimer();
    },
    [clearTimer, listId, replacePending, scheduleFlush]
  );

  const reset = useCallback(() => {
    clearTimer();
    replacePending({});
  }, [clearTimer, replacePending]);

  return {
    pendingChanges: pendingListId === listId ? pendingChanges : {},
    isSaving,
    queueChange,
    flush,
    reset,
  };
};
