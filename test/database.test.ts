import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import seed from '../resources/seed_data.json';
import {
  getOutline,
  getProgress,
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
  it('initializes the complete seed data and migration marker in one fresh database', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');

    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(db.prepare('select count(*) as count from stages').get()).toEqual({ count: 4 });
    expect(db.prepare('select count(*) as count from topics').get()).toEqual({ count: 21 });
    expect(db.prepare('select count(*) as count from schema_migrations').get()).toEqual({ count: 1 });
    expect(db.prepare('select count(*) as count from key_points where topic_id = ?').get('T01')).toEqual({
      count: seed.topics.find((topic) => topic.id === 'T01')?.key_points.length
    });
    expect(db.prepare('select prerequisite_id from prerequisites where topic_id = ?').all('T02')).toEqual([
      { prerequisite_id: 'T01' }
    ]);

    db.close();
  });

  it('does not duplicate seed rows when initialized repeatedly', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');

    initializeDatabase({ dbPath, seedData: seed }).close();
    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(db.prepare('select count(*) as count from topics').get()).toEqual({ count: 21 });
    expect(db.prepare('select count(*) as count from schema_migrations').get()).toEqual({ count: 1 });

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

  it('rejects invalid topic ids and invalid statuses before writing', () => {
    const dir = makeTempDir();
    const dbPath = path.join(dir, 'data.db');
    const db = initializeDatabase({ dbPath, seedData: seed });

    expect(() => getTopic(db, 'BAD')).toThrow(/topicId/i);
    expect(() => updateTopicStatus(db, 'T01', 'done')).toThrow(/status/i);
    expect(() => updateTopicStatus(db, 'T99', 'completed')).toThrow(/not found/i);

    db.close();
  });
});
