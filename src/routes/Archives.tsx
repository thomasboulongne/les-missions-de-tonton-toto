import { useState, useEffect } from 'react';
import { Box, Container, Heading, Text, Card, Badge, Flex, Separator } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { MissionCard } from '../components/MissionCard';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { getAllMissions } from '../lib/api';
import type { MissionWithSubmissions, SubmissionStatus } from '../types';
import styles from './Archives.module.css';

function getStatusBadge(status: SubmissionStatus) {
  switch (status) {
    case 'approved':
      return <Badge color="green" size="1">🎉 Validé</Badge>;
    case 'needs_work':
      return <Badge color="orange" size="1">💪 À retravailler</Badge>;
    default:
      return <Badge color="gray" size="1">⏳ En attente</Badge>;
  }
}

export function Archives() {
  const [missions, setMissions] = useState<MissionWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMission, setExpandedMission] = useState<number | null>(null);

  useEffect(() => {
    const fetchMissions = async () => {
      try {
        setLoading(true);
        const data = await getAllMissions();
        setMissions(data);
      } catch (err) {
        setError('Impossible de charger les missions');
      } finally {
        setLoading(false);
      }
    };
    fetchMissions();
  }, []);

  if (loading) {
    return (
      <Container size="3" className={styles.container}>
        <Box className={styles.loading}>
          <Text size="5">📚 Chargement des archives...</Text>
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

  // Check if any submission in a mission is approved
  const hasApprovedSubmission = (submissions: MissionWithSubmissions['submissions']) =>
    submissions.some(s => s.status === 'approved');

  return (
    <Container size="3" className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← Retour à la mission en cours
      </Link>

      <Heading size="7" className={styles.title}>
        📚 Archives des missions
      </Heading>

      <Text className={styles.subtitle}>
        {missions.length} mission{missions.length > 1 ? 's' : ''} au total
      </Text>

      {missions.length === 0 ? (
        <Box className={styles.emptyState}>
          <Text size="4">Aucune mission pour le moment.</Text>
        </Box>
      ) : (
        <Box className={styles.missionsList}>
          {missions.map((mission) => (
            <Card
              key={mission.id}
              className={`${styles.missionItem} ${hasApprovedSubmission(mission.submissions) ? styles.completed : ''}`}
              onClick={() => setExpandedMission(expandedMission === mission.id ? null : mission.id)}
            >
              <Flex justify="between" align="start" gap="3">
                <Box className={styles.missionInfo}>
                  <Flex align="center" gap="2" mb="2">
                    <Text size="1" color="gray">
                      #{mission.id}
                    </Text>
                    {hasApprovedSubmission(mission.submissions) ? (
                      <Badge color="green" size="1">🎉 Réussi</Badge>
                    ) : mission.submissions.length > 0 ? (
                      <Badge color="blue" size="1">📝 Soumis</Badge>
                    ) : null}
                  </Flex>
                  <Heading size="4" className={styles.missionTitle}>
                    {mission.title}
                  </Heading>
                  <Text size="2" color="gray" className={styles.missionDate}>
                    {new Date(mission.created_at).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                </Box>
                <DifficultyBadge difficulty={mission.difficulty} />
              </Flex>

              {expandedMission === mission.id && (
                <Box className={styles.expandedContent}>
                  <Separator size="4" my="3" />

                  <MissionCard mission={mission} compact />

                  {mission.submissions.length > 0 && (
                    <Box className={styles.submissionsSection}>
                      <Heading size="3" className={styles.submissionsTitle}>
                        📝 Mes soumissions
                      </Heading>
                      {mission.submissions.map((submission) => (
                        <Card key={submission.id} className={styles.submissionCard}>
                          <Flex justify="between" align="start" mb="2">
                            <Text size="2" color="gray">
                              {new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </Text>
                            {getStatusBadge(submission.status)}
                          </Flex>

                          <Text as="p" size="2" className={styles.submissionText}>
                            <strong>Ce qui s'est passé :</strong> {submission.what_happened}
                          </Text>

                          {submission.what_was_hard && (
                            <Text as="p" size="2" className={styles.submissionText}>
                              <strong>Difficultés :</strong> {submission.what_was_hard}
                            </Text>
                          )}

                          {submission.media_url && (
                            <Box className={styles.mediaPreview}>
                              <a href={submission.media_url} target="_blank" rel="noopener noreferrer">
                                📷 Voir le média
                              </a>
                            </Box>
                          )}

                          {submission.review_notes && (
                            <Box className={styles.reviewNotes}>
                              <Text size="2">
                                <strong>🤖 Message de Tonton Toto :</strong> {submission.review_notes}
                              </Text>
                            </Box>
                          )}
                        </Card>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              <Text size="1" color="gray" className={styles.expandHint}>
                {expandedMission === mission.id ? '▲ Réduire' : '▼ Voir plus'}
              </Text>
            </Card>
          ))}
        </Box>
      )}
    </Container>
  );
}
