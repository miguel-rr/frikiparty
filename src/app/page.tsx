import { NextEvent } from '@/app/_components/next-event';
import { NoticeBoard } from '@/app/_components/notice-board';

// Placeholder until the tournament schema lands — see .claude/data-model.md
const NEXT_EVENT = {
  edition: 'Edición XXIII',
  dates: '18–19 octubre 2026',
  venue: 'Refugio de Gredos, Ávila',
  teams: 6,
  players: 22,
  href: '/ediciones/xxiii',
};

const Home = () => {
  return (
    <main className="mx-auto flex max-w-[1180px] flex-col gap-8 px-4 py-8 sm:px-8">
      <NoticeBoard title="¡PRÓXIMO EVENTO!">
        <NextEvent {...NEXT_EVENT} />
      </NoticeBoard>
    </main>
  );
};

export default Home;
