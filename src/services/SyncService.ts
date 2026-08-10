/**
 * ============================================================
 * دانش‌یار پرو - SyncService (ماه ۴)
 * ============================================================
 * همگام‌سازی LWW با Supabase
 * @module services/SyncService
 * @version 1.0.0
 */
import { getSupabaseClient, type SupabaseClient } from '@/services/AuthService';
import { SUPABASE_ENABLED } from '@/config/supabase';
import { getDatabase, type DbNote, type DbFlashcard, type DbQuizResult, type DbStudySession } from '@/core/Database';
import { getSession } from '@/services/AuthService';
import { getInstance as getLogger } from '@/core/Logger';

const logger = getLogger().module('SyncService');

const LAST_SYNC_KEY = 'daneshyar_last_sync';
const SNAPSHOT_KEY = 'daneshyar_sync_snapshot';

export type SyncUIStatus = 'idle' | 'syncing' | 'success' | 'error' | 'disabled';

let listeners: Array<(s: SyncUIStatus) => void> = [];

export function onSyncStatus(cb: (s: SyncUIStatus) => void): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter((x) => x !== cb); };
}

function setStatus(s: SyncUIStatus): void {
  listeners.forEach((cb) => cb(s));
}

/** انتخاب اولین فیلد زمانی معتبر */
function ts(r: Record<string, unknown>, ...fields: string[]): string {
  for (const f of fields) {
    const v = r[f];
    if (typeof v === 'string' && v) return v;
  }
  return new Date().toISOString();
}

interface TableSync<T extends { id: string }> {
  remote: string;
  getLocal: () => Promise<T[]>;
  upsertFromSync: (r: T) => Promise<void>;
  markSynced: (id: string) => Promise<void>;
  timestamp: (r: T) => string;
  deleteLocal?: (id: string) => Promise<unknown>;
}

async function pushTable<T extends { id: string; syncStatus?: string }>(
  client: SupabaseClient, userId: string, t: TableSync<T>
): Promise<void> {
  const rows = await t.getLocal();
  const toPush = rows.filter((r) => r.syncStatus !== 'synced');
  if (toPush.length === 0) return;
  const payload = toPush.map((r) => ({
    id: r.id,
    user_id: userId,
    payload: r,
    updated_at: t.timestamp(r),
    deleted_at: null,
  }));
  const { error } = await client.from(t.remote).upsert(payload, { onConflict: 'id' });
  if (error) { logger.warn(`push ${t.remote} ناموفق`, error.message); return; }
  for (const r of toPush) await t.markSynced(r.id);
  logger.debug(`push ${t.remote}`, { count: toPush.length });
}

async function pullTable<T extends { id: string }>(
  client: SupabaseClient, userId: string, t: TableSync<T>
): Promise<void> {
  const { data: remoteRows, error } = await client
    .from(t.remote).select('*').eq('user_id', userId);
  if (error) { logger.warn(`pull ${t.remote} ناموفق`, error.message); return; }
  const localRows = await t.getLocal();
  const localMap = new Map(localRows.map((r) => [r.id, r]));
  for (const rem of remoteRows ?? []) {
    if (rem.deleted_at) {
      if (localMap.has(rem.id) && t.deleteLocal) await t.deleteLocal(rem.id);
      continue;
    }
    const local = localMap.get(rem.id);
    const remTs = new Date(rem.updated_at as string).getTime();
    const localTs = local ? new Date(t.timestamp(local)).getTime() : 0;
    if (!local || remTs > localTs) await t.upsertFromSync(rem.payload as T);
  }
}

function getSnapshot(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) ?? '{}') as Record<string, string[]>; }
  catch { return {}; }
}

function saveSnapshot(s: Record<string, string[]>): void {
  localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(s));
}

async function propagateDeletes(
  client: SupabaseClient, userId: string, remoteTable: string,
  prevIds: Set<string>, currentIds: Set<string>
): Promise<void> {
  const deleted = [...prevIds].filter((id) => !currentIds.has(id));
  if (deleted.length === 0) return;
  const now = new Date().toISOString();
  for (const id of deleted) {
    await client.from(remoteTable).update({ deleted_at: now }).eq('id', id).eq('user_id', userId);
  }
  logger.info(`انتشار ${deleted.length} حذف در ${remoteTable}`);
}

export async function syncAll(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) { setStatus('disabled'); return; }
  const session = await getSession();
  if (!session?.user) { setStatus('disabled'); return; }
  const userId = session.user.id;

  setStatus('syncing');
  try {
    const db = getDatabase();
    const snapshot = getSnapshot();
    const asRec = (r: unknown) => r as Record<string, unknown>;

    const notesCfg: TableSync<DbNote> = {
      remote: 'notes',
      getLocal: () => db.getNotes(),
      upsertFromSync: (r) => db.upsertNoteFromSync(r),
      markSynced: (id) => db.markNoteSynced(id),
      timestamp: (r) => ts(asRec(r), 'updatedAt', 'createdAt'),
      deleteLocal: (id) => db.deleteNote(id),
    };
    const cardsCfg: TableSync<DbFlashcard> = {
      remote: 'flashcards',
      getLocal: () => db.getFlashcards(),
      upsertFromSync: (r) => db.upsertFlashcardFromSync(r),
      markSynced: (id) => db.markFlashcardSynced(id),
      timestamp: (r) => ts(asRec(r), 'updatedAt', 'createdAt'),
      deleteLocal: (id) => db.deleteFlashcard(id),
    };
    const quizCfg: TableSync<DbQuizResult> = {
      remote: 'quiz_results',
      getLocal: () => db.getQuizHistory(),
      upsertFromSync: (r) => db.upsertQuizResultFromSync(r),
      markSynced: (id) => db.markQuizResultSynced(id),
      timestamp: (r) => ts(asRec(r), 'date'),
    };
    const sessionsCfg: TableSync<DbStudySession> = {
      remote: 'study_sessions',
      getLocal: () => db.getStudySessions(),
      upsertFromSync: (r) => db.upsertStudySessionFromSync(r),
      markSynced: (id) => db.markStudySessionSynced(id),
      timestamp: (r) => ts(asRec(r), 'date'),
    };

    const prevNoteIds = new Set(snapshot['notes'] ?? []);
    const prevCardIds = new Set(snapshot['flashcards'] ?? []);

    // ۱) PUSH
    await pushTable(client, userId, notesCfg);
    await pushTable(client, userId, cardsCfg);
    await pushTable(client, userId, quizCfg);
    await pushTable(client, userId, sessionsCfg);

    // ۲) انتشار حذف‌ها (قبل از pull تا رکورد حذف‌شده برنگردد)
    const curNotes = await db.getNotes();
    const curCards = await db.getFlashcards();
    await propagateDeletes(client, userId, 'notes', prevNoteIds, new Set(curNotes.map((n) => n.id)));
    await propagateDeletes(client, userId, 'flashcards', prevCardIds, new Set(curCards.map((c) => c.id)));

    // ۳) PULL
    await pullTable(client, userId, notesCfg);
    await pullTable(client, userId, cardsCfg);
    await pullTable(client, userId, quizCfg);
    await pullTable(client, userId, sessionsCfg);

    // ۴) ذخیره snapshot جدید
    const finalNotes = await db.getNotes();
    const finalCards = await db.getFlashcards();
    saveSnapshot({
      notes: finalNotes.map((n) => n.id),
      flashcards: finalCards.map((c) => c.id),
    });

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    setStatus('success');
    logger.info('✅ سینک کامل شد');
  } catch (error) {
    logger.error('خطا در سینک', error);
    setStatus('error');
  }
}

export function getLastSync(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

export function isSyncAvailable(): boolean {
  return SUPABASE_ENABLED;
}