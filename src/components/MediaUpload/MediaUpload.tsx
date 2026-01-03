import { useState, useRef, useCallback } from 'react';
import { Box, Text, Flex, Button } from '@radix-ui/themes';
import { uploadMedia } from '../../lib/api';
import styles from './MediaUpload.module.css';

interface MediaUploadProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  acceptVideo?: boolean;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

function isVideoFile(file: File): boolean {
  return ALLOWED_VIDEO_TYPES.includes(file.type);
}

function isVideoUrl(url: string): boolean {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.m4v'];
  return videoExtensions.some(ext => url.toLowerCase().includes(ext));
}

export function MediaUpload({ label, value, onChange, placeholder, acceptVideo = true }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewIsVideo, setPreviewIsVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedTypes = acceptVideo
    ? [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES]
    : ALLOWED_IMAGE_TYPES;

  const validateFile = (file: File): string | null => {
    const isVideo = isVideoFile(file);

    if (!allowedTypes.includes(file.type)) {
      if (acceptVideo) {
        return 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF, WebP, MP4, WebM ou MOV.';
      }
      return 'Type de fichier non supporté. Utilisez JPEG, PNG, GIF ou WebP.';
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const maxSizeLabel = isVideo ? '100 Mo' : '5 Mo';

    if (file.size > maxSize) {
      return `Fichier trop volumineux. Taille maximum : ${maxSizeLabel}.`;
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
    setPreviewIsVideo(isVideoFile(file));

    try {
      const url = await uploadMedia(file);
      onChange(url);
      setPreviewUrl(null); // Clear local preview, use actual URL
      setPreviewIsVideo(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de l\'envoi');
      setPreviewUrl(null);
      setPreviewIsVideo(false);
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(localPreview);
    }
  }, [onChange, allowedTypes, acceptVideo]);

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
    setPreviewIsVideo(false);
    setError(null);
  }, [onChange]);

  const displayUrl = previewUrl || value;
  const showAsVideo = previewIsVideo || (value && isVideoUrl(value));

  const acceptString = allowedTypes.join(',');
  const formatHint = acceptVideo
    ? 'JPEG, PNG, GIF, WebP, MP4, WebM, MOV • Max 5 Mo (images) / 100 Mo (vidéos)'
    : 'JPEG, PNG, GIF, WebP • Max 5 Mo';

  return (
    <Box>
      <Text as="label" size="2" weight="bold" className={styles.label}>
        {label}
      </Text>

      {displayUrl ? (
        <Box className={styles.previewContainer}>
          {showAsVideo ? (
            <video
              src={displayUrl}
              className={styles.preview}
              controls
              playsInline
            />
          ) : (
            <img src={displayUrl} alt="Aperçu" className={styles.preview} />
          )}
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
                <Text size="4" className={styles.icon}>{acceptVideo ? '📷🎬' : '📷'}</Text>
                <Text size="2" color="gray">
                  {placeholder || (acceptVideo
                    ? 'Glissez une image ou vidéo, ou cliquez pour parcourir'
                    : 'Glissez une image ou cliquez pour parcourir'
                  )}
                </Text>
                <Text size="1" color="gray">
                  {formatHint}
                </Text>
              </>
            )}
          </Flex>
        </Box>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptString}
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

