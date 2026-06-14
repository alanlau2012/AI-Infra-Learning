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
  it('loads the 2026 five-topic interactive demo outline', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const outline = store.getOutline();
    const topic = store.getTopic('T01');
    const progress = store.getProgress();

    expect(outline).toHaveLength(3);
    expect(outline[0].name).toBe('AI Infra 栈全景');
    expect(outline.flatMap((stage) => stage.topics)).toHaveLength(5);
    expect(topic.name).toBe('NVIDIA vs 昇腾 AI Infra 栈全景');
    expect(topic.interactiveDemo?.kind).toBe('stack_compare');
    expect(topic.interactiveDemo?.metrics).toContain('throughput');
    expect(topic.bodyMd).toContain('## 角色定位与问题场景');
    expect(topic.sources.length).toBeGreaterThanOrEqual(3);
    expect(progress.totalTopics).toBe(5);
    expect(progress.completedTopics).toBe(0);
  });

  it('persists topic progress to progress.json across store reinitialization', () => {
    const progressPath = makeProgressPath();
    const store = createLearningStore({ seedData, progressPath });

    const updated = store.updateTopicStatus('T02', 'completed');
    const reopened = createLearningStore({ seedData, progressPath });

    expect(updated.status).toBe('completed');
    expect(reopened.getTopic('T02').status).toBe('completed');
    expect(reopened.getProgress().completedTopics).toBe(1);
    expect(JSON.parse(fs.readFileSync(progressPath, 'utf8'))).toEqual({
      version: 2,
      topicStatus: {
        T02: 'completed'
      }
    });
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
            topic.id === 'T03' ? { ...topic, prerequisites: ['DOES_NOT_EXIST'] } : topic
          )
        }
      })
    ).toThrow(/prerequisite/i);
  });

  it('builds the roadmap graph from the demo prerequisites and main track metadata', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const graph = store.getRoadmapGraph();

    expect(graph.mainTrack).toEqual(['T01', 'T02', 'T03', 'T04', 'T05']);
    expect(graph.edges).toContainEqual({ from: 'T01', to: 'T02' });
    expect(graph.edges).toContainEqual({ from: 'T02', to: 'T03' });
    expect(graph.edges).toContainEqual({ from: 'T04', to: 'T05' });
  });

  it('deep-clones sources and interactive demo steps so external mutation does not leak back', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    const first = store.getTopic('T05');
    first.sources[0].covers.push('mutation');
    first.interactiveDemo?.steps.push({ id: 'mutation', label: 'mutation', explanation: 'mutation' });

    const second = store.getTopic('T05');
    expect(second.sources[0].covers).not.toContain('mutation');
    expect(second.interactiveDemo?.steps.map((step) => step.id)).not.toContain('mutation');
  });

  it('keeps every demo topic sourced and interactive', () => {
    const store = createLearningStore({ seedData, progressPath: makeProgressPath() });

    for (const topic of seedData.topics) {
      const detail = store.getTopic(topic.id);
      expect(detail.sources.length, topic.id).toBeGreaterThanOrEqual(3);
      expect(detail.interactiveDemo, topic.id).not.toBeNull();
      expect(detail.interactiveDemo?.steps.length, topic.id).toBeGreaterThanOrEqual(4);
      for (const source of detail.sources) {
        expect(source.url, topic.id).toMatch(/^https?:\/\//);
        expect(source.covers.length, topic.id).toBeGreaterThan(0);
      }
    }
  });
});
