import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AppSettings,
  AppTheme,
  ProgressSummary,
  RoadmapGraph,
  SeedReloadEvent,
  StageWithTopics,
  StudyStatus,
  TopicDetail
} from '../shared/types';

const learning = {
  getOutline: () => ipcRenderer.invoke('learning:getOutline') as Promise<StageWithTopics[]>,
  getProgress: () => ipcRenderer.invoke('learning:getProgress') as Promise<ProgressSummary>,
  getSettings: () => ipcRenderer.invoke('learning:getSettings') as Promise<AppSettings>,
  getTopic: (topicId: string) => ipcRenderer.invoke('learning:getTopic', topicId) as Promise<TopicDetail>,
  getRoadmapGraph: () => ipcRenderer.invoke('learning:getRoadmapGraph') as Promise<RoadmapGraph>,
  updateTopicStatus: (topicId: string, status: StudyStatus) =>
    ipcRenderer.invoke('learning:updateTopicStatus', topicId, status) as Promise<TopicDetail>,
  updateTheme: (theme: AppTheme) => ipcRenderer.invoke('learning:updateTheme', theme) as Promise<AppSettings>,
  onSeedReloaded: (callback: (event: SeedReloadEvent) => void) => {
    const listener = (_event: IpcRendererEvent, payload: SeedReloadEvent) => {
      callback(payload);
    };
    ipcRenderer.on('learning:seedReloaded', listener);
    return () => {
      ipcRenderer.off('learning:seedReloaded', listener);
    };
  }
};

contextBridge.exposeInMainWorld('learning', learning);

export type LearningApi = typeof learning;
