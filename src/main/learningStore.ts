import fs from 'node:fs';
import path from 'node:path';
import type {
  BoundAnswer,
  GateAttemptResult,
  GateQuestion,
  GateStatus,
  ProgressSummary,
  RoadmapGraph,
  SeedData,
  SeedTopic,
  SeedTopicGate,
  SingleAnswerResult,
  StageWithTopics,
  StudyStatus,
  TopicDetail,
  TopicGate,
  TopicSource,
  TopicSummary
} from '../shared/types';
import { VALID_STATUSES } from './security';

const PROGRESS_VERSION = 2;

interface TopicGateRecord {
  status: GateStatus;
  lastAttempt: { correctCount: number; total: number; completedAt: string } | null;
  attempts: number;
}

interface ProgressFile {
  version: number;
  topicStatus: Record<string, StudyStatus>;
  topicGate: Record<string, TopicGateRecord>;
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
  getTopicGate: (topicId: string) => TopicGate | null;
  startGateAttempt: (topicId: string) => GateQuestion[];
  checkSingleAnswer: (topicId: string, questionId: string, answer: BoundAnswer) => SingleAnswerResult;
  finalizeAttempt: (topicId: string, answers: Array<{ questionId: string; answer: BoundAnswer }>) => GateAttemptResult;
}

export function createLearningStore(options: LearningStoreOptions): LearningStore {
  validateSeed(options.seedData);

  const initial = loadProgress(options.progressPath, options.seedData);
  const state = {
    seedData: options.seedData,
    progressPath: options.progressPath,
    topicStatus: initial.topicStatus,
    topicGate: initial.topicGate
  };

  function persist() {
    saveProgress(state.progressPath, state.topicStatus, state.topicGate);
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
    },

    getTopicGate: (topicId: string) => {
      assertTopicId(topicId);
      const topic = findTopic(state.seedData, topicId);
      if (!topic || !topic.gate) {
        return null;
      }
      return projectTopicGate(topic.gate, state.topicGate[topicId]);
    },

    startGateAttempt: (topicId: string) => {
      assertTopicId(topicId);
      const seedGate = requireSeedGate(state.seedData, topicId);
      const questions = sampleGateQuestions(seedGate);

      const prior = state.topicGate[topicId];
      state.topicGate = {
        ...state.topicGate,
        [topicId]: {
          status: prior?.status ?? 'not_attempted',
          lastAttempt: prior?.lastAttempt ?? null,
          attempts: (prior?.attempts ?? 0) + 1
        }
      };
      persist();

      return questions.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        hardwareId: resolveHardwareId(seedGate, scenario.id),
        category: scenario.category,
        tags: [...scenario.tags]
      }));
    },

    checkSingleAnswer: (topicId: string, questionId: string, answer: BoundAnswer) => {
      assertTopicId(topicId);
      const seedGate = requireSeedGate(state.seedData, topicId);
      const scenario = seedGate.scenarios.find((s) => s.id === questionId);
      if (!scenario) {
        throw new Error(`Unknown gate questionId: ${questionId}`);
      }
      if (answer !== 'compute' && answer !== 'memory') {
        throw new Error(`Invalid answer: ${String(answer)}`);
      }
      const hardwareId = resolveHardwareId(seedGate, questionId);
      const hw = seedGate.hardwarePresets.find((h) => h.id === hardwareId) ?? seedGate.hardwarePresets[0];
      const perfTflops = Math.min(hw.peakTflops, hw.bandwidthTBs * scenario.ai);
      return {
        questionId,
        correct: answer === scenario.correctAnswer,
        correctAnswer: scenario.correctAnswer,
        explanation: scenario.explanation,
        operatingPoint: { ai: scenario.ai, perfTflops }
      };
    },

    finalizeAttempt: (topicId: string, answers) => {
      assertTopicId(topicId);
      const topic = requireTopicWithGate(state.seedData, topicId);
      const seedGate = topic.gate as SeedTopicGate;
      if (!Array.isArray(answers)) {
        throw new Error('answers must be an array');
      }
      if (answers.length !== seedGate.attemptConfig.questionsPerAttempt) {
        throw new Error(
          `Expected ${seedGate.attemptConfig.questionsPerAttempt} answers, got ${answers.length}`
        );
      }
      const seen = new Set<string>();
      let correctCount = 0;
      for (const entry of answers) {
        if (!entry || typeof entry.questionId !== 'string') {
          throw new Error('Invalid answer entry');
        }
        if (seen.has(entry.questionId)) {
          throw new Error(`Duplicate questionId: ${entry.questionId}`);
        }
        seen.add(entry.questionId);
        const scenario = seedGate.scenarios.find((s) => s.id === entry.questionId);
        if (!scenario) {
          throw new Error(`Unknown questionId: ${entry.questionId}`);
        }
        if (entry.answer !== 'compute' && entry.answer !== 'memory') {
          throw new Error(`Invalid answer for ${entry.questionId}`);
        }
        if (entry.answer === scenario.correctAnswer) {
          correctCount += 1;
        }
      }

      const total = seedGate.attemptConfig.questionsPerAttempt;
      const passed = correctCount >= seedGate.attemptConfig.passingThreshold;
      const prior = state.topicGate[topicId];
      const nextStatus: GateStatus = passed ? 'passed' : prior?.status === 'passed' ? 'passed' : 'failed';

      state.topicGate = {
        ...state.topicGate,
        [topicId]: {
          status: nextStatus,
          lastAttempt: {
            correctCount,
            total,
            completedAt: new Date().toISOString()
          },
          attempts: prior?.attempts ?? 1
        }
      };

      if (passed) {
        state.topicStatus = {
          ...state.topicStatus,
          [topicId]: 'completed'
        };
      }
      persist();

      return { passed, correctCount, total };
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
): { topicStatus: Record<string, StudyStatus>; topicGate: Record<string, TopicGateRecord> } {
  if (!fs.existsSync(progressPath)) {
    return { topicStatus: {}, topicGate: {} };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(progressPath, 'utf8')) as Partial<ProgressFile>;
    const topicIds = new Set(seedData.topics.map((topic) => topic.id));

    const topicStatusEntries = Object.entries(parsed.topicStatus ?? {}).filter(
      ([topicId, status]) => topicIds.has(topicId) && VALID_STATUSES.has(status as StudyStatus)
    ) as Array<[string, StudyStatus]>;

    // v1 had no topicGate field — silently treat as v2 with empty gates.
    const topicGateEntries = Object.entries(parsed.topicGate ?? {}).filter(
      ([topicId, value]) => topicIds.has(topicId) && isTopicGateRecord(value)
    ) as Array<[string, TopicGateRecord]>;

    return {
      topicStatus: Object.fromEntries(topicStatusEntries),
      topicGate: Object.fromEntries(topicGateEntries)
    };
  } catch {
    return { topicStatus: {}, topicGate: {} };
  }
}

function isTopicGateRecord(value: unknown): value is TopicGateRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    (v.status === 'not_attempted' || v.status === 'passed' || v.status === 'failed') &&
    (v.lastAttempt === null || (typeof v.lastAttempt === 'object' && v.lastAttempt !== null)) &&
    typeof v.attempts === 'number'
  );
}

function saveProgress(
  progressPath: string,
  topicStatus: Record<string, StudyStatus>,
  topicGate: Record<string, TopicGateRecord>
) {
  fs.mkdirSync(path.dirname(progressPath), { recursive: true });
  const progress: ProgressFile = {
    version: PROGRESS_VERSION,
    topicStatus,
    topicGate
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

    if (topic.gate) {
      validateGate(topic.id, topic.gate);
    }
  }
}

function validateGate(topicId: string, gate: SeedTopicGate) {
  if (!Array.isArray(gate.hardwarePresets) || gate.hardwarePresets.length === 0) {
    throw new Error(`Topic ${topicId}: gate.hardwarePresets must be a non-empty array`);
  }
  if (!Array.isArray(gate.scenarios) || gate.scenarios.length < gate.attemptConfig.questionsPerAttempt) {
    throw new Error(
      `Topic ${topicId}: gate.scenarios needs at least ${gate.attemptConfig.questionsPerAttempt} entries`
    );
  }
  const hwIds = new Set(gate.hardwarePresets.map((h) => h.id));
  for (const scenario of gate.scenarios) {
    if (scenario.correctAnswer !== 'compute' && scenario.correctAnswer !== 'memory') {
      throw new Error(`Topic ${topicId}: scenario ${scenario.id} has invalid correctAnswer`);
    }
  }
  if (gate.questionHardwareBindings) {
    for (const [, hwId] of Object.entries(gate.questionHardwareBindings)) {
      if (!hwIds.has(hwId)) {
        throw new Error(`Topic ${topicId}: questionHardwareBindings references unknown hw ${hwId}`);
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

function projectTopicGate(seedGate: SeedTopicGate, record: TopicGateRecord | undefined): TopicGate {
  return {
    componentId: seedGate.componentId,
    hardwarePresets: seedGate.hardwarePresets.map((hw) => ({ ...hw })),
    exploreScenarios: seedGate.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      ai: scenario.ai,
      category: scenario.category,
      tags: [...scenario.tags]
    })),
    attemptConfig: { ...seedGate.attemptConfig },
    status: record?.status ?? 'not_attempted',
    lastAttempt: record?.lastAttempt ?? null,
    attempts: record?.attempts ?? 0
  };
}

function requireSeedGate(seedData: SeedData, topicId: string): SeedTopicGate {
  return requireTopicWithGate(seedData, topicId).gate as SeedTopicGate;
}

function requireTopicWithGate(seedData: SeedData, topicId: string): SeedTopic {
  const topic = findTopic(seedData, topicId);
  if (!topic) {
    throw new Error(`Topic not found: ${topicId}`);
  }
  if (!topic.gate) {
    throw new Error(`Topic ${topicId} has no gate configuration`);
  }
  return topic;
}

function sampleGateQuestions(seedGate: SeedTopicGate) {
  const k = seedGate.attemptConfig.questionsPerAttempt;
  const all = [...seedGate.scenarios];
  // Fisher-Yates shuffle for sampling without replacement.
  for (let i = all.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, k);
}

function resolveHardwareId(seedGate: SeedTopicGate, questionId: string): string {
  const explicit = seedGate.questionHardwareBindings?.[questionId];
  if (explicit) {
    return explicit;
  }
  const defaultHw = seedGate.hardwarePresets.find((h) => h.isDefault) ?? seedGate.hardwarePresets[0];
  return defaultHw.id;
}
