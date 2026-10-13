// ─────────────────────────────────────────────────────────────────────────────
// src/services/SyncService.ts
// سرویس سینک دو طرفه با Supabase
// ─────────────────────────────────────────────────────────────────────────────

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "../config/supabase";
import { db } from "../core/Database";
import { logger } from "../core/Logger";
import { EventBus } from "../core/EventBus";
import { getDeviceId } from "../core/Storage";

// ─────────────────────────────────────────────────────────────────────────────
// انواع داده
// ─────────────────────────────────────────────────────────────────────────────

interface TableSync<T> {
  remote: string;
  getLocal: () => Promise<T[]>;
  markSynced: (id: string) => Promise<void>;
  timestamp: (row: T) => string;
  upsertFromSync: (row: T) => Promise<void>;
  deleteLocal?: (id: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// توابع کمکی سینک
// ─────────────────────────────────────────────────────────────────────────────

async function pushTable<T extends { id: string; syncStatus?: string }>(
  client: SupabaseClient,
  userId: string,
  t: TableSync<T>,
): Promise<void> {
  const rows = await t.getLocal();
  const toPush = rows.filter((r) => r.syncStatus !== "synced");

  if (toPush.length === 0) return;

  const payload = toPush.map((r) => ({
    id: r.id,
    user_id: userId,
    payload: r,
    updated_at: t.timestamp(r),
    deleted_at: null,
  }));

  const { error } = await client.from(t.remote).upsert(payload, { onConflict: "id" });

  // ✅ اصلاح: خطا را throw کن تا syncAll بفهمد
  if (error) {
    logger.warn(`push ${t.remote} ناموفق`, error.message);
    throw new Error(`push ${t.remote} failed: ${error.message}`);
  }

  for (const r of toPush) await t.markSynced(r.id);
  logger.debug(`push ${t.remote}`, { count: toPush.length });
}

async function pullTable<T extends { id: string }>(
  client: SupabaseClient,
  userId: string,
  t: TableSync<T>,
): Promise<void> {
  const { data: remoteRows, error } = await client
    .from(t.remote)
    .select("*")
    .eq("user_id", userId);

  // ✅ اصلاح: خطا را throw کن تا syncAll بفهمد
  if (error) {
    logger.warn(`pull ${t.remote} ناموفق`, error.message);
    throw new Error(`pull ${t.remote} failed: ${error.message}`);
  }

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

async function propagateDeletes(
  client: SupabaseClient,
  userId: string,
  remote: string,
): Promise<void> {
  const { data, error } = await client
    .from(remote)
    .select("id, deleted_at")
    .eq("user_id", userId)
    .not("deleted_at", "is", null);

  if (error) {
    logger.warn(`propagateDeletes ${remote} ناموفق`, error.message);
    throw new Error(`propagateDeletes ${remote} failed: ${error.message}`);
  }

  // اینجا می‌توانیم لیست ID های حذف شده را به کلاینت بدهیم
  // تا از حافظه محلی پاک کند
  logger.debug(`propagateDeletes ${remote}`, { count: data?.length ?? 0 });
}

// ─────────────────────────────────────────────────────────────────────────────
// تابع اصلی سینک
// ─────────────────────────────────────────────────────────────────────────────

export async function syncAll(): Promise<{
  success: boolean;
  error?: string;
  lastSyncAt?: string;
}> {
  try {
    const token = await db.auth.getToken();
    if (!token) {
      return { success: false, error: "کاربر وارد نشده است" };
    }

    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { success: false, error: "کاربر معتبر نیست" };
    }

    const userId = user.id;

    // سینک یادداشت‌ها
    const notesTable: TableSync<Note> = {
      remote: "notes",
      getLocal: () => db.notes.getAll(),
      markSynced: (id) => db.notes.markSynced(id),
      timestamp: (r) => r.updatedAt,
      upsertFromSync: (r) => db.notes.upsertFromSync(r),
      deleteLocal: (id) => db.notes.delete(id),
    };

    // سینک فلش‌کارت‌ها
    const flashcardsTable: TableSync<Flashcard> = {
      remote: "flashcards",
      getLocal: () => db.flashcards.getAll(),
      markSynced: (id) => db.flashcards.markSynced(id),
      timestamp: (r) => r.updatedAt,
      upsertFromSync: (r) => db.flashcards.upsertFromSync(r),
      deleteLocal: (id) => db.flashcards.delete(id),
    };

    // سینک آمار SRS
    const srsTable: TableSync<SRSData> = {
      remote: "srs_data",
      getLocal: () => db.srs.getAll(),
      markSynced: (id) => db.srs.markSynced(id),
      timestamp: (r) => r.updatedAt,
      upsertFromSync: (r) => db.srs.upsertFromSync(r),
    };

    // سینک تنظیمات
    const settingsTable: TableSync<Settings> = {
      remote: "settings",
      getLocal: () => db.settings.getAll(),
      markSynced: (id) => db.settings.markSynced(id),
      timestamp: (r) => r.updatedAt,
      upsertFromSync: (r) => db.settings.upsertFromSync(r),
    };

    // اجرای سینک برای همه جداول
    const tables = [notesTable, flashcardsTable, srsTable, settingsTable];

    for (const table of tables) {
      await pushTable(client, userId, table);
      await pullTable(client, userId, table);
      await propagateDeletes(client, userId, table.remote);
    }

    const lastSyncAt = new Date().toISOString();

    // ذخیره زمان آخرین سینک
    await db.settings.set("lastSyncAt", lastSyncAt);

    EventBus.emit("sync:success", { lastSyncAt });

    return { success: true, lastSyncAt };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "خطای ناشناخته";
    logger.error("syncAll شکست خورد", errorMsg);
    EventBus.emit("sync:error", { error: errorMsg });
    return { success: false, error: errorMsg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export برای استفاده در سایر بخش‌ها
// ─────────────────────────────────────────────────────────────────────────────

export { pushTable, pullTable, propagateDeletes };