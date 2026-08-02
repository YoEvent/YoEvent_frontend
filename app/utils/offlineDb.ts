const DB_NAME = 'yoevent_offline';
const DB_VERSION = 3;
const STORE = 'pending_events';
const CHECKIN_STORE = 'pending_checkins';
const ACTION_STORE = 'offline_action_queue';

export interface PendingEvent {
  id: string;
  eventData: Record<string, any>;
  scheduleData: Record<string, any>[];
  createdAt: number;
}

export interface PendingCheckIn {
  id: string;
  registrationId: string;
  sessionId: string;
  createdAt: number;
}

export interface QueuedAction {
  id: string;
  actionType: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  payload?: any;
  meta?: Record<string, any>;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CHECKIN_STORE)) {
        db.createObjectStore(CHECKIN_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ACTION_STORE)) {
        db.createObjectStore(ACTION_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── ACTION QUEUE FOR GENERIC OFFLINE MUTATIONS ──

export async function saveQueuedAction(
  action: Omit<QueuedAction, 'id' | 'createdAt'>
): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: QueuedAction = { ...action, id, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTION_STORE, 'readwrite');
    tx.objectStore(ACTION_STORE).add(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getQueuedActions(): Promise<QueuedAction[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTION_STORE, 'readonly');
    const req = tx.objectStore(ACTION_STORE).getAll();
    req.onsuccess = () => {
      const actions = (req.result as QueuedAction[]) || [];
      actions.sort((a, b) => a.createdAt - b.createdAt);
      resolve(actions);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteQueuedAction(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTION_STORE, 'readwrite');
    tx.objectStore(ACTION_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countQueuedActions(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ACTION_STORE, 'readonly');
    const req = tx.objectStore(ACTION_STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(req.error);
  });
}

// ── PENDING CHECK-INS ──

export async function savePendingCheckIn(registrationId: string, sessionId: string): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: PendingCheckIn = { id, registrationId, sessionId, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_STORE, 'readwrite');
    tx.objectStore(CHECKIN_STORE).add(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingCheckIns(): Promise<PendingCheckIn[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_STORE, 'readonly');
    const req = tx.objectStore(CHECKIN_STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingCheckIn[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingCheckIn(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_STORE, 'readwrite');
    tx.objectStore(CHECKIN_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countPendingCheckIns(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CHECKIN_STORE, 'readonly');
    const req = tx.objectStore(CHECKIN_STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(tx.error);
  });
}

// ── PENDING NEW EVENTS ──

export async function savePendingEvent(
  eventData: Record<string, any>,
  scheduleData: Record<string, any>[]
): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: PendingEvent = { id, eventData, scheduleData, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingEvents(): Promise<PendingEvent[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as PendingEvent[]);
    req.onerror = () => reject(req.error);
  });
}

export async function deletePendingEvent(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function countPendingEvents(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror = () => reject(tx.error);
  });
}
