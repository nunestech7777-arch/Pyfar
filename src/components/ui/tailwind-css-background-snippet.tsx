import { cn } from "@/lib/utils";

export const Hero = () => {
  return (
    <div
      className={cn("w-full relative h-screen overflow-hidden bg-radial-purple")}
      style={{ background: "radial-gradient(125% 125% at 50% 10%, #000000 40%, #63e 100%)" }}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 h-full w-full animate-pulse-radial"
          style={{ background: "radial-gradient(125% 125% at 50% 10%, transparent 35%, #7c3aed 100%)" }}
        />
        <div className="absolute -top-24 -left-24 w-[450px] h-[450px] bg-purple-600/30 rounded-full blur-[120px] animate-blob-1" />
        <div className="absolute -bottom-28 -right-28 w-[500px] h-[500px] bg-indigo-600/35 rounded-full blur-[130px] animate-blob-2" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-violet-500/20 rounded-full blur-[140px] animate-blob-3" />
      </div>
    </div>
  );
};


