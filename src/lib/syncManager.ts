import { supabase } from './supabase';
import { offlineStore, SyncQueueItem } from './offlineStore';

async function replayItem(item: SyncQueueItem): Promise<void> {
  const { table, operation, data } = item;
  if (operation === 'delete') {
    const { error } = await supabase.from(table).delete().eq('id', data.id as string);
    if (error) throw error;
    return;
  }
  if (operation === 'insert') {
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;
    return;
  }
  if (operation === 'update') {
    const { id, ...rest } = data;
    const { error } = await supabase.from(table).update(rest).eq('id', id as string);
    if (error) throw error;
  }
}

export async function flushSyncQueue(): Promise<number> {
  if (!navigator.onLine) return 0;
  const queue = await offlineStore.getSyncQueue();
  let flushed = 0;
  for (const item of queue) {
    try {
      await replayItem(item);
      if (item.id !== undefined) await offlineStore.removeSyncItem(item.id);
      flushed++;
    } catch {
      // keep failed items for next attempt
    }
  }
  return flushed;
}

let _onFlush: ((count: number) => void) | null = null;

export function onSyncFlush(cb: (count: number) => void) {
  _onFlush = cb;
}

export function initSyncManager() {
  window.addEventListener('online', () => {
    flushSyncQueue().then((count) => {
      if (count > 0 && _onFlush) _onFlush(count);
    });
  });
  flushSyncQueue().then((count) => {
    if (count > 0 && _onFlush) _onFlush(count);
  });
}
