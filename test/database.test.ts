import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import seed from '../resources/seed_data.json';
import {
  getOutline,
  getProgress,
  getRoadmapGraph,
  getTopic,
  initializeDatabase,
  updateTopicStatus
} from '../src/main/database';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-infra-learning-test-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('database initialization', () => {
  it('initializes the complete seed data and migration markers in one fresh database', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');

    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(db.prepare('select count(*) as count from stages').get()).toEqual({ count: 4 });
    expect(db.prepare('select count(*) as count from topics').get()).toEqual({ count: 21 });
    expect(db.prepare('select count(*) as count from schema_migrations').get()).toEqual({ count: 2 });
    expect(db.prepare('select count(*) as count from key_points where topic_id = ?').get('T01')).toEqual({
      count: seed.topics.find((topic) => topic.id === 'T01')?.key_points.length
    });
    expect(db.prepare('select prerequisite_id from prerequisites where topic_id = ?').all('T02')).toEqual([
      { prerequisite_id: 'T01' }
    ]);

    const columns = db.prepare("pragma table_info(topics)").all() as Array<{ name: string }>;
    expect(columns.some((col) => col.name === 'body_md')).toBe(true);

    db.close();
  });

  it('does not duplicate seed rows when initialized repeatedly', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');

    initializeDatabase({ dbPath, seedData: seed }).close();
    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(db.prepare('select count(*) as count from topics').get()).toEqual({ count: 21 });
    expect(db.prepare('select count(*) as count from schema_migrations').get()).toEqual({ count: 2 });

    db.close();
  });

  it('skips migrations whose version marker already exists (idempotency by marker)', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');

    // 完整初始化（应用了 001 + 002）。
    initializeDatabase({ dbPath, seedData: seed }).close();

    // 删除 002 marker，但保留已加上的 body_md 列；再次初始化时 runner 会把 002 当作 pending
    // 并尝试再跑一次 ALTER，因为列已存在所以应抛出 duplicate column 错误。
    // 这反向证明 runner 完全由 marker 驱动是否执行。
    {
      const db = new Database(dbPath);
      db.prepare("delete from schema_migrations where version = '002_add_topic_body'").run();
      db.close();
    }

    expect(() => initializeDatabase({ dbPath, seedData: seed })).toThrow(/duplicate column|already exists/i);
  });

  it('persists topic.body_md round-trip through the database layer', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    const sample = '# Hello\n\n```python\nprint("中文")\n```\n';
    db.prepare('update topics set body_md = ? where id = ?').run(sample, 'T01');
    const row = db.prepare('select body_md from topics where id = ?').get('T01') as { body_md: string };

    expect(row.body_md).toBe(sample);
    db.close();
  });

  it('rolls back the full initial migration if seed data is invalid', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const invalidSeed = {
      ...seed,
      topics: seed.topics.map((topic) =>
        topic.id === 'T02' ? { ...topic, prerequisites: ['DOES_NOT_EXIST'] } : topic
      )
    };

    expect(() => initializeDatabase({ dbPath, seedData: invalidSeed })).toThrow(/prerequisite/i);

    const db = new Database(dbPath);
    const tables = db
      .prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%'")
      .all();
    expect(tables).toEqual([]);
    db.close();
  });
});

describe('learning queries', () => {
  it('returns outline, topic details, and progress with progress separate from topic content', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    const outline = getOutline(db);
    const topic = getTopic(db, 'T01');
    const progress = getProgress(db);

    expect(outline).toHaveLength(4);
    expect(outline[0].topics[0].id).toBe('T01');
    expect(topic.name).toContain('Compute-bound');
    expect(topic.keyPoints).toHaveLength(seed.topics[0].key_points.length);
    expect(topic.status).toBe('not_started');
    expect(progress.totalTopics).toBe(21);
    expect(progress.completedTopics).toBe(0);

    db.close();
  });

  it('persists topic progress across database reopen without mutating topic rows', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    updateTopicStatus(db, 'T01', 'completed');
    const contentRow = db.prepare('select id, name from topics where id = ?').get('T01');
    db.close();

    const reopened = initializeDatabase({ dbPath, seedData: seed });

    expect(getTopic(reopened, 'T01').status).toBe('completed');
    expect(reopened.prepare('select id, name from topics where id = ?').get('T01')).toEqual(contentRow);
    expect(getProgress(reopened).completedTopics).toBe(1);

    reopened.close();
  });

  it('returns the full roadmap graph: all prerequisite edges plus the seed main_track', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    const expectedEdgeCount = seed.topics.reduce((sum, topic) => sum + topic.prerequisites.length, 0);
    const expectedMainTrack = seed.learning_paths?.main_track?.sequence ?? [];

    const graph = getRoadmapGraph(db, expectedMainTrack);

    expect(graph.edges).toHaveLength(expectedEdgeCount);
    expect(graph.mainTrack).toEqual(expectedMainTrack);
    // 任取 T02 → T01 验证边方向（prerequisite → topic）
    expect(graph.edges).toContainEqual({ from: 'T01', to: 'T02' });

    db.close();
  });

  it('rejects invalid topic ids and invalid statuses before writing', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(() => getTopic(db, 'BAD')).toThrow(/topicId/i);
    expect(() => updateTopicStatus(db, 'T01', 'done')).toThrow(/status/i);
    expect(() => updateTopicStatus(db, 'T99', 'completed')).toThrow(/not found/i);

    db.close();
  });

  it('soft-deleted prerequisite topic is excluded from getTopic prerequisites (regression for Critical #1)', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    // T02 has T01 as its prerequisite (verified by seed data)
    const before = getTopic(db, 'T02');
    expect(before.prerequisites.some((p) => p.id === 'T01')).toBe(true);

    // Soft-delete T01
    db.prepare('update topics set is_deleted = 1 where id = ?').run('T01');

    const after = getTopic(db, 'T02');
    expect(after.prerequisites.some((p) => p.id === 'T01')).toBe(false);

    db.close();
  });

  it('soft-deleted topic is excluded from getOutline', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    const before = getOutline(db);
    const totalBefore = before.reduce((sum, stage) => sum + stage.topics.length, 0);
    expect(totalBefore).toBe(21);

    db.prepare('update topics set is_deleted = 1 where id = ?').run('T01');

    const after = getOutline(db);
    const totalAfter = after.reduce((sum, stage) => sum + stage.topics.length, 0);
    expect(totalAfter).toBe(20);
    expect(after.flatMap((s) => s.topics).some((t) => t.id === 'T01')).toBe(false);

    db.close();
  });

  it('updateTopicStatus is idempotent when called with the same status twice', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    const first = updateTopicStatus(db, 'T01', 'in_progress');
    const second = updateTopicStatus(db, 'T01', 'in_progress');

    expect(first.status).toBe('in_progress');
    expect(second.status).toBe('in_progress');
    expect(db.prepare('select count(*) as count from topic_progress where topic_id = ?').get('T01')).toEqual({
      count: 1
    });

    db.close();
  });
});
