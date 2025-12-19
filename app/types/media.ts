export type MediaItem = {
  id: number;
  title: string;
  date: number;
  type: string;
  duration: number;
  rate: number;
  tags: string;
  thumbs: string[];
  play_count?: number;
  last_played?: number | null;
};
