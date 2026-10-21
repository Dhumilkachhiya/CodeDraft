import React from "react";

function PlayerSlot({ player, teamLabel }) {
  if (!player) {
    return (
      <div className="border border-dashed border-border-default/80 rounded-2xl p-6 flex items-center justify-center bg-bg-surface/10 h-28 w-full animate-pulse relative overflow-hidden">
        {/* Subtle grid pattern or light */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.02),transparent)]" />
        <div className="flex flex-col items-center gap-1.5 text-center relative z-10">
          <div className="w-8 h-8 rounded-full border border-dashed border-border-default flex items-center justify-center text-text-muted">
            <svg
              className="w-4 h-4 text-text-muted/60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <span className="text-xs font-semibold text-text-muted/65 uppercase tracking-widest text-[10px] font-mono">
            Waiting for fighter...
          </span>
        </div>
      </div>
    );
  }

  const avatarInitials = player.avatar || (player.username ? player.username.slice(0, 2).toUpperCase() : "??");
  const isTeamA = teamLabel === "Team A" || teamLabel === "Team Alpha";

  return (
    <div className="bg-gradient-to-br from-bg-surface to-bg-primary/90 border border-border-default/70 rounded-2xl p-5 flex items-center justify-between shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:border-primary/60 transition-all duration-300 h-28 w-full font-sans animate-fade-in relative overflow-hidden group">
      {/* Premium background cyber glows */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-gradient-to-br from-primary/10 to-secondary/5 rounded-full blur-3xl opacity-40 group-hover:opacity-70 transition-opacity duration-300 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-gradient-to-br from-secondary/5 to-primary/5 rounded-full blur-2xl opacity-20 pointer-events-none" />

      {/* Profile/Avatar Block */}
      <div className="flex items-center gap-4 relative z-10">
        <div 
          className={`w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl shadow-[0_0_16px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-300 bg-bg-elevated ${
            isTeamA 
              ? "border-2 border-primary text-primary shadow-[0_0_12px_rgba(99,102,241,0.35)]" 
              : "border-2 border-secondary text-secondary shadow-[0_0_12px_rgba(34,211,238,0.35)]"
          }`}
        >
          <span className="drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">{avatarInitials}</span>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <span className="text-base font-extrabold text-text-primary tracking-tight truncate max-w-[160px] group-hover:text-primary-hover transition-colors duration-200">
            {player.username}
          </span>
          {player.college ? (
            <span className="px-2.5 py-0.5 rounded-full bg-bg-elevated/80 border border-border-default/60 text-[10px] text-text-secondary font-bold tracking-wide w-fit truncate max-w-[150px] shadow-sm">
              🎓 {player.college}
            </span>
          ) : (
            <span className="text-[10px] text-text-muted italic px-2 py-0.5 border border-border-default/30 rounded-full w-fit">No college standing</span>
          )}
        </div>
      </div>

      {/* Stats/Rank Block */}
      <div className="flex flex-col items-end gap-2.5 relative z-10">
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest font-mono">
            ELO Rating
          </span>
          <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-secondary to-primary-hover bg-clip-text text-transparent font-mono">
            {player.eloRating}
          </span>
        </div>
        {teamLabel && (
          <span
            className={`px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest font-mono shadow-sm ${
              isTeamA
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-secondary/10 text-secondary border border-secondary/30"
            }`}
          >
            {teamLabel === "Team A" ? "Alpha" : "Beta"}
          </span>
        )}
      </div>
    </div>
  );
}

export default PlayerSlot;
