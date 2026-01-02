import { Badge } from '@radix-ui/themes';
import type { Difficulty } from '../../types';
import styles from './DifficultyBadge.module.css';

interface DifficultyBadgeProps {
  difficulty: Difficulty;
}

const difficultyConfig: Record<Difficulty, { label: string; icon: string; color: 'green' | 'orange' | 'red' }> = {
  easy: { label: 'Facile', icon: '⭐', color: 'green' },
  tricky: { label: 'Costaud', icon: '⚡', color: 'orange' },
  expert: { label: 'Expert', icon: '🚀', color: 'red' },
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty];

  return (
    <Badge size="2" color={config.color} className={styles.badge}>
      <span className={styles.icon}>{config.icon}</span>
      {config.label}
    </Badge>
  );
}

