using Muse.Audio.Api.Models;

namespace Muse.Audio.Api.Services;

public static class TracksData
{
    public static readonly List<TrackInfo> AllTracks = new()
    {
        new TrackInfo
        {
            Id = "kw_118980", Rid = "118980", Title = "夜曲", Artist = "周杰伦", Album = "十一月的萧邦",
            Duration = 226, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s11/89/774616642.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=118980&rid=118980", Genre = "华语流行 / 经典",
            Bpm = 84, Year = 2005, ThemeColor = "#0ea5e9", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "118980", Songmid = "118980", Name = "夜曲", Singer = "周杰伦", AlbumName = "十一月的萧邦" }
        },
        new TrackInfo
        {
            Id = "kw_228908", Rid = "228908", Title = "晴天", Artist = "周杰伦", Album = "叶惠美",
            Duration = 269, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s3s94/93/211513640.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=228908&rid=228908", Genre = "华语流行 / 经典",
            Bpm = 96, Year = 2003, ThemeColor = "#f59e0b", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "228908", Songmid = "228908", Name = "晴天", Singer = "周杰伦", AlbumName = "叶惠美" }
        },
        new TrackInfo
        {
            Id = "kw_94237", Rid = "94237", Title = "七里香", Artist = "周杰伦", Album = "七里香",
            Duration = 299, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s81/2/3200337129.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=94237&rid=94237", Genre = "华语流行 / 经典",
            Bpm = 78, Year = 2004, ThemeColor = "#10b981", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "94237", Songmid = "94237", Name = "七里香", Singer = "周杰伦", AlbumName = "七里香" }
        },
        new TrackInfo
        {
            Id = "kw_440613", Rid = "440613", Title = "稻香", Artist = "周杰伦", Album = "魔杰座",
            Duration = 223, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s0/93/1794217775.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=440613&rid=440613", Genre = "华语流行 / 治愈",
            Bpm = 82, Year = 2008, ThemeColor = "#eab308", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "440613", Songmid = "440613", Name = "稻香", Singer = "周杰伦", AlbumName = "魔杰座" }
        },
        new TrackInfo
        {
            Id = "kw_3195905", Rid = "3195905", Title = "红尘客栈", Artist = "周杰伦", Album = "十二新作",
            Duration = 274, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s17/73/2187216026.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=3195905&rid=3195905", Genre = "华语流行 / 古风",
            Bpm = 88, Year = 2012, ThemeColor = "#dc2626", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "3195905", Songmid = "3195905", Name = "红尘客栈", Singer = "周杰伦", AlbumName = "十二新作" }
        },
        new TrackInfo
        {
            Id = "kw_93157", Rid = "93157", Title = "江南", Artist = "林俊杰", Album = "第二天堂",
            Duration = 267, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s60/86/1922632933.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=93157&rid=93157", Genre = "华语流行 / 经典",
            Bpm = 92, Year = 2004, ThemeColor = "#2563eb", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "93157", Songmid = "93157", Name = "江南", Singer = "林俊杰", AlbumName = "第二天堂" }
        },
        new TrackInfo
        {
            Id = "kw_28423286", Rid = "28423286", Title = "富士山下", Artist = "陈奕迅", Album = "What's Going On...?",
            Duration = 259, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s66/70/1259603879.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=28423286&rid=28423286", Genre = "粤语流行 / 经典",
            Bpm = 80, Year = 2006, ThemeColor = "#7c3aed", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "28423286", Songmid = "28423286", Name = "富士山下", Singer = "陈奕迅", AlbumName = "What's Going On...?" }
        },
        new TrackInfo
        {
            Id = "kw_198554068", Rid = "198554068", Title = "孤勇者", Artist = "陈奕迅", Album = "孤勇者",
            Duration = 256, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/49/79/1011385325.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=198554068&rid=198554068", Genre = "华语流行 / 励志",
            Bpm = 100, Year = 2021, ThemeColor = "#ea580c", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "198554068", Songmid = "198554068", Name = "孤勇者", Singer = "陈奕迅", AlbumName = "孤勇者" }
        },
        new TrackInfo
        {
            Id = "kw_6468891", Rid = "6468891", Title = "演员", Artist = "薛之谦", Album = "初学者",
            Duration = 261, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s72/12/2959679061.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=6468891&rid=6468891", Genre = "华语流行 / 抒情",
            Bpm = 76, Year = 2015, ThemeColor = "#475569", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "6468891", Songmid = "6468891", Name = "演员", Singer = "薛之谦", AlbumName = "初学者" }
        },
        new TrackInfo
        {
            Id = "kw_6863662", Rid = "6863662", Title = "不将就", Artist = "李荣浩", Album = "模特",
            Duration = 312, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s24/33/1858778959.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=6863662&rid=6863662", Genre = "华语流行 / 抒情",
            Bpm = 82, Year = 2014, ThemeColor = "#0891b2", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "6863662", Songmid = "6863662", Name = "不将就", Singer = "李荣浩", AlbumName = "模特" }
        },
        new TrackInfo
        {
            Id = "kw_6239218", Rid = "6239218", Title = "烟火里的尘埃", Artist = "华晨宇", Album = "卡西莫多的礼物",
            Duration = 338, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/59/26/3448385106.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=6239218&rid=6239218", Genre = "华语流行 / 摇滚",
            Bpm = 90, Year = 2014, ThemeColor = "#be185d", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "6239218", Songmid = "6239218", Name = "烟火里的尘埃", Singer = "华晨宇", AlbumName = "卡西莫多的礼物" }
        },
        new TrackInfo
        {
            Id = "kw_6307329", Rid = "6307329", Title = "多远都要在一起", Artist = "邓紫棋", Album = "G.E.M.",
            Duration = 217, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s25/23/3583322828.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=6307329&rid=6307329", Genre = "华语流行 / 抒情",
            Bpm = 86, Year = 2014, ThemeColor = "#ec4899", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "6307329", Songmid = "6307329", Name = "多远都要在一起", Singer = "邓紫棋", AlbumName = "G.E.M." }
        },
        new TrackInfo
        {
            Id = "kw_203270215", Rid = "203270215", Title = "无名的人", Artist = "毛不易", Album = "小王",
            Duration = 282, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s9/73/3188088239.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=203270215&rid=203270215", Genre = "华语流行 / 治愈",
            Bpm = 74, Year = 2020, ThemeColor = "#65a30d", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "203270215", Songmid = "203270215", Name = "无名的人", Singer = "毛不易", AlbumName = "小王" }
        },
        new TrackInfo
        {
            Id = "kw_271333", Rid = "271333", Title = "我们的歌", Artist = "王力宏", Album = "心中的日月",
            Duration = 247, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s3s4/25/619744070.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=271333&rid=271333", Genre = "华语流行 / 经典",
            Bpm = 94, Year = 2004, ThemeColor = "#d97706", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "271333", Songmid = "271333", Name = "我们的歌", Singer = "王力宏", AlbumName = "心中的日月" }
        },
        new TrackInfo
        {
            Id = "kw_157908", Rid = "157908", Title = "吻别", Artist = "张学友", Album = "吻别",
            Duration = 302, CoverUrl = "https://img4.kuwo.cn/star/albumcover/500/s4s28/49/1873834570.jpg",
            AudioUrl = "/api/music/stream?source=kuwo&id=157908&rid=157908", Genre = "华语流行 / 经典",
            Bpm = 72, Year = 1993, ThemeColor = "#991b1b", Bitrate = "酷我正版 FLAC / 320k",
            SourceName = "酷我音乐", SourceKey = "kw",
            SourceRawInfo = new RawInfo { Id = "157908", Songmid = "157908", Name = "吻别", Singer = "张学友", AlbumName = "吻别" }
        }
    };

    public static List<TrackInfo> GetByIds(string[] ids)
    {
        return ids
            .Select(id => AllTracks.FirstOrDefault(t => t.Id == id))
            .Where(t => t != null)
            .Cast<TrackInfo>()
            .ToList();
    }
}
