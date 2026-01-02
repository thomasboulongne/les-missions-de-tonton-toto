import { useState, useEffect } from 'react';
import { Box, Button, Container, Heading, Text, Flex } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { MissionCard } from '../components/MissionCard';
import { HintsSection } from '../components/HintsSection';
import { SubmissionDialog } from '../components/SubmissionDialog';
import { getCurrentMission } from '../lib/api';
import type { Mission } from '../types';
import styles from './Home.module.css';

export function Home() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchMission = async () => {
    try {
      setLoading(true);
      const data = await getCurrentMission();
      setMission(data);
    } catch (err) {
      setError('Impossible de charger la mission');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
  }, []);

  if (loading) {
    return (
      <Container size="3" className={styles.container}>
        <Box className={styles.loading}>
          <Text size="5">🤖 Chargement de ta mission...</Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="3" className={styles.container}>
        <Box className={styles.error}>
          <Text size="5" color="red">{error}</Text>
        </Box>
      </Container>
    );
  }

  if (!mission) {
    return (
      <Container size="3" className={styles.container}>
        <Box className={styles.noMission}>
          <Heading size="7" className={styles.title}>
            🤖 Les missions de Tonton Toto
          </Heading>
          <Box className={styles.emptyState}>
            <Text size="5">🎉 Bravo !</Text>
            <Text size="3">
              Tu as terminé toutes les missions disponibles. Reviens bientôt pour de nouvelles aventures !
            </Text>
            <Link to="/missions">
              <Button size="3" variant="soft" className={styles.archiveButton}>
                📚 Voir les archives
              </Button>
            </Link>
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container size="3" className={styles.container}>
      <Heading size="7" className={styles.title}>
        🤖 Les missions de Tonton Toto
      </Heading>

      <Text className={styles.subtitle}>
        Mission en cours
      </Text>

      <MissionCard mission={mission} />

      <HintsSection
        missionId={mission.id}
        hint1={mission.hint1}
        hint2={mission.hint2}
      />

      <Flex gap="3" className={styles.actions}>
        <Button
          size="4"
          className={styles.submitButton}
          onClick={() => setDialogOpen(true)}
        >
          🎉 J'ai terminé ma mission !
        </Button>

        <Link to="/missions">
          <Button size="4" variant="soft">
            📚 Archives
          </Button>
        </Link>
      </Flex>

      <SubmissionDialog
        missionId={mission.id}
        missionTitle={mission.title}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchMission}
      />
    </Container>
  );
}

