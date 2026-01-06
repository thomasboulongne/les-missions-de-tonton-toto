import type { SubmissionWithMission } from '../../types';
import styles from './FeedbackCard.module.css';

interface FeedbackCardProps {
  submission: SubmissionWithMission;
  onDismiss: () => void;
}

export function FeedbackCard({ submission, onDismiss }: FeedbackCardProps) {
  const isApproved = submission.status === 'approved';

  return (
    <div className={`${styles.card} ${isApproved ? styles.approved : styles.needsWork}`}>
      <div className={styles.iconWrapper}>
        {isApproved ? '🎉' : '💪'}
      </div>

      <div className={styles.header}>
        <h2 className={styles.title}>
          {isApproved ? 'Mission validée !' : 'Message de Tonton Toto'}
        </h2>
        <p className={styles.missionTitle}>
          {submission.mission_title}
        </p>
      </div>

      {submission.review_notes && (
        <div className={styles.message}>
          <div className={styles.messageLabel}>
            🤖 Tonton Toto dit :
          </div>
          <p className={styles.messageText}>
            "{submission.review_notes}"
          </p>
        </div>
      )}

      {!submission.review_notes && (
        <div className={styles.message}>
          <p className={styles.messageText}>
            {isApproved
              ? 'Bravo, tu as super bien travaillé ! Continue comme ça !'
              : 'Jette un œil à ta mission, tu y es presque !'
            }
          </p>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.dismissButton} onClick={onDismiss}>
          {isApproved ? '✨ Trop cool !' : '👍 Compris !'}
        </button>
      </div>
    </div>
  );
}

