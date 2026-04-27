import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import seed from '../resources/seed_data.json';
import { createLearningStore } from '../src/main/learningStore';

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-infra-learning-test-'));
  tempDirs.push(dir);
  return dir;
}

function makeProgressPath() {
  return path.join(makeTempDir(), 'progress.json');
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('learning store', () => {
  it('loads the complete seed outline and topic details without SQLite', () => {
    const store = createLearningStore({ seedData: seed, progressPath: makeProgressPath() });

    const outline = store.getOutline();
    const topic = store.getTopic('T01');
    const progress = store.getProgress();

    expect(outline).toHaveLength(4);
    expect(outline[0].topics[0].id).toBe('T01');
    expect(outline.flatMap((stage) => stage.topics)).toHaveLength(21);
    expect(topic.name).toContain('Compute-bound');
    expect(topic.keyPoints).toHaveLength(seed.topics[0].key_points.length);
    expect(topic.bodyMd).toContain('所有推理优化决策的根基');
    expect(topic.bodyMd).not.toMatch(/\?{4,}/);
    expect(topic.status).toBe('not_started');
    expect(progress.totalTopics).toBe(21);
    expect(progress.completedTopics).toBe(0);
  });

  it('persists topic progress to progress.json across store reinitialization', () => {
    const progressPath = makeProgressPath();
    const store = createLearningStore({ seedData: seed, progressPath });

    const updated = store.updateTopicStatus('T01', 'completed');
    const reopened = createLearningStore({ seedData: seed, progressPath });

    expect(updated.status).toBe('completed');
    expect(reopened.getTopic('T01').status).toBe('completed');
    expect(reopened.getProgress().completedTopics).toBe(1);
    expect(JSON.parse(fs.readFileSync(progressPath, 'utf8'))).toEqual({
      version: 1,
      topicStatus: {
        T01: 'completed'
      }
    });
  });

  it('ignores corrupt progress files and overwrites them on the next update', () => {
    const progressPath = makeProgressPath();
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.writeFileSync(progressPath, '{ broken json', 'utf8');

    const store = createLearningStore({ seedData: seed, progressPath });

    expect(store.getTopic('T01').status).toBe('not_started');
    store.updateTopicStatus('T02', 'in_progress');

    expect(JSON.parse(fs.readFileSync(progressPath, 'utf8'))).toEqual({
      version: 1,
      topicStatus: {
        T02: 'in_progress'
      }
    });
  });

  it('filters unknown topics and invalid statuses from progress files', () => {
    const progressPath = makeProgressPath();
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.writeFileSync(
      progressPath,
      JSON.stringify({
        version: 1,
        topicStatus: {
          T01: 'completed',
          T02: 'done',
          T99: 'completed'
        }
      }),
      'utf8'
    );

    const store = createLearningStore({ seedData: seed, progressPath });

    expect(store.getTopic('T01').status).toBe('completed');
    expect(store.getTopic('T02').status).toBe('not_started');
    expect(store.getProgress().completedTopics).toBe(1);
  });

  it('rejects invalid topic ids, missing topics, invalid statuses, and invalid seed references', () => {
    const store = createLearningStore({ seedData: seed, progressPath: makeProgressPath() });

    expect(() => store.getTopic('bad')).toThrow(/Invalid topicId/);
    expect(() => store.getTopic('T99')).toThrow(/Topic not found/);
    expect(() => store.updateTopicStatus('T01', 'done')).toThrow(/Invalid status/);
    expect(() =>
      createLearningStore({
        progressPath: makeProgressPath(),
        seedData: {
          ...seed,
          topics: seed.topics.map((topic) =>
            topic.id === 'T02' ? { ...topic, prerequisites: ['DOES_NOT_EXIST'] } : topic
          )
        }
      })
    ).toThrow(/prerequisite/i);
  });

  it('builds the roadmap graph from seed prerequisites and main track metadata', () => {
    const store = createLearningStore({ seedData: seed, progressPath: makeProgressPath() });

    const graph = store.getRoadmapGraph();

    expect(graph.mainTrack).toEqual(seed.learning_paths?.main_track?.sequence);
    expect(graph.edges).toContainEqual({ from: 'T01', to: 'T02' });
    expect(graph.edges).toContainEqual({ from: 'T17', to: 'T18' });
  });
});
