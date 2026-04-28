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
  it('loads the complete seed outline and topic details without SQLite', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const outline = store.getOutline();
    const topic = store.getTopic('T01');
    const progress = store.getProgress();

    expect(outline).toHaveLength(4);
    expect(outline[0].topics[0].id).toBe('T01');
    expect(outline.flatMap((stage) => stage.topics)).toHaveLength(21);
    expect(topic.name).toContain('Compute-bound');
    expect(topic.keyPoints).toHaveLength(seedData.topics[0].key_points.length);
    expect(topic.bodyMd).toContain('推理优化先不要问');
    expect(topic.bodyMd).not.toMatch(/\?{4,}/);
    expect(topic.status).toBe('not_started');
    expect(progress.totalTopics).toBe(21);
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

    const store = createLearningStore({ seedData, progressPath });

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

  it('builds the roadmap graph from seed prerequisites and main track metadata', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const graph = store.getRoadmapGraph();

    expect(graph.mainTrack).toEqual(seedData.learning_paths?.main_track?.sequence);
    expect(graph.edges).toContainEqual({ from: 'T01', to: 'T02' });
    expect(graph.edges).toContainEqual({ from: 'T17', to: 'T18' });
  });

  it('ships expanded markdown content and a bundled diagram for every topic', () => {
    const diagramPattern = /!\[[^\]]+\]\(learning-asset:\/\/topic-diagrams\/([a-z0-9-]+\.svg)\)/;
    const expectedHeadings = [
      '## 核心判断与问题场景',
      '## 机制、公式与推导',
      '## 昇腾/GTS 落地',
      '## 工程诊断、边界与误区',
      '## 专家自检与小结'
    ];

    for (const topic of seedData.topics) {
      expect(topic.body_md?.trim(), topic.id).toBeTruthy();
      expect(topic.body_md, topic.id).not.toMatch(/\?{4,}/);
      expect(topic.body_md?.match(/^##\s+/gm), topic.id).toHaveLength(5);
      for (const heading of expectedHeadings) {
        expect(topic.body_md, topic.id).toContain(heading);
      }
      const match = topic.body_md?.match(diagramPattern);
      expect(match?.[1], topic.id).toBeTruthy();
      expect(fs.existsSync(path.join(process.cwd(), 'resources', 'topic-diagrams', match?.[1] ?? ''))).toBe(true);
    }
  });

  it('exposes the sources array for topics that declare authoritative references', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const t20 = store.getTopic('T20');

    expect(t20.sources.length).toBeGreaterThanOrEqual(3);
    for (const source of t20.sources) {
      expect(source.id).toMatch(/^[a-z0-9-]+$/);
      expect(source.url).toMatch(/^https?:\/\//);
      expect(['high', 'medium', 'low']).toContain(source.confidence);
      expect(source.last_verified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(source.covers)).toBe(true);
      expect(source.covers.length).toBeGreaterThan(0);
    }
  });

  it('documents the T03 Qwen MoE example with verified sources', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const t03 = store.getTopic('T03');
    const combinedText = [t03.name, t03.realWorldConnection, ...t03.keyPoints, t03.bodyMd].join('\n');

    expect(fs.existsSync(path.join(process.cwd(), 'resources', 'source-snapshots', 'T03.md'))).toBe(true);
    expect(combinedText).not.toContain('Qwen3.5-35B-A3B');
    expect(combinedText).toContain('Qwen3-30B-A3B');
    expect(t03.sources.some((source) => source.id === 'qwen3-tech-report')).toBe(true);
    expect(t03.bodyMd).toContain('[!FACT]');
  });

  it('documents the T16 lifecycle example with verified Qwen sources and an assumed MiniMax note', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const t16 = store.getTopic('T16');
    const combinedText = [t16.name, t16.realWorldConnection, ...t16.keyPoints, t16.bodyMd].join('\n');

    expect(fs.existsSync(path.join(process.cwd(), 'resources', 'source-snapshots', 'T16.md'))).toBe(true);
    expect(combinedText).not.toContain('Qwen3.6-27B');
    expect(combinedText).toContain('Qwen3-Next-80B-A3B');
    expect(t16.sources.some((source) => source.id === 'qwen3-next-80b-card')).toBe(true);
    expect(t16.bodyMd).toMatch(/> \[!ASSUMPTION\][\s\S]*MiniMax/);
  });

  it('returns an empty sources array for topics without an explicit sources field', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const t01 = store.getTopic('T01');

    expect(t01.sources).toEqual([]);
  });

  it('deep-clones source covers so external mutation does not leak back into the store', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const first = store.getTopic('T20');
    first.sources[0].covers.push('mutation');

    const second = store.getTopic('T20');
    expect(second.sources[0].covers).not.toContain('mutation');
  });
});
