import TarotExperience from './TarotExperience';

function formattedTaipeiDate() {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date());
}

export default function Home() {
  return <TarotExperience formattedDate={formattedTaipeiDate()} />;
}
