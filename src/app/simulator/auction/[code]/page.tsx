import { AuctionRoom } from '@/app/simulator/auction/[code]/_components/auction-room';
import { SiteShell } from '@/components/layout/site-shell';

type PageProps = { params: Promise<{ code: string }> };

const AuctionRoomPage = async ({ params }: PageProps) => {
  const { code } = await params;
  return (
    <SiteShell>
      <AuctionRoom code={code} />
    </SiteShell>
  );
};

export default AuctionRoomPage;
