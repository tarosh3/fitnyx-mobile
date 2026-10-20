import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Image } from 'react-native';

import type { Exercise } from '@/src/types/exercise';
import { ExerciseThumb, exerciseImage, videoPoster } from '../ExerciseThumb';

jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: 'dark' }) }));

const exercise = (overrides: Partial<Exercise> = {}): Exercise => ({
  id: 1, uuid: 'bench', title: 'Bench press', video_url: '', pro_tip: '', how_to: '',
  primary_muscles: [], secondary_muscles: [], equipment: [], variations: [], alternatives: [],
  page_url: '', created_at: '', updated_at: '', tracking_type: 'weight_reps', ...overrides,
});
const muscle = (image: string) => ({ name: 'Pectoralis major', image, description: '' });

describe('exerciseImage', () => {
  it('prefers the exercise’s own still over anatomy and related movements', () => {
    expect(exerciseImage(exercise({
      media_url: ' https://images.example/bench.JPG?width=160#preview ',
      primary_muscles: [muscle('https://images.example/chest.png')],
      variations: [{ uuid: 'incline', name: 'Incline press', image: 'https://images.example/incline.jpg' }],
    }))).toBe('https://images.example/bench.JPG?width=160#preview');
  });

  it.each([
    'bench.mp4', 'bench.MP4?token=abc#video', 'bench.WebM#preview',
    'bench.MOV?download=1', 'bench.m4v', 'bench.m3u8?token=abc', 'bench.mpd',
  ])('uses an anatomical still instead of video URL %s', (filename) => {
    expect(exerciseImage(exercise({
      media_url: `https://media.example/${filename}`,
      primary_muscles: [muscle('https://images.example/chest.png')],
    }))).toBe('https://images.example/chest.png');
  });

  it('skips missing or non-image muscle media before selecting a usable illustration', () => {
    expect(exerciseImage(exercise({
      media_url: ' ',
      primary_muscles: [muscle(''), muscle('https://media.example/chest.MP4?token=abc'), muscle('https://images.example/chest.png')],
    }))).toBe('https://images.example/chest.png');
  });

  it('never presents a variation or alternative as the exercise being viewed', () => {
    expect(exerciseImage(exercise({
      media_url: 'https://media.example/bench.mp4',
      variations: [{ uuid: 'incline', name: 'Incline press', image: 'https://images.example/incline.jpg' }],
      alternatives: [{ uuid: 'push-up', name: 'Push up', image: 'https://images.example/push-up.jpg' }],
    }))).toBeNull();
    expect(exerciseImage()).toBeNull();
  });
});

describe('ExerciseThumb image failures', () => {
  it('keeps a broken source on its fallback but tries a different exercise’s source', () => {
    const first = exercise({ media_url: 'https://images.example/bench.jpg' });
    const second = exercise({ uuid: 'squat', media_url: 'https://images.example/squat.jpg' });
    const screen = render(<ExerciseThumb exercise={first} />);

    fireEvent(screen.UNSAFE_getByType(Image), 'error');
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();
    screen.rerender(<ExerciseThumb exercise={{ ...first }} />);
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();

    screen.rerender(<ExerciseThumb exercise={second} />);
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: second.media_url });
    fireEvent(screen.UNSAFE_getByType(Image), 'error');
    expect(screen.UNSAFE_queryByType(Image)).toBeNull();

    screen.rerender(<ExerciseThumb exercise={first} />);
    expect(screen.UNSAFE_getByType(Image).props.source).toEqual({ uri: first.media_url });
  });
});

describe('videoPoster', () => {
  const video = 'https://res.cloudinary.com/dgdczfeox/video/upload/v1772741303/fitnessai_migration/video/00391201-barbell-front-chest-squat.mp4';

  it('turns a Cloudinary video into a mid-video JPEG frame', () => {
    expect(videoPoster(video)).toBe('https://res.cloudinary.com/dgdczfeox/video/upload/so_50p,w_160,h_160,c_fill,q_auto,f_jpg/v1772741303/fitnessai_migration/video/00391201-barbell-front-chest-squat.jpg');
    expect(videoPoster(`${video}?x=1`, 480)).toContain('/so_50p,w_480,h_480,');
  });

  it('ignores videos hosted elsewhere and empty values', () => {
    expect(videoPoster('https://media.example/bench.mp4')).toBeNull();
    expect(videoPoster('')).toBeNull();
    expect(videoPoster(undefined)).toBeNull();
  });

  it('shows the video frame before the muscle illustration', () => {
    expect(exerciseImage(exercise({ video_url: video, primary_muscles: [muscle('https://images.example/chest.png')] })))
      .toContain('so_50p');
  });
});
