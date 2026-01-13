import { useEffect, useRef, useCallback } from "react";
import useStateMachine from "@cassiozen/usestatemachine";
import gsap from "gsap";
import { random } from "gsap/all";
import { useAnimationStore } from "../stores/animationStore";
import type {
  SvgBannerElements,
  HeadingElements,
} from "../stores/animationStore";

/**
 * Animation State Machine
 *
 * States flow:
 * idle → animatingHeader → decidingContent
 *   → animatingFeedback → complete (feedback card has priority)
 *   → animatingLoading → (animatingMission | animatingNoMission) → complete
 *   → animatingNoMission → complete
 *   → animatingMission → complete
 *
 * Content always renders hidden (opacity: 0). After header completes,
 * we check what content is present and animate it in.
 */
const animationMachineDefinition = {
  initial: "idle" as const,
  states: {
    idle: {
      on: {
        HEADER_READY: "animatingHeader",
      },
    },
    animatingHeader: {
      on: {
        HEADER_COMPLETE: "decidingContent",
        MISSION_LOADED: "animatingHeader", // Stay, just track that mission loaded
        LOADING_COMPLETE: "animatingHeader", // Stay, just track loading state
      },
    },
    decidingContent: {
      on: {
        SHOW_FEEDBACK: "animatingFeedback",
        SHOW_LOADING: "animatingLoading",
        SHOW_NO_MISSION: "animatingNoMission",
        SHOW_MISSION: "animatingMission",
      },
    },
    animatingFeedback: {
      on: {
        ANIMATION_COMPLETE: "complete",
      },
    },
    animatingLoading: {
      on: {
        MISSION_LOADED: "animatingMission",
        LOADING_COMPLETE_NO_MISSION: "animatingNoMission",
      },
    },
    animatingNoMission: {
      on: {
        ANIMATION_COMPLETE: "complete",
      },
    },
    animatingMission: {
      on: {
        ANIMATION_COMPLETE: "complete",
      },
    },
    complete: {},
  },
};

interface ContentState {
  isLoading: boolean;
  hasMission: boolean;
  hasFeedback: boolean;
}

export function useAnimationStateMachine() {
  const reset = useAnimationStore((state) => state.reset);

  const headerTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const contentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const contentStateRef = useRef<ContentState>({
    isLoading: true,
    hasMission: false,
    hasFeedback: false,
  });

  const [state, send] = useStateMachine(animationMachineDefinition);

  // Get elements directly from store
  const getElements = useCallback(
    () => useAnimationStore.getState().elements,
    []
  );

  // Callbacks for external triggers
  const onMissionLoaded = useCallback(() => {
    contentStateRef.current.hasMission = true;
    contentStateRef.current.isLoading = false;
    send("MISSION_LOADED");
  }, [send]);

  const onLoadingComplete = useCallback(
    (hasMission: boolean) => {
      contentStateRef.current.isLoading = false;
      contentStateRef.current.hasMission = hasMission;

      if (state.value === "animatingLoading") {
        if (hasMission) {
          send("MISSION_LOADED");
        } else {
          send("LOADING_COMPLETE_NO_MISSION");
        }
      } else {
        send("LOADING_COMPLETE");
      }
    },
    [send, state.value]
  );

  const setHasFeedback = useCallback((hasFeedback: boolean) => {
    contentStateRef.current.hasFeedback = hasFeedback;
  }, []);

  // Effect: Start header animation
  useEffect(() => {
    if (state.value !== "animatingHeader") return;
    if (headerTimelineRef.current) return;

    const { svgBanner, heading } = getElements();
    if (!svgBanner || !heading) return;

    headerTimelineRef.current = createHeaderTimeline(svgBanner, heading, () => {
      send("HEADER_COMPLETE");
    });
  }, [state.value, send, getElements]);

  // Effect: Decide which content to animate
  useEffect(() => {
    if (state.value !== "decidingContent") return;

    // Use rAF to ensure React has finished rendering
    const rafId = requestAnimationFrame(() => {
      const { isLoading, hasMission, hasFeedback } = contentStateRef.current;

      // Feedback has highest priority - show it exclusively
      if (hasFeedback) {
        send("SHOW_FEEDBACK");
      } else if (isLoading) {
        send("SHOW_LOADING");
      } else if (hasMission) {
        send("SHOW_MISSION");
      } else {
        send("SHOW_NO_MISSION");
      }
    });

    return () => cancelAnimationFrame(rafId);
  }, [state.value, send]);

  // Effect: Animate loading state
  useEffect(() => {
    if (state.value !== "animatingLoading") return;

    const { loadingState } = getElements();
    if (!loadingState) return;

    gsap.fromTo(
      loadingState,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
  }, [state.value, getElements]);

  // Effect: Animate feedback card
  useEffect(() => {
    if (state.value !== "animatingFeedback") return;

    // Wait for the element to be registered (it may not exist immediately after state transition)
    let attempts = 0;
    const maxAttempts = 10;

    function tryAnimate() {
      const { feedbackCard } = getElements();

      if (!feedbackCard) {
        attempts++;
        if (attempts < maxAttempts) {
          // Retry after a frame
          requestAnimationFrame(tryAnimate);
          return;
        }
        // Give up after max attempts
        send("ANIMATION_COMPLETE");
        return;
      }

      contentTimelineRef.current = gsap.timeline({
        onComplete: () => send("ANIMATION_COMPLETE"),
      });

      contentTimelineRef.current.fromTo(
        feedbackCard,
        { y: 40, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.2)" }
      );
    }

    // Start with a rAF to give React time to render
    requestAnimationFrame(tryAnimate);
  }, [state.value, send, getElements]);

  // Effect: Animate no mission state
  useEffect(() => {
    if (state.value !== "animatingNoMission") return;

    const { loadingState } = getElements();

    // If coming from loading state, fade it out first
    if (loadingState && gsap.getProperty(loadingState, "opacity") === 1) {
      gsap.to(loadingState, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(loadingState, { display: "none" });
          tryAnimateNoMissionContent();
        },
      });
    } else {
      tryAnimateNoMissionContent();
    }

    // Retry mechanism to wait for elements to be registered
    let attempts = 0;
    const maxAttempts = 10;

    function tryAnimateNoMissionContent() {
      const { noMissionState } = getElements();

      if (!noMissionState) {
        attempts++;
        if (attempts < maxAttempts) {
          requestAnimationFrame(tryAnimateNoMissionContent);
          return;
        }
        // Give up after max attempts
        send("ANIMATION_COMPLETE");
        return;
      }

      contentTimelineRef.current = gsap.timeline({
        onComplete: () => send("ANIMATION_COMPLETE"),
      });

      contentTimelineRef.current.fromTo(
        noMissionState,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [state.value, send, getElements]);

  // Effect: Animate mission content
  useEffect(() => {
    if (state.value !== "animatingMission") return;

    const { loadingState } = getElements();

    // If coming from loading state, fade it out first
    if (loadingState && gsap.getProperty(loadingState, "opacity") === 1) {
      gsap.to(loadingState, {
        opacity: 0,
        y: -20,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          gsap.set(loadingState, { display: "none" });
          tryAnimateMissionContent();
        },
      });
    } else {
      tryAnimateMissionContent();
    }

    // Retry mechanism to wait for elements to be registered
    let attempts = 0;
    const maxAttempts = 10;

    function tryAnimateMissionContent() {
      const { subtitle, missionCard } = getElements();

      if (!subtitle || !missionCard) {
        attempts++;
        if (attempts < maxAttempts) {
          requestAnimationFrame(tryAnimateMissionContent);
          return;
        }
        // Give up after max attempts
        send("ANIMATION_COMPLETE");
        return;
      }

      contentTimelineRef.current = gsap.timeline({
        onComplete: () => send("ANIMATION_COMPLETE"),
      });

      contentTimelineRef.current.fromTo(
        subtitle,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );

      contentTimelineRef.current.fromTo(
        missionCard,
        { y: 60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
        "-=0.4"
      );
    }
  }, [state.value, send, getElements]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      headerTimelineRef.current?.kill();
      contentTimelineRef.current?.kill();
      reset();
    };
  }, [reset]);

  return {
    state: state.value,
    send,
    onMissionLoaded,
    onLoadingComplete,
    setHasFeedback,
    // Rendering decisions - content always renders, these are for tracking
    isAnimatingLoading: state.value === "animatingLoading",
  };
}

function createHeaderTimeline(
  svgBanner: SvgBannerElements,
  heading: HeadingElements,
  onComplete: () => void
): gsap.core.Timeline {
  const tl = gsap.timeline({ onComplete });

  // 1. SVG Banner - Arc
  tl.fromTo(
    svgBanner.arc,
    { scaleY: 0, opacity: 1 },
    {
      scaleY: 1,
      opacity: 1,
      duration: 1,
      ease: "elastic.out",
      transformOrigin: "top center",
    }
  );

  // 2. SVG Banner - Decorations
  tl.fromTo(
    svgBanner.decorations,
    {
      scale: 0,
      opacity: 1,
      rotate: "random(-360, 360)",
      transformOrigin: "center center",
    },
    {
      scale: 1,
      opacity: 1,
      rotate: 0,
      duration: 1,
      ease: "elastic.out",
      from: "random",
      transformOrigin: "center center",
      stagger: () => 0.5 + random(0.5, 1),
    },
    "-=1.5"
  );

  // 3. Heading - Top line
  tl.fromTo(
    heading.topLine,
    { y: 100, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, ease: "power2.inOut" },
    "-=2"
  );

  // 4. Heading - Bottom line chars
  tl.fromTo(
    heading.bottomLineChars,
    { opacity: 1, scale: 0 },
    {
      scale: 1,
      duration: 1,
      opacity: 1,
      ease: "elastic.out",
      stagger: 0.1,
    },
    "-=0.5"
  );

  return tl;
}
