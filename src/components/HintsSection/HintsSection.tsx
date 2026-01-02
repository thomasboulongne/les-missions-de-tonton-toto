import { useState, useEffect } from 'react';
import { Box, Button, Card, Text, Heading } from '@radix-ui/themes';
import { getRevealedHints, revealHint } from '../../lib/api';
import styles from './HintsSection.module.css';

interface HintsSectionProps {
  missionId: number;
  hint1: string | null;
  hint2: string | null;
}

export function HintsSection({ missionId, hint1, hint2 }: HintsSectionProps) {
  const [revealed, setRevealed] = useState({ hint1: false, hint2: false });

  useEffect(() => {
    setRevealed(getRevealedHints(missionId));
  }, [missionId]);

  const handleReveal = (hintNumber: 1 | 2) => {
    revealHint(missionId, hintNumber);
    setRevealed(getRevealedHints(missionId));
  };

  if (!hint1 && !hint2) {
    return null;
  }

  return (
    <Box className={styles.container}>
      <Heading size="4" className={styles.title}>
        💡 Indices
      </Heading>

      {hint1 && (
        <Card className={styles.hintCard}>
          {revealed.hint1 ? (
            <Box>
              <Text weight="bold" className={styles.hintLabel}>Indice 1 :</Text>
              <Text className={styles.hintText}>{hint1}</Text>
            </Box>
          ) : (
            <Button
              size="3"
              variant="soft"
              className={styles.revealButton}
              onClick={() => handleReveal(1)}
            >
              {"🔍 Révéler l'indice 1"}
            </Button>
          )}
        </Card>
      )}

      {hint2 && (
        <Card className={styles.hintCard}>
          {revealed.hint2 ? (
            <Box>
              <Text weight="bold" className={styles.hintLabel}>Indice 2 :</Text>
              <Text className={styles.hintText}>{hint2}</Text>
            </Box>
          ) : (
            <Button
              size="3"
              variant="soft"
              className={styles.revealButton}
              onClick={() => handleReveal(2)}
              disabled={!revealed.hint1}
            >
              {revealed.hint1 ? "🔍 Révéler l'indice 2" : "🔒 Révèle d'abord l'indice 1"}
            </Button>
          )}
        </Card>
      )}
    </Box>
  );
}

