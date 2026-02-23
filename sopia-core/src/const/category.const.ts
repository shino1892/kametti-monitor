export const LiveCategoryList = [
  {
    name: 'live_keyword_asmr',
    val: 'asmr',
    emoji: '👂'
  },
  {
    name: 'live_keyword_chat',
    val: 'chat',
    emoji: '💬'
  },
  {
    name: 'live_keyword_daily',
    val: 'daily',
    emoji: '👋'
  },
  {
    name: 'live_keyword_game',
    val: 'game',
    emoji: '🎮'
  },
  {
    name: 'live_keyword_healing',
    val: 'healing',
    emoji: '🌈'
  },
  {
    name: 'live_keyword_humor',
    val: 'humor',
    emoji: '😂'
  },
  {
    name: 'live_keyword_love',
    val: 'love',
    emoji: '❤️'
  },
  {
    name: 'live_keyword_music',
    val: 'music',
    emoji: '🎤'
  },
  {
    name: 'live_keyword_study',
    val: 'study',
    emoji: '📖'
  },
  {
    name: 'live_keyword_togather',
    val: 'togather',
    emoji: '👥'
  },
  {
    name: 'live_keyword_voice_acting',
    val: 'voice_acting',
    emoji: '🎬'
  },
  {
    name: 'live_keyword_worries',
    val: 'worries',
    emoji: '😨'
  },
  {
    name: 'live_keyword_tikitaka',
    val: 'tikitaka',
    emoji: '🆚'
  },
  {
    name: 'live_keyword_book',
    val: 'book',
    emoji: '📚'
  },
  {
    name: 'live_keyword_sports',
    val: 'sports',
    emoji: '🏃‍♂️'
  },
  {
    name: 'live_keyword_netflix',
    val: 'netflix',
    emoji: '🍿'
  },
  {
    name: 'live_keyword_fangirl',
    val: 'fangirl',
    emoji: '💖'
  },
  {
    name: 'live_keyword_playlist',
    val: 'playlist',
    emoji: '🎶'
  },
  {
    name: 'live_keyword_makefriend',
    val: 'makefriend',
    emoji: '💙'
  },
  {
    name: 'live_keyword_newdj',
    val: 'newdj',
    emoji: '🐣'
  },
  {
    name: 'live_keyword_iteconomy',
    val: 'iteconomy',
    emoji: '💻'
  },
  {
    name: 'live_keyword_school',
    val: 'school',
    emoji: '🏫'
  },
  {
    name: 'live_keyword_work',
    val: 'work',
    emoji: '💼'
  }
] as const

export type LiveCategory = (typeof LiveCategoryList)[number]['val']
