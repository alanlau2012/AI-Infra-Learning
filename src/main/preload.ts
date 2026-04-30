import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AppSettings,
  AppTheme,
  BoundAnswer,
  GateAttemptResult,
  GateQuestion,
  ProgressSummary,
  RoadmapGraph,
  SeedReloadEvent,
  SingleAnswerResult,
  StageWithTopics,
  StudyStatus,
  TopicDetail,
  TopicGate
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
  getTopicGate: (topicId: string) =>
    ipcRenderer.invoke('learning:getTopicGate', topicId) as Promise<TopicGate | null>,
  startGateAttempt: (topicId: string) =>
    ipcRenderer.invoke('learning:startGateAttempt', topicId) as Promise<GateQuestion[]>,
  checkSingleAnswer: (topicId: string, questionId: string, answer: BoundAnswer) =>
    ipcRenderer.invoke('learning:checkSingleAnswer', topicId, questionId, answer) as Promise<SingleAnswerResult>,
  finalizeAttempt: (topicId: string, answers: Array<{ questionId: string; answer: BoundAnswer }>) =>
    ipcRenderer.invoke('learning:finalizeAttempt', topicId, answers) as Promise<GateAttemptResult>,
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
