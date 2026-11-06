import React from 'react';
import { Image } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { CompletionArtwork } from '../CompletionArtwork';

let mockTheme = 'light';
const mockArt = { id: 'test', screen: 'workout', slot: 'hero', lightUrl: 'https://cdn.example.com/light.png', darkUrl: 'https://cdn.example.com/dark.png', width: 768, height: 768, enabled: true };
jest.mock('@/src/features/appConfig/store', () => ({ useAppConfig: () => ({ completion_artwork: { version: 1, items: [mockArt] } }) }));
jest.mock('@/src/providers/ThemeProvider', () => ({ useTheme: () => ({ theme: mockTheme }) }));

it('keeps the bundled art while loading, switches theme variants, and recovers from a failed download', () => {
  const view = render(<CompletionArtwork screen="workout" seed="activity" />);
  let images = view.UNSAFE_getAllByType(Image);
  expect(images).toHaveLength(2);
  expect(images[1].props.source.uri).toBe(mockArt.lightUrl);
  fireEvent(images[1], 'load');
  expect(view.UNSAFE_getAllByType(Image)).toHaveLength(1);

  mockTheme = 'dark';
  view.rerender(<CompletionArtwork screen="workout" seed="activity" />);
  images = view.UNSAFE_getAllByType(Image);
  expect(images).toHaveLength(2);
  expect(images[1].props.source.uri).toBe(mockArt.darkUrl);
  fireEvent(images[1], 'error');
  images = view.UNSAFE_getAllByType(Image);
  expect(images).toHaveLength(1);
  expect(images[0].props.source).toBe(require('@/assets/images/completion/workout-celebration.png'));
});
