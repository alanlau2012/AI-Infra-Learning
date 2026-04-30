export type StudyStatus = 'not_started' | 'in_progress' | 'completed';

export type SourceConfidence = 'high' | 'medium' | 'low';

export type AppTheme = 'light' | 'dark';

export interface AppSettings {
  theme: AppTheme;
}

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
  /** 可选 gate 配置：含 hardwarePresets / scenarios / attemptConfig；
   * 配置存在时该 Topic 进入"判断力检验"路径。renderer 拿到的是 TopicGate
   * （不含 correctAnswer / explanation 字段）。 */
  gate?: SeedTopicGate;
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

export type GateStatus = 'not_attempted' | 'passed' | 'failed';

export type BoundAnswer = 'compute' | 'memory';

export interface HardwarePreset {
  id: string;
  name: string;
  peakTflops: number;
  bandwidthTBs: number;
  color: string;
  lineStyle?: 'solid' | 'dashed';
  isDefault?: boolean;
  isComparisonDefault?: boolean;
}

export interface ExploreScenario {
  id: string;
  name: string;
  ai: number;
  category: 'prefill' | 'decode' | 'mixed';
  tags: string[];
}

/** Renderer-facing question. The expected `ai`, `correctAnswer`, and
 * `explanation` are kept in main; only revealed via `checkSingleAnswer`. */
export interface GateQuestion {
  id: string;
  name: string;
  hardwareId: string;
  category: 'prefill' | 'decode' | 'mixed';
  tags: string[];
}

export interface GateAttemptConfig {
  questionsPerAttempt: number;
  passingThreshold: number;
}

export interface SingleAnswerResult {
  questionId: string;
  correct: boolean;
  correctAnswer: BoundAnswer;
  explanation: string;
  operatingPoint: { ai: number; perfTflops: number };
}

export interface GateAttemptResult {
  passed: boolean;
  correctCount: number;
  total: number;
}

export interface TopicGate {
  componentId: 'roofline-chart';
  hardwarePresets: HardwarePreset[];
  exploreScenarios: ExploreScenario[];
  attemptConfig: GateAttemptConfig;
  status: GateStatus;
  lastAttempt: { correctCount: number; total: number; completedAt: string } | null;
  attempts: number;
}

/** Seed-side scenario record. Includes the answer key, never sent to renderer
 * via `getTopicGate`. */
export interface SeedGateScenario extends ExploreScenario {
  correctAnswer: BoundAnswer;
  explanation: string;
}

export interface SeedTopicGate {
  componentId: 'roofline-chart';
  hardwarePresets: HardwarePreset[];
  scenarios: SeedGateScenario[];
  attemptConfig: GateAttemptConfig;
  /** Optional explicit binding of scenario → hardware for gate questions.
   * If omitted, falls back to the default hardware. */
  questionHardwareBindings?: Record<string, string>;
}
