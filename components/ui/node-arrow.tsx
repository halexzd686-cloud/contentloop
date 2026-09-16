/**
 * NodeArrow — TrajectoryAction C (approved via mock hd-a3.png).
 * Hollow silver node → line → filled green node: "advancing" expressed as
 * a node state transition, no arrowhead. Reserved for real next-stage
 * actions only (≤2–3 per viewport, spec §9).
 */
export function NodeArrow({ className = "" }: { className?: string }) {
  return (
    <svg width="42" height="11" viewBox="0 0 42 11" className={className} aria-hidden>
      <circle cx="3.5" cy="5.5" r="2.6" fill="none" stroke="#8B8E87" strokeWidth="1.3" />
      <line x1="8.5" y1="5.5" x2="32" y2="5.5" stroke="#8B8E87" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="37" cy="5.5" r="3" fill="#3F7455" />
    </svg>
  );
}
