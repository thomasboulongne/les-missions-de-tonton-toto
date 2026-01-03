import { useState, useRef, useCallback } from 'react';
import { Box, Text, Flex, Button } from '@radix-ui/themes';
import { uploadImage } from '../../lib/api';
import styles from './ImageUpload.module.css';

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload({ label, value, onChange, placeholder }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.';
    }
    if (file.size > MAX_SIZE) {
      return 'Fichier trop volumineux. Taille maximum : 5 Mo.';
    }
    return null;
  };

  const handleUpload = useCallback(async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsUploading(true);

    // Show preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const url = await uploadImage(file);
      onChange(url);
      setPreviewUrl(null); // Clear local preview, use actual URL
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'envoi');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  }, [onChange]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleUpload(files[0]);
    }
  }, [handleUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleUpload(files[0]);
    }
    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [handleUpload]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemove = useCallback(() => {
    onChange('');
    setPreviewUrl(null);
    setError(null);
  }, [onChange]);

  const displayUrl = previewUrl || value;

  return (
    <Box>
      <Text as="label" size="2" weight="bold" className={styles.label}>
        {label}
      </Text>

      {displayUrl ? (
        <Box className={styles.previewContainer}>
          <img src={displayUrl} alt="Aperçu" className={styles.preview} />
          <Flex className={styles.previewOverlay} align="center" justify="center" gap="2">
            {isUploading ? (
              <Text className={styles.uploadingText}>Envoi en cours...</Text>
            ) : (
              <>
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  onClick={handleClick}
                  className={styles.changeButton}
                >
                  Changer
                </Button>
                <Button
                  type="button"
                  size="1"
                  variant="soft"
                  color="red"
                  onClick={handleRemove}
                  className={styles.removeButton}
                >
                  Supprimer
                </Button>
              </>
            )}
          </Flex>
        </Box>
      ) : (
        <Box
          className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <Flex direction="column" align="center" gap="2">
            {isUploading ? (
              <>
                <div className={styles.spinner} />
                <Text size="2" color="gray">Envoi en cours...</Text>
              </>
            ) : (
              <>
                <Text size="4" className={styles.icon}>📷</Text>
                <Text size="2" color="gray">
                  {placeholder || 'Glissez une image ou cliquez pour parcourir'}
                </Text>
                <Text size="1" color="gray">
                  JPEG, PNG, GIF, WebP • Max 5 Mo
                </Text>
              </>
            )}
          </Flex>
        </Box>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFileSelect}
        className={styles.hiddenInput}
      />

      {error && (
        <Text size="2" color="red" className={styles.error}>
          {error}
        </Text>
      )}
    </Box>
  );
}

