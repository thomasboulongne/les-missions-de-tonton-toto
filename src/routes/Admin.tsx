import { useState, useEffect } from 'react';
import { Box, Container, Heading, Text, Tabs, Card, Button, Badge, Flex, TextArea } from '@radix-ui/themes';
import { Link } from 'react-router-dom';
import { MissionForm } from '../components/MissionForm';
import { DifficultyBadge } from '../components/DifficultyBadge';
import { OptimizedImage } from '../components/OptimizedImage';
import { getSubmissions, reviewSubmission, getAllMissions, deleteMission } from '../lib/api';
import type { MissionWithSubmissions, Mission, SubmissionStatus, SubmissionWithMission } from '../types';
import styles from './Admin.module.css';

export function Admin() {
  const [submissions, setSubmissions] = useState<SubmissionWithMission[]>([]);
  const [missions, setMissions] = useState<MissionWithSubmissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewNotes, setReviewNotes] = useState<Record<number, string>>({});
  const [editingMission, setEditingMission] = useState<Mission | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [submissionsData, missionsData] = await Promise.all([
        getSubmissions(),
        getAllMissions(),
      ]);
      setSubmissions(submissionsData as SubmissionWithMission[]);
      setMissions(missionsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleReview = async (id: number, status: SubmissionStatus) => {
    try {
      await reviewSubmission(id, {
        status,
        review_notes: reviewNotes[id] || undefined,
      });
      await fetchData();
    } catch (err) {
      console.error('Error reviewing submission:', err);
    }
  };

  const handleSaveNotes = async (id: number, currentStatus: SubmissionStatus) => {
    try {
      await reviewSubmission(id, {
        status: currentStatus,
        review_notes: reviewNotes[id] || undefined,
      });
      await fetchData();
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  };

  const handleDeleteMission = async (id: number) => {
    if (!confirm('Supprimer cette mission et toutes ses soumissions ?')) return;
    try {
      await deleteMission(id);
      await fetchData();
    } catch (err) {
      console.error('Error deleting mission:', err);
    }
  };

  const handleEditMission = (mission: Mission) => {
    setEditingMission(mission);
  };

  const handleEditSuccess = async () => {
    setEditingMission(null);
    await fetchData();
  };

  const handleCancelEdit = () => {
    setEditingMission(null);
  };

  const pendingCount = submissions.filter((s) => s.status === 'pending').length;

  const getStatusBadge = (status: SubmissionStatus) => {
    switch (status) {
      case 'approved':
        return <Badge color="green">✓ Validé</Badge>;
      case 'needs_work':
        return <Badge color="orange">💪 À retravailler</Badge>;
      default:
        return <Badge color="gray">⏳ En attente</Badge>;
    }
  };

  return (
    <Container size="4" className={styles.container}>
      <Link to="/" className={styles.backLink}>
        ← Retour à la mission en cours
      </Link>

      <Heading size="7" className={styles.title}>
        🔧 Administration
      </Heading>

      <Tabs.Root defaultValue="missions">
        <Tabs.List className={styles.tabsList}>
          <Tabs.Trigger value="new" className={styles.tabTrigger}>
            ✨ Nouvelle mission
          </Tabs.Trigger>
          <Tabs.Trigger value="missions" className={styles.tabTrigger}>
            📋 Missions ({missions.length})
          </Tabs.Trigger>
          <Tabs.Trigger value="submissions" className={styles.tabTrigger}>
            📝 Soumissions
            {pendingCount > 0 && (
              <Badge color="red" size="1" ml="2">{pendingCount}</Badge>
            )}
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="4">
          <Tabs.Content value="new">
            <MissionForm onSuccess={fetchData} />
          </Tabs.Content>

          <Tabs.Content value="missions">
            {editingMission ? (
              <MissionForm
                mission={editingMission}
                onSuccess={handleEditSuccess}
                onCancel={handleCancelEdit}
              />
            ) : loading ? (
              <Text>Chargement...</Text>
            ) : missions.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text>Aucune mission créée.</Text>
              </Box>
            ) : (
              <Box className={styles.missionsList}>
                {missions.map((mission) => (
                  <Card key={mission.id} className={styles.missionCard}>
                    <Flex justify="between" align="start" gap="3">
                      <Box style={{ flex: 1 }}>
                        <Flex align="center" gap="2" mb="2">
                          <Text size="1" color="gray">#{mission.id}</Text>
                          <DifficultyBadge difficulty={mission.difficulty} />
                          {mission.submissions.length > 0 && (
                            <Badge color="green" size="1">
                              {mission.submissions.length} soumission{mission.submissions.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </Flex>
                        <Heading size="4" className={styles.missionTitle}>
                          {mission.title}
                        </Heading>
                        <Text size="2" color="gray">
                          {mission.objective}
                        </Text>
                        <Text size="1" color="gray" mt="2" style={{ display: 'block' }}>
                          Créée le {new Date(mission.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </Box>
                      <Flex gap="2">
                        <Button
                          variant="soft"
                          color="blue"
                          size="1"
                          onClick={() => handleEditMission(mission)}
                        >
                          ✏️ Modifier
                        </Button>
                        <Button
                          variant="soft"
                          color="red"
                          size="1"
                          onClick={() => handleDeleteMission(mission.id)}
                        >
                          🗑️ Supprimer
                        </Button>
                      </Flex>
                    </Flex>
                  </Card>
                ))}
              </Box>
            )}
          </Tabs.Content>

          <Tabs.Content value="submissions">
            {loading ? (
              <Text>Chargement...</Text>
            ) : submissions.length === 0 ? (
              <Box className={styles.emptyState}>
                <Text>Aucune soumission.</Text>
              </Box>
            ) : (
              <Box className={styles.submissionsList}>
                {submissions.map((submission) => (
                  <Card
                    key={submission.id}
                    className={`${styles.submissionCard} ${
                      submission.status === 'approved'
                        ? styles.approved
                        : submission.status === 'needs_work'
                          ? styles.needsWork
                          : styles.pending
                    }`}
                  >
                    <Flex justify="between" align="start" mb="3">
                      <Box>
                        <Heading size="3" className={styles.submissionTitle}>
                          {submission.mission_title}
                        </Heading>
                        <Text size="2" color="gray">
                          Soumis le {new Date(submission.submitted_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Box>
                      {getStatusBadge(submission.status)}
                    </Flex>

                    <Box className={styles.submissionContent}>
                      <Text as="p" size="2" mb="2">
                        <strong>Ce qui s'est passé :</strong>
                      </Text>
                      <Text as="p" size="2" className={styles.submissionText}>
                        {submission.what_happened}
                      </Text>

                      {submission.what_was_hard && (
                        <>
                          <Text as="p" size="2" mb="2" mt="3">
                            <strong>Difficultés :</strong>
                          </Text>
                          <Text as="p" size="2" className={styles.submissionText}>
                            {submission.what_was_hard}
                          </Text>
                        </>
                      )}

                      {submission.link_url && (
                        <Text as="p" size="2" mt="3">
                          <strong>Lien :</strong>{' '}
                          <a href={submission.link_url} target="_blank" rel="noopener noreferrer">
                            {submission.link_url}
                          </a>
                        </Text>
                      )}

                      {submission.media_url && (
                        <Box mt="3">
                          <Text as="p" size="2" mb="2">
                            <strong>Média :</strong>
                          </Text>
                          <a href={submission.media_url} target="_blank" rel="noopener noreferrer">
                            <OptimizedImage
                              src={submission.media_url}
                              alt="Média soumis"
                              className={styles.mediaPreview}
                              sizes="300px"
                              widths={[300, 600]}
                              quality={80}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </a>
                          <a href={submission.media_url} target="_blank" rel="noopener noreferrer">
                            🔗 Voir le média
                          </a>
                        </Box>
                      )}
                    </Box>

                    <Box className={styles.reviewSection}>
                      <Text as="label" size="2" weight="bold" className={styles.label}>
                        Message pour ton neveu :
                      </Text>
                      <TextArea
                        placeholder="Écris un message encourageant..."
                        value={reviewNotes[submission.id] ?? submission.review_notes ?? ''}
                        onChange={(e) => setReviewNotes({
                          ...reviewNotes,
                          [submission.id]: e.target.value,
                        })}
                        rows={2}
                        className={styles.reviewTextarea}
                      />
                      <Flex gap="2" mt="3" wrap="wrap">
                        {submission.status === 'pending' && (
                          <>
                            <Button
                              color="green"
                              onClick={() => handleReview(submission.id, 'approved')}
                            >
                              🎉 Approuver
                            </Button>
                            <Button
                              color="orange"
                              onClick={() => handleReview(submission.id, 'needs_work')}
                            >
                              💪 À retravailler
                            </Button>
                          </>
                        )}
                        {submission.status === 'approved' && (
                          <>
                            <Button
                              variant="soft"
                              color="orange"
                              onClick={() => handleReview(submission.id, 'needs_work')}
                            >
                              💪 Changer en "À retravailler"
                            </Button>
                            <Button
                              variant="soft"
                              onClick={() => handleReview(submission.id, 'pending')}
                            >
                              ↩ Remettre en attente
                            </Button>
                          </>
                        )}
                        {submission.status === 'needs_work' && (
                          <>
                            <Button
                              color="green"
                              onClick={() => handleReview(submission.id, 'approved')}
                            >
                              🎉 Approuver
                            </Button>
                            <Button
                              variant="soft"
                              onClick={() => handleReview(submission.id, 'pending')}
                            >
                              ↩ Remettre en attente
                            </Button>
                          </>
                        )}
                        <Button
                          variant="soft"
                          onClick={() => handleSaveNotes(submission.id, submission.status)}
                        >
                          💾 Sauvegarder le message
                        </Button>
                      </Flex>
                    </Box>
                  </Card>
                ))}
              </Box>
            )}
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Container>
  );
}
