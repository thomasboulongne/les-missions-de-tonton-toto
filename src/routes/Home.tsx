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
  getLastSeenReviewTime,
  markReviewsAsSeen,
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

  const subtitleRef = useRef<HTMLSpanElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const noMissionRef = useRef<HTMLDivElement>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const register = useAnimationStore((state) => state.register);
  const elements = useAnimationStore((state) => state.elements);

  // Use the FSM for animation orchestration
  const {
    send,
    onMissionLoaded,
    onLoadingComplete,
    setHasFeedback,
    isAnimatingLoading,
  } = useAnimationStateMachine();

  // Start header animation when header elements are ready
  useEffect(() => {
    if (elements.svgBanner && elements.heading) {
      send("HEADER_READY");
    }
  }, [elements.svgBanner, elements.heading, send]);

  // Register loading element when it renders
  useEffect(() => {
    if (loadingRef.current) {
      register("loadingState", loadingRef.current);
    }
  }, [register, loading, isAnimatingLoading]);

  // Register noMission element when it renders
  useEffect(() => {
    if (noMissionRef.current) {
      register("noMissionState", noMissionRef.current);
    }
  }, [register, loading, mission]);

  // Register subtitle when it renders (for mission state)
  useEffect(() => {
    if (subtitleRef.current && mission) {
      register("subtitle", subtitleRef.current);
    }
  }, [register, mission]);

  // Register feedback card when it renders
  useEffect(() => {
    if (feedbackRef.current) {
      register("feedbackCard", feedbackRef.current);
    }
  }, [register, unreadReviews]);

  // Check for unread reviews
  const checkUnreadReviews = useCallback(async () => {
    try {
      const lastSeen = getLastSeenReviewTime();
      // If never seen, use a date far in the past
      const since = lastSeen || "1970-01-01T00:00:00.000Z";
      const reviews = await getUnreadReviews(since);
      setUnreadReviews(reviews);
      // Notify the animation FSM about feedback state
      setHasFeedback(reviews.length > 0);
    } catch (err) {
      console.error("Error checking unread reviews:", err);
    }
  }, [setHasFeedback]);

  const fetchMission = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCurrentMission();
      setMission(data);

      // Notify FSM when loading completes
      if (data) {
        onMissionLoaded();
      }
    } catch {
      setError("Impossible de charger la mission");
    } finally {
      setLoading(false);
    }
  }, [onMissionLoaded]);

  // Notify FSM when loading completes (whether with mission or not)
  useEffect(() => {
    if (!loading) {
      onLoadingComplete(Boolean(mission));
    }
  }, [loading, mission, onLoadingComplete]);

  useEffect(() => {
    fetchMission();
    checkUnreadReviews();
  }, [fetchMission, checkUnreadReviews]);

  // Show the most recent unread review
  const latestUnreadReview = unreadReviews.length > 0 ? unreadReviews[0] : null;
  const hasApprovedReview = latestUnreadReview?.status === "approved";

  const handleDismissFeedback = () => {
    const wasApproved = latestUnreadReview?.status === "approved";
    const wasCurrentMission = latestUnreadReview?.mission_id === mission?.id;

    markReviewsAsSeen();
    setUnreadReviews([]);
    setHasFeedback(false);

    // If the approved review was for the current mission, clear it to show empty state
    if (wasApproved && wasCurrentMission) {
      setMission(null);
    }
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

  // Conditional rendering: only one content type at a time
  // When showing an approved review, it should be the only content on the page
  const showLoading = loading || isAnimatingLoading;
  const showNoMission = !loading && !mission && !hasApprovedReview;
  const showMission = !loading && Boolean(mission) && !hasApprovedReview;

  return (
    <div className={styles.page}>
      <Header />
      <Container size="3" className={styles.container}>
        {/* Feedback card for unread reviews */}
        {latestUnreadReview && !showLoading && (
          <div ref={feedbackRef} className={styles.feedbackWrapper}>
            <FeedbackCard
              submission={latestUnreadReview}
              onDismiss={handleDismissFeedback}
            />
          </div>
        )}

        {/* Loading state */}
        {showLoading && (
          <Box ref={loadingRef} className={styles.loading}>
            <Text size="5">🤖 Chargement de ta mission...</Text>
          </Box>
        )}

        {/* Empty state */}
        {showNoMission && (
          <Box ref={noMissionRef} className={styles.noMission}>
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
        )}

        {/* Mission content */}
        {showMission && mission && (
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
