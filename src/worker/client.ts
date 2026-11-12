import * as Comlink from 'comlink';
import type { SheetApi } from './sheet.worker';

let currentWorker: Worker | null = null;
let currentApi: Comlink.Remote<SheetApi> | null = null;

export function createWorkerClient(): Comlink.Remote<SheetApi> {
  if (currentWorker) {
    currentWorker.terminate();
  }
  currentWorker = new Worker(new URL('./sheet.worker.ts', import.meta.url), {
    type: 'module',
  });
  currentApi = Comlink.wrap<SheetApi>(currentWorker);
  return currentApi;
}

export function terminateWorker(): void {
  if (currentWorker) {
    currentWorker.terminate();
    currentWorker = null;
    currentApi = null;
  }
}
