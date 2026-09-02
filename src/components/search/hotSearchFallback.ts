/** Local fallbacks used when official hot-search APIs are unavailable (incl. v1 mode). */

export interface FallbackHotItem {
  keyword: string;
  tag: string;
  count: string;
}

export const HOT_SEARCH_FALLBACK: FallbackHotItem[] = [
  { keyword: '周杰伦 - 夜曲', tag: '酷我正版', count: '99.8w' },
  { keyword: '周杰伦 - 晴天', tag: '热搜榜首', count: '88.5w' },
  { keyword: '七里香', tag: '经典', count: '76.4w' },
  { keyword: '稻香', tag: '治愈', count: '69.2w' },
  { keyword: '黑色毛衣', tag: '高保真', count: '58.1w' },
  { keyword: '林俊杰 - 江南', tag: 'HOT', count: '52.4w' },
  { keyword: '陈奕迅 - 富士山下', tag: '粤语经典', count: '48.9w' },
  { keyword: 'City Pop / 80s', tag: '复古', count: '41.3w' },
];

export interface GenreCard {
  name: string;
  color: string;
  border: string;
  query: string;
}

export const GENRE_CARDS: GenreCard[] = [
  { name: '周杰伦经典专区', color: 'from-amber-500/30 to-rose-600/30', border: 'border-amber-500/30', query: '周杰伦' },
  { name: 'City Pop / 城市流行', color: 'from-pink-500/30 to-purple-600/30', border: 'border-pink-500/30', query: 'City Pop' },
  { name: 'Synthwave / 赛博电音', color: 'from-fuchsia-600/30 to-indigo-600/30', border: 'border-fuchsia-500/30', query: 'Synthwave' },
  { name: 'Lo-Fi / 助眠白噪', color: 'from-emerald-500/30 to-teal-700/30', border: 'border-emerald-500/30', query: 'Lo-Fi' },
  { name: '华语流行金曲', color: 'from-blue-600/30 to-cyan-700/30', border: 'border-blue-500/30', query: '流行金曲' },
  { name: 'ACG / 动漫原声', color: 'from-violet-600/30 to-rose-700/30', border: 'border-violet-500/30', query: 'ACG' },
];
