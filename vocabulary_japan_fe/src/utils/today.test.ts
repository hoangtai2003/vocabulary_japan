import { describe, expect, it } from 'vitest';
import { makeWord } from '@/test/fixtures';
import { selectTodayWords } from './today';

const words = [
  makeWord('w05', { topic_id: 't02' }),
  makeWord('w01', { topic_id: 't01' }),
  makeWord('w03', { topic_id: 't01', status: 'learning' }),
  makeWord('w02', { topic_id: 't01' }),
  makeWord('w04', { topic_id: 't01', level: 'N4' }),
  makeWord('w06', { topic_id: 't02' }),
];

describe('selectTodayWords', () => {
  it('lấy từ mới đúng cấp độ, sắp theo chủ đề rồi theo id', () => {
    expect(selectTodayWords({ words, level: 'N5', goal: 3 })).toEqual(['w01', 'w02', 'w05']);
  });

  it('không đủ từ thì trả về số có thật', () => {
    expect(selectTodayWords({ words, level: 'N4', goal: 10 })).toEqual(['w04']);
  });

  it('giữ lại từ đã học hôm nay khi tính lại danh sách', () => {
    expect(selectTodayWords({ words, level: 'N5', goal: 3, keepIds: ['w03'] })).toEqual([
      'w03',
      'w01',
      'w02',
    ]);
  });
});
