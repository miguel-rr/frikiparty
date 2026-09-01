import { DraftRoom } from '@/app/simulator/draft/[code]/_components/draft-room';
import { SiteShell } from '@/components/layout/site-shell';

type PageProps = { params: Promise<{ code: string }> };

const DraftRoomPage = async ({ params }: PageProps) => {
  const { code } = await params;
  return (
    <SiteShell>
      <DraftRoom code={code} />
    </SiteShell>
  );
};

export default DraftRoomPage;
