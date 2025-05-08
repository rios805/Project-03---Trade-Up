const cron = require("node-cron");
const pool = require("../db/pool").promise();
const { initializeDailyScore, finalizeDailyScore } = require("../services/scoreService");

cron.schedule("*/5 * * * *", async () => {
  const today = new Date().toISOString().split("T")[0];
  console.log(`[Scheduler] Running daily score check at ${new Date().toLocaleTimeString()}`);

  try {
    const [users] = await pool.query("SELECT id FROM users");

    for (const user of users) {
      const userId = user.id;

      const [[lastScore]] = await pool.query(
        `SELECT score_date, final_score FROM daily_scores
         WHERE user_id = ?
         ORDER BY score_date DESC
         LIMIT 1`,
        [userId]
      );

      // If no record at all, initialize for today
      if (!lastScore) {
        console.log(`[Scheduler] No score record for user ${userId}. Initializing new day.`);
        await initializeDailyScore(userId);
        continue;
      }

      const scoreDate = lastScore.score_date;
      const finalScore = lastScore.final_score;

      if (scoreDate !== today) {
        // Finalize yesterday's score if not already done
        if (finalScore === null) {
          console.log(`[Scheduler] Finalizing yesterday's score for user ${userId}.`);
          await finalizeDailyScore(userId);
        }

        // Start today's tracking
        console.log(`[Scheduler] Starting new day for user ${userId}.`);
        await initializeDailyScore(userId);
      }
    }
  } catch (err) {
    console.error("[Scheduler] Error running daily score logic:", err);
  }
});
