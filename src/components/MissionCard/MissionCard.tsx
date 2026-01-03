import { useRef, useEffect } from "react";
import { Box, Card, Heading, Inset, Text } from "@radix-ui/themes";
import { DifficultyBadge } from "../DifficultyBadge";
import type { Mission } from "../../types";
import styles from "./MissionCard.module.css";
import { useAnimationStore } from "../../stores/animationStore";

interface MissionCardProps {
  mission: Mission;
  compact?: boolean;
}

export function MissionCard({ mission, compact = false }: MissionCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const register = useAnimationStore((state) => state.register);
  const unregister = useAnimationStore((state) => state.unregister);

  useEffect(() => {
    if (!cardRef.current) return;

    register("missionCard", cardRef.current);

    return () => {
      unregister("missionCard");
    };
  }, [register, unregister]);

  return (
    <Card
      ref={cardRef}
      className={`${styles.card} ${compact ? styles.compact : ""}`}
    >
      {mission.banner_image_url && (
        <Inset
          clip={"border-box"}
          side={"top"}
          pb={"current"}
          className={styles.bannerContainer}
        >
          <img
            src={mission.banner_image_url}
            alt={mission.title}
            className={styles.banner}
          />
        </Inset>
      )}

      <Box className={styles.content}>
        <Box className={styles.header}>
          <Heading size={compact ? "4" : "6"} className={styles.title}>
            {mission.title}
          </Heading>
          <DifficultyBadge difficulty={mission.difficulty} />
        </Box>

        <Text as="p" size="4" className={styles.story}>
          {mission.story}
        </Text>

        {!compact && (
          <>
            {mission.setup_image_url && (
              <Box className={styles.setupImageContainer}>
                <img
                  src={mission.setup_image_url}
                  alt="Configuration de la mission"
                  className={styles.setupImage}
                />
              </Box>
            )}

            <Box className={styles.section}>
              <Heading size="4" className={styles.sectionTitle}>
                🎯 Objectif
              </Heading>
              <Text as="p" size="4">
                {mission.objective}
              </Text>
            </Box>

            <Box className={styles.section}>
              <Heading size="4" className={styles.sectionTitle}>
                📋 Contraintes
              </Heading>
              <ul className={styles.list}>
                {mission.constraints.map((constraint, index) => (
                  <li key={index}>
                    <Text size="4">{constraint}</Text>
                  </li>
                ))}
              </ul>
            </Box>

            <Box className={styles.section}>
              <Heading size="4" className={styles.sectionTitle}>
                ✅ Critères de réussite
              </Heading>
              <ul className={styles.list}>
                {mission.success_criteria.map((criterion, index) => (
                  <li key={index}>
                    <Text size="4">{criterion}</Text>
                  </li>
                ))}
              </ul>
            </Box>
          </>
        )}
      </Box>
    </Card>
  );
}
