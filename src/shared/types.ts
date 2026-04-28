export type StudyStatus = 'not_started' | 'in_progress' | 'completed';

export type SourceConfidence = 'high' | 'medium' | 'low';

/**
 * 单条权威来源记录。每条具体的事实断言（型号名、规格、数值、命名）
 * 在 body_md 里出现时，理想情况下应该有一条 TopicSource 与之对应。
 *
 * - publisher 表明来源的可信级别（如 Hugging Face / Qwen Team / arXiv / vLLM Project）
 * - last_verified 是手动核对该 URL 内容仍然支持 covers 中所述断言的日期（YYYY-MM-DD）
 * - confidence 反映该来源对 covers 内容的支撑强度
 * - covers 列出该来源支撑了 Topic 的哪些具体断言，便于后续重审定位
 */
export interface TopicSource {
  id: string;
  title: string;
  url: string;
  publisher: string;
  last_verified: string;
  confidence: SourceConfidence;
  covers: string[];
}

export interface SeedStage {
  id: string;
  name: string;
  sort_order: number;
  description?: string;
}

export interface SeedTopic {
  id: string;
  stage_id: string;
  name: string;
  sort_order: number;
  difficulty: number;
  study_time_minutes: number;
  prerequisites: string[];
  why: string;
  key_points: string[];
  real_world_connection: string;
  body_md?: string;
  /** 该 Topic 引用的权威来源清单。仅展示，不影响业务逻辑。 */
  sources?: TopicSource[];
}

export interface SeedLearningPath {
  name?: string;
  description?: string;
  sequence: string[];
}

export interface SeedData {
  stages: SeedStage[];
  topics: SeedTopic[];
  learning_paths?: Record<string, SeedLearningPath>;
  metadata?: Record<string, unknown>;
}

export interface TopicSummary {
  id: string;
  stageId: string;
  name: string;
  sortOrder: number;
  difficulty: number;
  studyTimeMinutes: number;
  status: StudyStatus;
}

export interface StageWithTopics {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  topics: TopicSummary[];
}

export interface TopicDetail extends TopicSummary {
  why: string | null;
  realWorldConnection: string | null;
  keyPoints: string[];
  prerequisites: TopicSummary[];
  bodyMd: string | null;
  /** 该 Topic 引用的权威来源清单（透传自 seed），无来源时为空数组。 */
  sources: TopicSource[];
}

export interface RoadmapEdge {
  from: string; // prerequisite topic id
  to: string;   // dependent topic id
}

export interface RoadmapGraph {
  edges: RoadmapEdge[];
  mainTrack: string[];
}

export interface ProgressSummary {
  totalTopics: number;
  completedTopics: number;
  inProgressTopics: number;
  notStartedTopics: number;
  stageProgress: Array<{
    stageId: string;
    stageName: string;
    totalTopics: number;
    completedTopics: number;
  }>;
}

export interface SeedReloadEvent {
  ok: boolean;
  reloadedAt: number;
  error?: string;
}
