import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Button, Container, Text, Flex } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { MissionCard } from "../components/MissionCard";
import { HintsSection } from "../components/HintsSection";
import { SubmissionDialog } from "../components/SubmissionDialog";
import { Header } from "../components/Header";
import { getCurrentMission } from "../lib/api";
import { useAnimationStateMachine } from "../hooks/useAnimationStateMachine";
import { useAnimationStore } from "../stores/animationStore";
import type { Mission } from "../types";
import styles from "./Home.module.css";

export function Home() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const subtitleRef = useRef<HTMLSpanElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const register = useAnimationStore((state) => state.register);
  const elements = useAnimationStore((state) => state.elements);

  // Use the FSM for animation orchestration
  const {
    send,
    onMissionLoaded,
    isHeaderComplete,
    isAnimatingLoading,
    showMission,
  } = useAnimationStateMachine();

  // Start header animation when header elements are ready
  useEffect(() => {
    if (elements.svgBanner && elements.heading) {
      send("HEADER_READY");
    }
  }, [elements.svgBanner, elements.heading, send]);

  // Register subtitle for animation when mission is available
  // Must depend on showMission so effect re-runs when subtitle first renders
  useEffect(() => {
    if (subtitleRef.current) {
      register("subtitle", subtitleRef.current);
    }
  }, [register, mission, showMission]);

  // Register loading state element for animation
  useEffect(() => {
    if (loadingRef.current) {
      register("loadingState", loadingRef.current);
    }
  }, [register]);

  const fetchMission = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCurrentMission();
      setMission(data);
      // Notify FSM that mission is loaded
      if (data) {
        onMissionLoaded();
      }
    } catch {
      setError("Impossible de charger la mission");
    } finally {
      setLoading(false);
    }
  }, [onMissionLoaded]);

  useEffect(() => {
    fetchMission();
  }, [fetchMission]);

  // Show error state (no animation needed)
  if (error) {
    return (
      <div className={styles.page}>
        <Header />
        <Container size="3" className={styles.container}>
          <Box className={styles.error}>
            <Text size="5" color="red">
              {error}
            </Text>
          </Box>
        </Container>
      </div>
    );
  }

  // Determine what content to show based on FSM state
  // Show loading if: still loading data OR FSM is animating loading state
  const shouldShowLoading = loading || isAnimatingLoading;

  // Show mission when FSM says so (after header complete and ready to animate mission)
  const shouldShowMission = showMission && mission;

  return (
    <div className={styles.page}>
      <Header />
      <Container size="3" className={styles.container}>
        {/* Loading state */}
        {shouldShowLoading && (
          <Box ref={loadingRef} className={styles.loading}>
            <Text size="5">🤖 Chargement de ta mission...</Text>
          </Box>
        )}

        {/* Empty state */}
        {!loading && !mission && isHeaderComplete && (
          <>
            <Text ref={subtitleRef} className={styles.subtitle}>
              Toutes les missions terminées
            </Text>
            <Box className={styles.noMission}>
              <Box className={styles.emptyState}>
                <Text size="5">🎉 Bravo !</Text>
                <Text size="3">
                  Tu as terminé toutes les missions disponibles. Reviens bientôt
                  pour de nouvelles aventures !
                </Text>
                <Link to="/missions">
                  <Button
                    size="3"
                    variant="soft"
                    className={styles.archiveButton}
                  >
                    📚 Voir les archives
                  </Button>
                </Link>
              </Box>
            </Box>
          </>
        )}

        {/* Mission content - render when FSM allows */}
        {shouldShowMission && (
          <>
            <Text ref={subtitleRef} className={styles.subtitle}>
              Mission en cours
            </Text>

            <MissionCard mission={mission} />

            <HintsSection
              missionId={mission.id}
              hint1={mission.hint1}
              hint2={mission.hint2}
            />

            <Flex gap="3" className={styles.actions} justify={"center"}>
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
          </>
        )}
      </Container>
    </div>
  );
}
