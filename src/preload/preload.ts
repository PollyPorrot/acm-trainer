import { contextBridge, ipcRenderer } from "electron";

type IpcResult<T> = Promise<T>;
type UnknownRecord = Record<string, unknown>;

export interface AcmTrainerBridge {
  getSettings: () => IpcResult<UnknownRecord>;
  updateSettings: (patch: UnknownRecord) => IpcResult<UnknownRecord>;
  setAutostartEnabled: (enabled: boolean) => IpcResult<UnknownRecord>;
  refreshContests: () => IpcResult<UnknownRecord>;
  listTodayContests: () => IpcResult<unknown[]>;
  listVpContests: (filters?: UnknownRecord) => IpcResult<unknown[]>;
  createVpContest: (draft: UnknownRecord) => IpcResult<UnknownRecord>;
  updateVpContest: (id: string, patch: UnknownRecord) => IpcResult<UnknownRecord>;
  deleteVpContest: (id: string) => IpcResult<UnknownRecord>;
  listReviews: (filters?: UnknownRecord) => IpcResult<unknown[]>;
  createReview: (draft: UnknownRecord) => IpcResult<UnknownRecord>;
  updateReview: (id: string, patch: UnknownRecord) => IpcResult<UnknownRecord>;
  deleteReview: (id: string) => IpcResult<UnknownRecord>;
  listImages: (filters?: UnknownRecord) => IpcResult<unknown[]>;
  importImages: (drafts?: UnknownRecord[]) => IpcResult<unknown[]>;
  updateImage: (id: string, patch: UnknownRecord) => IpcResult<UnknownRecord>;
  deleteImage: (id: string) => IpcResult<UnknownRecord>;
  openTimer: (alwaysOnTop?: boolean) => IpcResult<UnknownRecord>;
  setTimerAlwaysOnTop: (enabled: boolean) => IpcResult<UnknownRecord>;
  showTodayReminder: () => IpcResult<UnknownRecord>;
}

const acmTrainer: AcmTrainerBridge = {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (patch) => ipcRenderer.invoke("settings:update", patch),
  setAutostartEnabled: (enabled) => ipcRenderer.invoke("settings:setAutostart", enabled),
  refreshContests: () => ipcRenderer.invoke("contests:refresh"),
  listTodayContests: () => ipcRenderer.invoke("contests:listToday"),
  listVpContests: (filters) => ipcRenderer.invoke("vp:list", filters),
  createVpContest: (draft) => ipcRenderer.invoke("vp:create", draft),
  updateVpContest: (id, patch) => ipcRenderer.invoke("vp:update", id, patch),
  deleteVpContest: (id) => ipcRenderer.invoke("vp:delete", id),
  listReviews: (filters) => ipcRenderer.invoke("reviews:list", filters),
  createReview: (draft) => ipcRenderer.invoke("reviews:create", draft),
  updateReview: (id, patch) => ipcRenderer.invoke("reviews:update", id, patch),
  deleteReview: (id) => ipcRenderer.invoke("reviews:delete", id),
  listImages: (filters) => ipcRenderer.invoke("images:list", filters),
  importImages: (drafts) => ipcRenderer.invoke("images:import", drafts),
  updateImage: (id, patch) => ipcRenderer.invoke("images:update", id, patch),
  deleteImage: (id) => ipcRenderer.invoke("images:delete", id),
  openTimer: (alwaysOnTop) => ipcRenderer.invoke("timer:open", alwaysOnTop),
  setTimerAlwaysOnTop: (enabled) => ipcRenderer.invoke("timer:setAlwaysOnTop", enabled),
  showTodayReminder: () => ipcRenderer.invoke("reminder:showToday")
};

contextBridge.exposeInMainWorld("acmTrainer", acmTrainer);

declare global {
  interface Window {
    acmTrainer: AcmTrainerBridge;
  }
}
