import type { ReactNode } from 'react';

type NoticeBoardProps = {
  /** Text painted on the wooden sign nailed above the notice. */
  title: string;
  children: ReactNode;
};

const Nail = ({ className }: { className: string }) => (
  <span
    aria-hidden
    className={`nail absolute size-3 rounded-full ${className}`}
  />
);

/**
 * Medieval notice board: oak planks, two battens nailed across it, a
 * hand-painted sign for a header and whatever is passed in hung below,
 * tacked at the corners and a hair off square.
 */
const NoticeBoard = ({ title, children }: NoticeBoardProps) => (
  <div className="board relative rounded-[5px] px-6 pt-11 pb-12 sm:px-11 sm:pt-[70px] sm:pb-[76px]">
    <div className="batten absolute inset-x-2 top-3 h-5 rounded-sm sm:top-4 sm:h-[26px]">
      <Nail className="top-1/2 left-4 -translate-y-1/2 sm:left-6" />
      <Nail className="top-1/2 right-4 -translate-y-1/2 sm:right-6" />
    </div>
    <div className="batten absolute inset-x-2 bottom-3 h-5 rounded-sm sm:bottom-4 sm:h-[26px]">
      <Nail className="top-1/2 left-4 -translate-y-1/2 sm:left-6" />
      <Nail className="top-1/2 right-4 -translate-y-1/2 sm:right-6" />
    </div>

    <div className="sign tilt-sign relative mx-auto mb-6 w-fit rotate-[-1.1deg] rounded-[3px] px-8 py-3 sm:mb-8 sm:px-14 sm:py-4">
      <Nail className="top-2 left-3 sm:top-[11px]" />
      <Nail className="top-2 right-3 sm:top-[11px]" />
      <p className="relative whitespace-nowrap text-center font-bold font-stencil text-2xl text-[#f4e6c6] leading-none tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] sm:text-[2.35rem]">
        {title}
      </p>
    </div>

    <div className="tilt-notice relative rotate-[-0.7deg] drop-shadow-[0_20px_26px_rgba(0,0,0,0.62)]">
      <Nail className="-top-1.5 left-5 z-10 sm:left-8" />
      <Nail className="-top-1.5 right-5 z-10 sm:right-8" />
      {children}
    </div>
  </div>
);

export { NoticeBoard };
