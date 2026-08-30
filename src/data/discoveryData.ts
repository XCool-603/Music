import { Track, Playlist, GenreCategory } from '../types';
import { INITIAL_TRACKS } from './musicData';

export const GENRE_CATEGORIES: GenreCategory[] = [
  { id: 'all', name: '全部风格', icon: 'Sparkles', filterKeywords: [] },
  { id: 'pop', name: '华语流行 Pop', icon: 'Music', filterKeywords: ['华语流行'] },
  { id: 'classic', name: '经典老歌 Classic', icon: 'Heart', filterKeywords: ['经典'] },
  { id: 'ballad', name: '抒情慢歌 Ballad', icon: 'Sunset', filterKeywords: ['抒情'] },
  { id: 'rock', name: '摇滚 Rock', icon: 'Zap', filterKeywords: ['摇滚'] },
  { id: 'heal', name: '治愈励志 Heal', icon: 'Sun', filterKeywords: ['治愈', '励志'] },
  { id: 'cantonese', name: '粤语 Cantonese', icon: 'Star', filterKeywords: ['粤语'] },
  { id: 'ancient', name: '古风国韵 Ancient', icon: 'Compass', filterKeywords: ['古风'] },
];

export const HERO_TRACK_IDS = ['kw_118980', 'kw_228908', 'kw_94237'];

export const TRENDING_TRACK_IDS = [
  'kw_118980', 'kw_228908', 'kw_94237', 'kw_440613', 'kw_3195905',
  'kw_93157', 'kw_28423286', 'kw_198554068', 'kw_6468891', 'kw_6863662',
  'kw_6239218', 'kw_6307329', 'kw_203270215', 'kw_271333', 'kw_157908',
];

export const DISCOVERY_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-jay',
    name: '周杰伦 经典正版专区',
    coverUrl: 'https://img4.kuwo.cn/star/albumcover/500/s4s11/89/774616642.jpg',
    description: '周杰伦全正版独家音源，包含《夜曲》、《晴天》、《七里香》、《稻香》等旷世神作。',
    trackIds: ['kw_118980', 'kw_228908', 'kw_94237', 'kw_440613', 'kw_3195905'],
    tags: ['周杰伦', '酷我正版', '经典神曲', '高保真FLAC'],
  },
  {
    id: 'pl-cpop',
    name: '华语流行 热门推荐',
    coverUrl: 'https://img4.kuwo.cn/star/albumcover/500/s4s43/72/3847291122.jpg',
    description: '华语乐坛最受欢迎的流行金曲，每天为你精选好歌。',
    trackIds: ['kw_93157', 'kw_28423286', 'kw_198554068', 'kw_6468891', 'kw_6863662', 'kw_6307329'],
    tags: ['华语流行', '精选', '热门', '每日更新'],
  },
  {
    id: 'pl-chill',
    name: '治愈系 抒情慢歌',
    coverUrl: 'https://img4.kuwo.cn/star/albumcover/500/s4s44/67/3947477141.jpg',
    description: '温暖人心的抒情歌曲，适合独处时光静静聆听。',
    trackIds: ['kw_6239218', 'kw_203270215', 'kw_6307329', 'kw_157908'],
    tags: ['治愈', '抒情', '慢歌', '安静'],
  },
  {
    id: 'pl-classic',
    name: '华语经典 永恒金曲',
    coverUrl: 'https://img4.kuwo.cn/star/albumcover/500/s4s43/72/3847291122.jpg',
    description: '跨越时代的经典之作，传唱不衰的华语音乐瑰宝。',
    trackIds: ['kw_157908', 'kw_271333', 'kw_118980', 'kw_228908', 'kw_94237'],
    tags: ['经典', '永恒', '传唱', '怀旧'],
  },
];

export function resolveTrackIds(ids: string[]): Track[] {
  return ids.map((id) => INITIAL_TRACKS.find((t) => t.id === id)).filter(Boolean) as Track[];
}

export function getHeroTracks(): Track[] {
  return resolveTrackIds(HERO_TRACK_IDS);
}

export function getTrendingTracks(): Track[] {
  return resolveTrackIds(TRENDING_TRACK_IDS);
}

export function filterTracksByGenre(tracks: Track[], category: GenreCategory): Track[] {
  if (category.id === 'all' || category.filterKeywords.length === 0) return tracks;
  return tracks.filter((t) => category.filterKeywords.some((kw) => t.genre.includes(kw)));
}
