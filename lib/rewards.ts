// Thin adapter that mirrors how a host app would wire game events to its
// rewards + leaderboard endpoints. The Phaser scene stays pure: it only
// emits score and milestone events; the host decides what to do with them.

export type RewardsApi = {
  // Fired on every score change. Debounced by the host if needed.
  onScore: (score: number) => void;
  // Fired once per milestone threshold crossed (e.g. 100, 250, 500...).
  onMilestone: (milestone: number, score: number) => void;
};

export const MILESTONES = [100, 250, 500, 1000, 2000];

// Example wiring. Swap the fetch calls for the real HeartStamp endpoints.
export function createRewardsApi(opts?: {
  scoreEndpoint?: string;
  milestoneEndpoint?: string;
  onToast?: (msg: string) => void;
}): RewardsApi {
  const { scoreEndpoint, milestoneEndpoint, onToast } = opts ?? {};

  return {
    onScore(score) {
      if (!scoreEndpoint) return;
      void fetch(scoreEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ score, ts: Date.now() }),
        keepalive: true,
      }).catch(() => {
        /* fire-and-forget; never block gameplay */
      });
    },
    onMilestone(milestone, score) {
      onToast?.(`Milestone ${milestone} reached!`);
      if (!milestoneEndpoint) return;
      void fetch(milestoneEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ milestone, score, ts: Date.now() }),
        keepalive: true,
      }).catch(() => {
        /* fire-and-forget */
      });
    },
  };
}
