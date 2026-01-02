import { useState } from 'react';
import { Box, Button, Flex, Text, TextArea, TextField, Select, Heading } from '@radix-ui/themes';
import { createMission } from '../../lib/api';
import type { CreateMissionInput, Difficulty } from '../../types';
import styles from './MissionForm.module.css';

interface MissionFormProps {
  onSuccess?: () => void;
}

export function MissionForm({ onSuccess }: MissionFormProps) {
  const [title, setTitle] = useState('');
  const [story, setStory] = useState('');
  const [objective, setObjective] = useState('');
  const [constraintsText, setConstraintsText] = useState('');
  const [criteriaText, setCriteriaText] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [bannerImageUrl, setBannerImageUrl] = useState('');
  const [setupImageUrl, setSetupImageUrl] = useState('');
  const [hint1, setHint1] = useState('');
  const [hint2, setHint2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const constraints = constraintsText
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const success_criteria = criteriaText
        .split('\n')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const data: CreateMissionInput = {
        title,
        story,
        objective,
        constraints,
        success_criteria,
        difficulty,
        banner_image_url: bannerImageUrl || undefined,
        setup_image_url: setupImageUrl || undefined,
        hint1: hint1 || undefined,
        hint2: hint2 || undefined,
      };

      await createMission(data);
      setSuccess(true);

      // Reset form
      setTitle('');
      setStory('');
      setObjective('');
      setConstraintsText('');
      setCriteriaText('');
      setDifficulty('easy');
      setBannerImageUrl('');
      setSetupImageUrl('');
      setHint1('');
      setHint2('');

      setTimeout(() => {
        setSuccess(false);
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError('Erreur lors de la création de la mission');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box className={styles.container}>
      <Heading size="5" className={styles.heading}>
        Nouvelle mission
      </Heading>

      {success && (
        <Box className={styles.successMessage}>
          ✅ Mission créée avec succès !
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <Flex direction="column" gap="4">
          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Titre *
            </Text>
            <TextField.Root
              placeholder="Le Robot Danseur"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Histoire (accroche) *
            </Text>
            <TextArea
              placeholder="Tonton Toto a découvert que son mBot2 adore la musique..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              required
              rows={3}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Objectif *
            </Text>
            <TextField.Root
              placeholder="Programme le mBot2 pour qu'il fasse une danse de 10 secondes"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              required
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Contraintes * (une par ligne)
            </Text>
            <TextArea
              placeholder="Utilise au moins 3 mouvements différents&#10;Le robot doit tourner au moins une fois"
              value={constraintsText}
              onChange={(e) => setConstraintsText(e.target.value)}
              required
              rows={3}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Critères de réussite * (un par ligne)
            </Text>
            <TextArea
              placeholder="Le robot bouge pendant au moins 10 secondes&#10;On voit au moins 3 mouvements distincts"
              value={criteriaText}
              onChange={(e) => setCriteriaText(e.target.value)}
              required
              rows={3}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Difficulté
            </Text>
            <Select.Root value={difficulty} onValueChange={(v) => setDifficulty(v as Difficulty)}>
              <Select.Trigger className={styles.select} />
              <Select.Content>
                <Select.Item value="easy">⭐ Facile</Select.Item>
                <Select.Item value="tricky">⚡ Costaud</Select.Item>
                <Select.Item value="expert">🚀 Expert</Select.Item>
              </Select.Content>
            </Select.Root>
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              URL de l'image bannière
            </Text>
            <TextField.Root
              placeholder="https://..."
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              type="url"
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              URL de l'image de configuration
            </Text>
            <TextField.Root
              placeholder="https://..."
              value={setupImageUrl}
              onChange={(e) => setSetupImageUrl(e.target.value)}
              type="url"
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Indice 1
            </Text>
            <TextArea
              placeholder="Premier indice pour aider..."
              value={hint1}
              onChange={(e) => setHint1(e.target.value)}
              rows={2}
            />
          </Box>

          <Box>
            <Text as="label" size="2" weight="bold" className={styles.label}>
              Indice 2
            </Text>
            <TextArea
              placeholder="Deuxième indice si besoin..."
              value={hint2}
              onChange={(e) => setHint2(e.target.value)}
              rows={2}
            />
          </Box>

          {error && (
            <Text color="red" size="2">
              {error}
            </Text>
          )}

          <Button
            type="submit"
            size="3"
            disabled={isSubmitting}
            className={styles.submitButton}
          >
            {isSubmitting ? 'Création en cours...' : '🎯 Créer la mission'}
          </Button>
        </Flex>
      </form>
    </Box>
  );
}

