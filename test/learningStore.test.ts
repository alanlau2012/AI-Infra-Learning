import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import seed from '../resources/seed_data.json';
import { createLearningStore } from '../src/main/learningStore';
import type { SeedData } from '../src/shared/types';

const tempDirs: string[] = [];
const seedData = seed as unknown as SeedData;

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
  it('loads the Enterprise Agent Platform Skills outline and topic details without SQLite', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const outline = store.getOutline();
    const topic = store.getTopic('T01');
    const progress = store.getProgress();

    expect(outline).toHaveLength(4);
    expect(outline[0].name).toBe('平台底座与私有化基础设施');
    expect(outline[0].topics[0].id).toBe('T01');
    expect(outline.flatMap((stage) => stage.topics)).toHaveLength(15);
    expect(topic.name).toContain('企业 Agent 平台总体架构');
    expect(topic.keyPoints).toHaveLength(seedData.topics[0].key_points.length);
    expect(topic.bodyMd).toContain('Enterprise Agent Platform Builder');
    expect(topic.bodyMd).toContain('## 角色定位与问题场景');
    expect(topic.bodyMd).not.toContain('learning-asset://');
    expect(topic.status).toBe('not_started');
    expect(progress.totalTopics).toBe(15);
    expect(progress.completedTopics).toBe(0);
  });

  it('persists topic progress to progress.json across store reinitialization', () => {
    const progressPath = makeProgressPath();
    const store = createLearningStore({ seedData, progressPath });

    const updated = store.updateTopicStatus('T01', 'completed');
    const reopened = createLearningStore({ seedData, progressPath });

    expect(updated.status).toBe('completed');
    expect(reopened.getTopic('T01').status).toBe('completed');
    expect(reopened.getProgress().completedTopics).toBe(1);
    expect(JSON.parse(fs.readFileSync(progressPath, 'utf8'))).toEqual({
      version: 2,
      topicStatus: {
        T01: 'completed'
      },
      topicGate: {}
    });
  });

  it('ignores corrupt progress files and overwrites them on the next update', () => {
    const progressPath = makeProgressPath();
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.writeFileSync(progressPath, '{ broken json', 'utf8');

    const store = createLearningStore({ seedData, progressPath });

    expect(store.getTopic('T01').status).toBe('not_started');
    store.updateTopicStatus('T02', 'in_progress');

    expect(JSON.parse(fs.readFileSync(progressPath, 'utf8'))).toEqual({
      version: 2,
      topicStatus: {
        T02: 'in_progress'
      },
      topicGate: {}
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

    const store = createLearningStore({ seedData, progressPath });

    expect(store.getTopic('T01').status).toBe('completed');
    expect(store.getTopic('T02').status).toBe('not_started');
    expect(store.getProgress().completedTopics).toBe(1);
  });

  it('rejects invalid topic ids, missing topics, invalid statuses, and invalid seed references', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    expect(() => store.getTopic('bad')).toThrow(/Invalid topicId/);
    expect(() => store.getTopic('T99')).toThrow(/Topic not found/);
    expect(() => store.updateTopicStatus('T01', 'done')).toThrow(/Invalid status/);
    expect(() =>
      createLearningStore({
        progressPath: makeProgressPath(),
        seedData: {
          ...seedData,
          topics: seedData.topics.map((topic) =>
            topic.id === 'T02' ? { ...topic, prerequisites: ['DOES_NOT_EXIST'] } : topic
          )
        }
      })
    ).toThrow(/prerequisite/i);
  });

  it('builds the roadmap graph from new seed prerequisites and main track metadata', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const graph = store.getRoadmapGraph();

    expect(graph.mainTrack).toEqual(seedData.learning_paths?.main_track?.sequence);
    expect(graph.edges).toContainEqual({ from: 'T01', to: 'T02' });
    expect(graph.edges).toContainEqual({ from: 'T09', to: 'T10' });
    expect(graph.edges).toContainEqual({ from: 'T14', to: 'T15' });
  });

  it('ships framework markdown content without bundled diagrams or interactive gates', () => {
    const expectedHeadings = [
      '## 角色定位与问题场景',
      '## 需要掌握',
      '## 关键判断力',
      '## 典型产出',
      '## 自检问题'
    ];

    for (const topic of seedData.topics) {
      expect(topic.body_md?.trim(), topic.id).toBeTruthy();
      expect(topic.body_md, topic.id).not.toMatch(/\?{4,}/);
      expect(topic.body_md, topic.id).not.toContain('learning-asset://');
      expect(topic.body_md, topic.id).not.toContain(':::interactive');
      expect(topic.gate, topic.id).toBeUndefined();
      expect(topic.body_md?.match(/^##\s+/gm)?.length, topic.id).toBe(5);
      for (const heading of expectedHeadings) {
        expect(topic.body_md, topic.id).toContain(heading);
      }
    }
  });

  it('exposes user-provided source records for the framework topics', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const t01 = store.getTopic('T01');

    expect(t01.sources).toHaveLength(1);
    expect(t01.sources[0]).toMatchObject({
      id: 'enterprise-agent-platform-skills',
      title: 'Enterprise Agent Platform Skills',
      publisher: 'User-provided clipping',
      confidence: 'medium',
      last_verified: '2026-05-05'
    });
    expect(t01.sources[0].url).toMatch(/^https?:\/\//);
    expect(t01.sources[0].covers.length).toBeGreaterThan(0);
  });

  it('documents the user clipping snapshot used for the Enterprise Agent Platform Skills framework', () => {
    const snapshotPath = path.join(
      process.cwd(),
      'resources',
      'source-snapshots',
      'enterprise-agent-platform-skills.md'
    );

    expect(fs.existsSync(snapshotPath)).toBe(true);
    expect(fs.readFileSync(snapshotPath, 'utf8')).toContain('15 类关键能力');
  });

  it('deep-clones source covers so external mutation does not leak back into the store', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const first = store.getTopic('T01');
    first.sources[0].covers.push('mutation');

    const second = store.getTopic('T01');
    expect(second.sources[0].covers).not.toContain('mutation');
  });
});
