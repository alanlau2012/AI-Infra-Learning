import { contextBridge, ipcRenderer } from 'electron';
import type { StageWithTopics, StudyStatus, TopicDetail, ProgressSummary } from '../shared/types';

const learning = {
  getOutline: () => ipcRenderer.invoke('learning:getOutline') as Promise<StageWithTopics[]>,
  getProgress: () => ipcRenderer.invoke('learning:getProgress') as Promise<ProgressSummary>,
  getTopic: (topicId: string) => ipcRenderer.invoke('learning:getTopic', topicId) as Promise<TopicDetail>,
  updateTopicStatus: (topicId: string, status: StudyStatus) =>
    ipcRenderer.invoke('learning:updateTopicStatus', topicId, status) as Promise<TopicDetail>
};

contextBridge.exposeInMainWorld('learning', learning);

export type LearningApi = typeof learning;
