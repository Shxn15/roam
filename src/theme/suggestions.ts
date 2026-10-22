import type { ColorRole } from './types';

/** Quick picks in the theme editor: calm, cozy tones that suit the presets. */
export const COLOR_SUGGESTIONS: Record<ColorRole, readonly string[]> = {
  accent: ['#4A68C5', '#6E53C9', '#2F8577', '#B04F78', '#2B4BF2', '#C77B48', '#5D7F3A', '#1F7A8C'],
  background: ['#F2EDE4', '#F4F1F7', '#EDF1EA', '#F4F4F2', '#ECF0F6', '#14152B', '#1C1612', '#132122'],
  button: ['#2B3560', '#2D2840', '#4A68C5', '#2F8577', '#9D8CFF', '#D9925F', '#1C1B22'],
  buttonText: ['#FFFCF7', '#FFFFFF', '#14152B', '#1C1612'],
  surface: ['#FFFCF7', '#FFFDFB', '#FFFFFF', '#1E2040', '#28201A', '#1B2B2C'],
  text: ['#2A2734', '#2D2840', '#1C1B22', '#ECEAF7', '#F3E8DC'],
  border: ['#E6DDD0', '#E6E0EF', '#E4E4E8', '#2E3160', '#3D3128'],
};
