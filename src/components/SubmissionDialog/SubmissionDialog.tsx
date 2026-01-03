import { useState } from 'react';
import { Dialog, Button, Flex, Text, TextArea, TextField, Box } from '@radix-ui/themes';
import { createSubmission } from '../../lib/api';
import { MediaUpload } from '../MediaUpload';
import styles from './SubmissionDialog.module.css';

interface SubmissionDialogProps {
  missionId: number;
  missionTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function SubmissionDialog({
  missionId,
  missionTitle,
  open,
  onOpenChange,
  onSuccess,
}: SubmissionDialogProps) {
  const [whatHappened, setWhatHappened] = useState('');
  const [whatWasHard, setWhatWasHard] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUrl2, setMediaUrl2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await createSubmission({
        mission_id: missionId,
        what_happened: whatHappened,
        what_was_hard: whatWasHard || undefined,
        link_url: linkUrl || undefined,
        media_url: mediaUrl || undefined,
        media_url_2: mediaUrl2 || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setWhatHappened('');
        setWhatWasHard('');
        setLinkUrl('');
        setMediaUrl('');
        setMediaUrl2('');
        onSuccess?.();
      }, 2000);
    } catch (err) {
      setError('Oups ! Une erreur est survenue. Réessaie !');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setWhatHappened('');
    setWhatWasHard('');
    setLinkUrl('');
    setMediaUrl('');
    setMediaUrl2('');
    setError(null);
    setSuccess(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <Dialog.Content maxWidth="500px" className={styles.dialog}>
        <Dialog.Title className={styles.title}>
          🎉 Soumettre ma mission
        </Dialog.Title>
        <Dialog.Description className={styles.description}>
          Mission : <strong>{missionTitle}</strong>
        </Dialog.Description>

        {success ? (
          <Box className={styles.successMessage}>
            <Text size="5">🎊 Bravo !</Text>
            <Text>Ta soumission a été envoyée à Tonton Toto !</Text>
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <Box>
                <Text as="label" size="2" weight="bold" className={styles.label}>
                  Qu'est-ce qui s'est passé ? *
                </Text>
                <TextArea
                  placeholder="Raconte comment s'est passée ta mission..."
                  value={whatHappened}
                  onChange={(e) => setWhatHappened(e.target.value)}
                  required
                  rows={4}
                  className={styles.textarea}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" className={styles.label}>
                  Qu'est-ce qui était difficile ?
                </Text>
                <TextArea
                  placeholder="Y a-t-il eu des trucs compliqués ?"
                  value={whatWasHard}
                  onChange={(e) => setWhatWasHard(e.target.value)}
                  rows={2}
                  className={styles.textarea}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" className={styles.label}>
                  Lien (optionnel)
                </Text>
                <TextField.Root
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  type="url"
                />
              </Box>

              <MediaUpload
                label="🤖 Vidéo du robot en action"
                value={mediaUrl}
                onChange={setMediaUrl}
                placeholder="Montre ton robot qui fait la mission !"
                acceptVideo
              />

              <MediaUpload
                label="💻 Capture d'écran du programme"
                value={mediaUrl2}
                onChange={setMediaUrl2}
                placeholder="Montre ton programme mBlock"
                acceptVideo={false}
              />

              {error && (
                <Text color="red" size="2">
                  {error}
                </Text>
              )}

              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray" type="button">
                    Annuler
                  </Button>
                </Dialog.Close>
                <Button
                  type="submit"
                  disabled={!whatHappened.trim() || isSubmitting}
                  className={styles.submitButton}
                >
                  {isSubmitting ? 'Envoi en cours...' : '🚀 Envoyer !'}
                </Button>
              </Flex>
            </Flex>
          </form>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

