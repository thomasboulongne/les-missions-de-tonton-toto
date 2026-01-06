import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Button, Container, Text, Flex } from "@radix-ui/themes";
import { Link } from "react-router-dom";
import { MissionCard } from "../components/MissionCard";
import { HintsSection } from "../components/HintsSection";
import { SubmissionDialog } from "../components/SubmissionDialog";
import { FeedbackCard } from "../components/FeedbackCard";
import { Header } from "../components/Header";
import { getCurrentMission, getUnreadReviews } from "../lib/api";
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  getLastSeenReviewTime,
  markReviewsAsSeen,
  hasPushPermissionBeenAsked,
  markPushPermissionAsked,
} from "../lib/pushNotifications";
import { useAnimationStateMachine } from "../hooks/useAnimationStateMachine";
import { useAnimationStore } from "../stores/animationStore";
import type { Mission, SubmissionWithMission } from "../types";
import styles from "./Home.module.css";

export function Home() {
  const [mission, setMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unreadReviews, setUnreadReviews] = useState<SubmissionWithMission[]>(
    []
  );
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const subtitleRef = useRef<HTMLSpanElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const register = useAnimationStore((state) => state.register);
  const elements = useAnimationStore((state) => state.elements);

  // Use the FSM for animation orchestration
  const {
    send,
    onMissionLoaded,
    onLoadingElementReady,
    onMissionContentReady,
    isHeaderComplete,
    isAwaitingLoading,
    isAnimatingLoading,
    showMission,
  } = useAnimationStateMachine();

  // Start header animation when header elements are ready
  useEffect(() => {
    if (elements.svgBanner && elements.heading) {
      send("HEADER_READY");
    }
  }, [elements.svgBanner, elements.heading, send]);

  // Register and notify FSM when loading element is ready
  useEffect(() => {
    if (loadingRef.current) {
      register("loadingState", loadingRef.current);
      onLoadingElementReady();
    }
  }, [register, onLoadingElementReady]);

  // Register subtitle when it renders
  useEffect(() => {
    if (subtitleRef.current) {
      register("subtitle", subtitleRef.current);
    }
  }, [register, mission, showMission]);

  // Notify FSM when mission content elements are ready
  useEffect(() => {
    if (elements.subtitle && elements.missionCard) {
      onMissionContentReady();
    }
  }, [elements.subtitle, elements.missionCard, onMissionContentReady]);

  // Check for unread reviews
  const checkUnreadReviews = useCallback(async () => {
    try {
      const lastSeen = getLastSeenReviewTime();
      // If never seen, use a date far in the past
      const since = lastSeen || "1970-01-01T00:00:00.000Z";
      const reviews = await getUnreadReviews(since);
      setUnreadReviews(reviews);
    } catch (err) {
      console.error("Error checking unread reviews:", err);
    }
  }, []);

  const fetchMission = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCurrentMission();
      setMission(data);
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
    checkUnreadReviews();
  }, [fetchMission, checkUnreadReviews]);

  // Check if we should show push notification prompt
  useEffect(() => {
    if (!isPushSupported()) return;

    const permission = getNotificationPermission();
    const alreadyAsked = hasPushPermissionBeenAsked();

    // Show prompt if:
    // - Permission is 'default' (not yet asked)
    // - We haven't prompted before
    // - Mission is loaded (don't interrupt loading)
    if (permission === "default" && !alreadyAsked && showMission) {
      // Delay the prompt a bit so it doesn't appear immediately
      const timer = setTimeout(() => {
        setShowPushPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showMission]);

  const handleDismissFeedback = () => {
    markReviewsAsSeen();
    setUnreadReviews([]);
  };

  const handleEnablePush = async () => {
    markPushPermissionAsked();
    setShowPushPrompt(false);
    await subscribeToPush();
  };

  const handleDismissPushPrompt = () => {
    markPushPermissionAsked();
    setShowPushPrompt(false);
  };

  // Error state (no animation)
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

  // Show loading when: fetching data OR FSM is awaiting/animating loading
  const shouldShowLoading = loading || isAwaitingLoading || isAnimatingLoading;

  // Render mission content early (hidden) so elements register before animation
  const shouldRenderMission = mission;

  // Show the most recent unread review
  const latestUnreadReview = unreadReviews.length > 0 ? unreadReviews[0] : null;

  return (
    <div className={styles.page}>
      <Header />
      <Container size="3" className={styles.container}>
        {/* Feedback card for unread reviews */}
        {latestUnreadReview && !shouldShowLoading && (
          <FeedbackCard
            submission={latestUnreadReview}
            onDismiss={handleDismissFeedback}
          />
        )}

        {/* Push notification prompt */}
        {showPushPrompt && (
          <Box className={styles.pushPrompt}>
            <Text size="2">
              🔔 Recevoir une notification quand Tonton Toto répond ?
            </Text>
            <Flex gap="2" mt="2">
              <Button size="1" onClick={handleEnablePush}>
                Oui !
              </Button>
              <Button size="1" variant="soft" onClick={handleDismissPushPrompt}>
                Plus tard
              </Button>
            </Flex>
          </Box>
        )}

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

        {/* Mission content - render early so elements register before animation
            Elements start with opacity: 0 in CSS, animation will reveal them */}
        {shouldRenderMission && (
          <>
            <Text ref={subtitleRef} className={styles.subtitle}>
              Mission en cours
            </Text>

            <MissionCard mission={mission} />

            {/* Only show interactive elements after animation completes */}
            {showMission && (
              <>
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
          </>
        )}
      </Container>
    </div>
  );
}
