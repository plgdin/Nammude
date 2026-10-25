import React from 'react';

interface WelcomeViewProps {
  restaurantName: string;
  tableNumber: string;
  onViewMenu: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  restaurantName,
  tableNumber,
  onViewMenu,
}) => {
  return (
    <div className="min-h-screen bg-[#2D2D2D] text-white flex flex-col font-poppins select-none max-w-md mx-auto relative shadow-2xl">
      {/* Top Hero Section with Food Background */}
      <div className="relative h-[320px] sm:h-[360px] w-full overflow-hidden">
        <img
          src="/images/tablewise/hero_egg_salad.jpg"
          alt="Hero Dish"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-[#2D2D2D]" />

        {/* Top Navbar Header */}
        <div className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-10">
          <span className="text-[#2FDBBC] font-bebas text-2xl tracking-wider uppercase font-normal">
            TABLEWISE
          </span>
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs text-white">
            <span className="text-gray-300 font-medium">TABLE</span>
            <span className="text-[#2FDBBC] font-bold">{tableNumber}</span>
          </div>
        </div>

        {/* Hero Title & Subtext */}
        <div className="absolute bottom-6 inset-x-0 px-6 z-10 flex flex-col gap-2">
          <h1 className="font-bebas text-4xl sm:text-5xl text-white tracking-wide uppercase leading-none">
            {restaurantName}
          </h1>
          <p className="text-sm text-white/85 font-normal leading-relaxed">
            Your table comes from the QR code you scanned. No account needed.
          </p>
        </div>
      </div>

      {/* Main Body Section */}
      <div className="flex-1 px-5 pt-3 pb-8 flex flex-col justify-between gap-6">
        {/* Guest Friendly Card */}
        <div className="rounded-2xl bg-white/[0.08] border border-white/10 p-5 flex flex-col gap-2 shadow-sm">
          <h2 className="font-bebas text-xl text-white tracking-wider uppercase">
            GUEST-FRIENDLY ORDERING
          </h2>
          <p className="text-sm text-white/80 leading-relaxed font-normal">
            Browse the menu and order to Table {tableNumber}. No sign-in, delivery address or saved
            card needed.
          </p>
        </div>

        {/* Bottom Action Area */}
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            type="button"
            onClick={onViewMenu}
            className="w-full py-3.5 px-6 rounded-full bg-[#2FDBBC] hover:bg-[#28c5a9] text-[#2D2D2D] font-bebas text-xl tracking-wider uppercase transition-all duration-150 active:scale-[0.98] shadow-lg flex items-center justify-center font-normal"
          >
            VIEW MENU
          </button>
          <p className="text-xs text-white/70 text-center font-normal">
            Scanned a valid table QR code? You can go straight to the menu.
          </p>
        </div>
      </div>
    </div>
  );
};
