import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type {
  ProgressSummary,
  RoadmapGraph,
  SeedData,
  StageWithTopics,
  StudyStatus,
  TopicDetail,
  TopicSummary
} from '../shared/types';
import { VALID_STATUSES } from './security';

const MIGRATIONS = ['001_init', '002_add_topic_body'] as const;
const SEED_MIGRATION = '001_init';

interface CountRow {
  count: number;
}

interface TopicRow {
  id: string;
  stage_id: string;
  name: string;
  sort_order: number;
  difficulty: number;
  study_time_minutes: number;
  why: string | null;
  real_world_connection: string | null;
  status: StudyStatus | null;
}

interface TopicDetailRow extends TopicRow {
  body_md: string | null;
}

interface StageRow {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface InitializeDatabaseOptions {
  dbPath: string;
  seedData: SeedData;
  migrationsDir?: string;
}

export function initializeDatabase(options: InitializeDatabaseOptions) {
  fs.mkdirSync(path.dirname(options.dbPath), { recursive: true });
  const db = new Database(options.dbPath);
  db.pragma('foreign_keys = ON');

  try {
    runPendingMigrations(db, options.seedData, options.migrationsDir);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

export function getOutline(db: Database.Database): StageWithTopics[] {
  const stages = db
    .prepare('select id, name, description, sort_order from stages order by sort_order')
    .all() as StageRow[];
  const topics = db
    .prepare(
      `select
        topics.id,
        topics.stage_id,
        topics.name,
        topics.sort_order,
        topics.difficulty,
        topics.study_time_minutes,
        topics.why,
        topics.real_world_connection,
        coalesce(topic_progress.status, 'not_started') as status
      from topics
      left join topic_progress on topic_progress.topic_id = topics.id
      where topics.is_deleted = 0
      order by topics.stage_id, topics.sort_order`
    )
    .all() as TopicRow[];

  return stages.map((stage) => ({
    id: stage.id,
    name: stage.name,
    description: stage.description,
    sortOrder: stage.sort_order,
    topics: topics.filter((topic) => topic.stage_id === stage.id).map(toTopicSummary)
  }));
}

export function getTopic(db: Database.Database, topicId: string): TopicDetail {
  assertTopicId(topicId);
  const row = db
    .prepare(
      `select
        topics.id,
        topics.stage_id,
        topics.name,
        topics.sort_order,
        topics.difficulty,
        topics.study_time_minutes,
        topics.why,
        topics.real_world_connection,
        topics.body_md,
        coalesce(topic_progress.status, 'not_started') as status
      from topics
      left join topic_progress on topic_progress.topic_id = topics.id
      where topics.id = ? and topics.is_deleted = 0`
    )
    .get(topicId) as TopicDetailRow | undefined;

  if (!row) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  const keyPoints = db
    .prepare('select content from key_points where topic_id = ? order by sort_order')
    .all(topicId)
    .map((point) => (point as { content: string }).content);

  const prerequisites = db
    .prepare(
      `select
        topics.id,
        topics.stage_id,
        topics.name,
        topics.sort_order,
        topics.difficulty,
        topics.study_time_minutes,
        topics.why,
        topics.real_world_connection,
        coalesce(topic_progress.status, 'not_started') as status
      from prerequisites
      join topics on topics.id = prerequisites.prerequisite_id
      left join topic_progress on topic_progress.topic_id = topics.id
      where prerequisites.topic_id = ?
        and topics.is_deleted = 0
      order by topics.id`
    )
    .all(topicId)
    .map((topic) => toTopicSummary(topic as TopicRow));

  return {
    ...toTopicSummary(row),
    why: row.why,
    realWorldConnection: row.real_world_connection,
    keyPoints,
    prerequisites,
    bodyMd: row.body_md
  };
}

export function updateTopicStatus(
  db: Database.Database,
  topicId: string,
  status: string
): TopicDetail {
  assertTopicId(topicId);
  if (!VALID_STATUSES.has(status as StudyStatus)) {
    throw new Error(`Invalid status: ${status}`);
  }

  const exists = db.prepare('select 1 from topics where id = ? and is_deleted = 0').get(topicId);
  if (!exists) {
    throw new Error(`Topic not found: ${topicId}`);
  }

  db.prepare(
    `insert into topic_progress (topic_id, status, updated_at)
     values (?, ?, CURRENT_TIMESTAMP)
     on conflict(topic_id) do update set
       status = excluded.status,
       updated_at = CURRENT_TIMESTAMP`
  ).run(topicId, status);

  return getTopic(db, topicId);
}

export function getRoadmapGraph(db: Database.Database, mainTrack: string[]): RoadmapGraph {
  const rows = db
    .prepare('select prerequisite_id as "from", topic_id as "to" from prerequisites')
    .all() as Array<{ from: string; to: string }>;

  return {
    edges: rows,
    mainTrack: [...mainTrack]
  };
}

export function getProgress(db: Database.Database): ProgressSummary {
  const rows = db
    .prepare(
      `select
        stages.id as stageId,
        stages.name as stageName,
        count(topics.id) as totalTopics,
        sum(case when coalesce(topic_progress.status, 'not_started') = 'completed' then 1 else 0 end) as completedTopics,
        sum(case when coalesce(topic_progress.status, 'not_started') = 'in_progress' then 1 else 0 end) as inProgressTopics
      from stages
      left join topics on topics.stage_id = stages.id and topics.is_deleted = 0
      left join topic_progress on topic_progress.topic_id = topics.id
      group by stages.id
      order by stages.sort_order`
    )
    .all() as Array<{
      stageId: string;
      stageName: string;
      totalTopics: number;
      completedTopics: number;
      inProgressTopics: number;
    }>;

  const totalTopics = rows.reduce((sum, row) => sum + row.totalTopics, 0);
  const completedTopics = rows.reduce((sum, row) => sum + row.completedTopics, 0);
  const inProgressTopics = rows.reduce((sum, row) => sum + row.inProgressTopics, 0);

  return {
    totalTopics,
    completedTopics,
    inProgressTopics,
    notStartedTopics: totalTopics - completedTopics - inProgressTopics,
    stageProgress: rows.map((row) => ({
      stageId: row.stageId,
      stageName: row.stageName,
      totalTopics: row.totalTopics,
      completedTopics: row.completedTopics
    }))
  };
}

function runPendingMigrations(db: Database.Database, seedData: SeedData, migrationsDir?: string) {
  const dir = migrationsDir ?? path.resolve(process.cwd(), 'migrations');
  const applied = readAppliedMigrations(db);

  // 校验 seed 一次性完成（即便不需要 seed 这个版本，也提前发现脏数据）。
  if (!applied.has(SEED_MIGRATION)) {
    validateSeed(seedData);
  }

  for (const version of MIGRATIONS) {
    if (applied.has(version)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, `${version}.sql`), 'utf8');

    db.transaction(() => {
      db.exec(sql);
      if (version === SEED_MIGRATION) {
        insertSeedData(db, seedData);
      }
      db.prepare('insert into schema_migrations (version) values (?)').run(version);
    })();
  }
}

function readAppliedMigrations(db: Database.Database): Set<string> {
  const hasTable = db
    .prepare("select count(*) as count from sqlite_master where type = 'table' and name = 'schema_migrations'")
    .get() as CountRow;
  if (hasTable.count === 0) {
    return new Set();
  }

  const rows = db.prepare('select version from schema_migrations').all() as Array<{ version: string }>;
  return new Set(rows.map((row) => row.version));
}

function insertSeedData(db: Database.Database, seedData: SeedData) {
  const insertStage = db.prepare(
    'insert into stages (id, name, description, sort_order) values (?, ?, ?, ?)'
  );
  for (const stage of seedData.stages) {
    insertStage.run(stage.id, stage.name, stage.description ?? null, stage.sort_order);
  }

  const insertTopic = db.prepare(
    `insert into topics (
      id,
      stage_id,
      name,
      sort_order,
      difficulty,
      study_time_minutes,
      why,
      real_world_connection
    ) values (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const topic of seedData.topics) {
    insertTopic.run(
      topic.id,
      topic.stage_id,
      topic.name,
      topic.sort_order,
      topic.difficulty,
      topic.study_time_minutes,
      topic.why,
      topic.real_world_connection
    );
  }

  const insertKeyPoint = db.prepare(
    'insert into key_points (topic_id, content, sort_order) values (?, ?, ?)'
  );
  const insertPrerequisite = db.prepare(
    'insert into prerequisites (topic_id, prerequisite_id) values (?, ?)'
  );

  for (const topic of seedData.topics) {
    topic.key_points.forEach((point, index) => insertKeyPoint.run(topic.id, point, index + 1));
    topic.prerequisites.forEach((prerequisiteId) => insertPrerequisite.run(topic.id, prerequisiteId));
  }
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

function assertTopicId(topicId: string) {
  if (!/^T\d{2,}$/.test(topicId)) {
    throw new Error(`Invalid topicId: ${topicId}`);
  }
}

function toTopicSummary(row: TopicRow): TopicSummary {
  return {
    id: row.id,
    stageId: row.stage_id,
    name: row.name,
    sortOrder: row.sort_order,
    difficulty: row.difficulty,
    studyTimeMinutes: row.study_time_minutes,
    status: row.status ?? 'not_started'
  };
}
