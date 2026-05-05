import fs from 'node:fs';
import path from 'node:path';
import type {
  ProgressSummary,
  RoadmapGraph,
  SeedData,
  SeedTopic,
  StageWithTopics,
  StudyStatus,
  TopicDetail,
  TopicSource,
  TopicSummary
} from '../shared/types';
import { VALID_STATUSES } from './security';

const PROGRESS_VERSION = 2;

interface ProgressFile {
  version: number;
  topicStatus: Record<string, StudyStatus>;
}

export interface LearningStoreOptions {
  seedData: SeedData;
  progressPath: string;
}

export interface LearningStore {
  getOutline: () => StageWithTopics[];
  getProgress: () => ProgressSummary;
  getRoadmapGraph: () => RoadmapGraph;
  getTopic: (topicId: string) => TopicDetail;
  updateTopicStatus: (topicId: string, status: string) => TopicDetail;
}

export function createLearningStore(options: LearningStoreOptions): LearningStore {
  validateSeed(options.seedData);

  const initial = loadProgress(options.progressPath, options.seedData);
  const state = {
    seedData: options.seedData,
    progressPath: options.progressPath,
    topicStatus: initial.topicStatus
  };

  function persist() {
    saveProgress(state.progressPath, state.topicStatus);
  }

  return {
    getOutline: () => getOutline(state.seedData, state.topicStatus),
    getProgress: () => getProgress(state.seedData, state.topicStatus),
    getRoadmapGraph: () => getRoadmapGraph(state.seedData),
    getTopic: (topicId: string) => getTopic(state.seedData, state.topicStatus, topicId),
    updateTopicStatus: (topicId: string, status: string) => {
      assertTopicId(topicId);
      if (!VALID_STATUSES.has(status as StudyStatus)) {
        throw new Error(`Invalid status: ${status}`);
      }
      const topic = findTopic(state.seedData, topicId);
      if (!topic) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      state.topicStatus = {
        ...state.topicStatus,
        [topicId]: status as StudyStatus
      };
      persist();

      return getTopic(state.seedData, state.topicStatus, topicId);
    }
  };
}

function getOutline(seedData: SeedData, topicStatus: Record<string, StudyStatus>): StageWithTopics[] {
  const topicsByStage = sortedTopics(seedData);

  return [...seedData.stages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((stage) => ({
      id: stage.id,
      name: stage.name,
      description: stage.description ?? null,
      sortOrder: stage.sort_order,
      topics: (topicsByStage.get(stage.id) ?? []).map((topic) => toTopicSummary(topic, topicStatus))
    }));
}

function getTopic(seedData: SeedData, topicStatus: Record<string, StudyStatus>, topicId: string): TopicDetail {
  assertTopicId(topicId);
  const topic = findTopic(seedData, topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  return {
    ...toTopicSummary(topic, topicStatus),
    why: topic.why,
    realWorldConnection: topic.real_world_connection,
    keyPoints: [...topic.key_points],
    prerequisites: topic.prerequisites.map((id) => {
      const prerequisite = findTopic(seedData, id);
      if (!prerequisite) {
        throw new Error(`Invalid prerequisite for topic ${topic.id}: ${id}`);
      }
      return toTopicSummary(prerequisite, topicStatus);
    }),
    bodyMd: getTopicBody(topic),
    sources: cloneSources(topic.sources)
  };
}

function cloneSources(sources: TopicSource[] | undefined): TopicSource[] {
  if (!sources || sources.length === 0) {
    return [];
  }
  return sources.map((source) => ({
    ...source,
    covers: [...source.covers]
  }));
}

function getRoadmapGraph(seedData: SeedData): RoadmapGraph {
  return {
    edges: seedData.topics.flatMap((topic) =>
      topic.prerequisites.map((prerequisiteId) => ({ from: prerequisiteId, to: topic.id }))
    ),
    mainTrack: [...(seedData.learning_paths?.main_track?.sequence ?? [])]
  };
}

function getProgress(seedData: SeedData, topicStatus: Record<string, StudyStatus>): ProgressSummary {
  const outline = getOutline(seedData, topicStatus);
  const allTopics = outline.flatMap((stage) => stage.topics);
  const completedTopics = allTopics.filter((topic) => topic.status === 'completed').length;
  const inProgressTopics = allTopics.filter((topic) => topic.status === 'in_progress').length;

  return {
    totalTopics: allTopics.length,
    completedTopics,
    inProgressTopics,
    notStartedTopics: allTopics.length - completedTopics - inProgressTopics,
    stageProgress: outline.map((stage) => ({
      stageId: stage.id,
      stageName: stage.name,
      totalTopics: stage.topics.length,
      completedTopics: stage.topics.filter((topic) => topic.status === 'completed').length
    }))
  };
}

function loadProgress(
  progressPath: string,
  seedData: SeedData
): { topicStatus: Record<string, StudyStatus> } {
  if (!fs.existsSync(progressPath)) {
    return { topicStatus: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(progressPath, 'utf8')) as Partial<ProgressFile>;
    const topicIds = new Set(seedData.topics.map((topic) => topic.id));

    const topicStatusEntries = Object.entries(parsed.topicStatus ?? {}).filter(
      ([topicId, status]) => topicIds.has(topicId) && VALID_STATUSES.has(status as StudyStatus)
    ) as Array<[string, StudyStatus]>;

    return {
      topicStatus: Object.fromEntries(topicStatusEntries)
    };
  } catch {
    return { topicStatus: {} };
  }
}

function saveProgress(progressPath: string, topicStatus: Record<string, StudyStatus>) {
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  const progress: ProgressFile = {
    version: PROGRESS_VERSION,
    topicStatus
  };
  fs.writeFileSync(progressPath, `${JSON.stringify(progress, null, 2)}\n`, 'utf8');
}

function validateSeed(seedData: SeedData) {
  const stageIds = new Set(seedData.stages.map((stage) => stage.id));
  const topicIds = new Set(seedData.topics.map((topic) => topic.id));

  for (const topic of seedData.topics) {
    if (!stageIds.has(topic.stage_id)) {
      throw new Error(`Invalid stage reference for topic ${topic.id}: ${topic.stage_id}`);
    }

    for (const prerequisiteId of topic.prerequisites) {
      if (!topicIds.has(prerequisiteId)) {
        throw new Error(`Invalid prerequisite for topic ${topic.id}: ${prerequisiteId}`);
      }
    }
  }
}

function sortedTopics(seedData: SeedData) {
  const topicsByStage = new Map<string, SeedTopic[]>();
  for (const topic of seedData.topics) {
    const topics = topicsByStage.get(topic.stage_id) ?? [];
    topics.push(topic);
    topicsByStage.set(topic.stage_id, topics);
  }

  for (const topics of topicsByStage.values()) {
    topics.sort((a, b) => a.sort_order - b.sort_order);
  }

  return topicsByStage;
}

function findTopic(seedData: SeedData, topicId: string) {
  return seedData.topics.find((topic) => topic.id === topicId);
}

function getTopicBody(topic: SeedTopic): string {
  const body = topic.body_md?.trim();
  if (body && !hasReplacementLikeQuestionRuns(body)) {
    return body;
  }

  return [
    '## 为什么重要',
    '',
    topic.why,
    '',
    '## 核心要点',
    '',
    ...topic.key_points.map((point) => `- ${point}`),
    '',
    '## 实战关联',
    '',
    topic.real_world_connection
  ].join('\n');
}

function hasReplacementLikeQuestionRuns(value: string) {
  return /\?{4,}/.test(value);
}

function assertTopicId(topicId: string) {
  if (!/^T\d{2,}$/.test(topicId)) {
    throw new Error(`Invalid topicId: ${topicId}`);
  }
}

function toTopicSummary(topic: SeedTopic, topicStatus: Record<string, StudyStatus>): TopicSummary {
  return {
    id: topic.id,
    stageId: topic.stage_id,
    name: topic.name,
    sortOrder: topic.sort_order,
    difficulty: topic.difficulty,
    studyTimeMinutes: topic.study_time_minutes,
    status: topicStatus[topic.id] ?? 'not_started'
  };
}

