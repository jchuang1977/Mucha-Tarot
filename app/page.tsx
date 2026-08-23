import TarotExperience from './TarotExperience';
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from './chatgpt-auth';

export const dynamic = 'force-dynamic';

function formattedTaipeiDate() {
  return new Intl.DateTimeFormat('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  }).format(new Date());
}

export default async function Home() {
  const user = await getChatGPTUser();
  return <TarotExperience
    formattedDate={formattedTaipeiDate()}
    viewer={user ? { displayName: user.displayName, email: user.email } : null}
    authHref={user ? chatGPTSignOutPath('/') : chatGPTSignInPath('/')}
  />;
}
