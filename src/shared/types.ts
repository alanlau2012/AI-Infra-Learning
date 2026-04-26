export type StudyStatus = 'not_started' | 'in_progress' | 'completed';

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
