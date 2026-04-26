import { contextBridge, ipcRenderer } from 'electron';
import type {
  ProgressSummary,
  RoadmapGraph,
  StageWithTopics,
  StudyStatus,
  TopicDetail
} from '../shared/types';

const learning = {
  getOutline: () => ipcRenderer.invoke('learning:getOutline') as Promise<StageWithTopics[]>,
  getProgress: () => ipcRenderer.invoke('learning:getProgress') as Promise<ProgressSummary>,
  getTopic: (topicId: string) => ipcRenderer.invoke('learning:getTopic', topicId) as Promise<TopicDetail>,
  getRoadmapGraph: () => ipcRenderer.invoke('learning:getRoadmapGraph') as Promise<RoadmapGraph>,
  updateTopicStatus: (topicId: string, status: StudyStatus) =>
    ipcRenderer.invoke('learning:updateTopicStatus', topicId, status) as Promise<TopicDetail>
};

contextBridge.exposeInMainWorld('learning', learning);

export type LearningApi = typeof learning;
