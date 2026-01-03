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
 * idle → animatingHeader → waitingForContent
 *   → awaitingLoadingElement → animatingLoading → transitioningToMission → complete
 *   → awaitingMissionElements → animatingMission → complete
 *
 * Element registration triggers state transitions (no polling needed)
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
        HEADER_COMPLETE: "waitingForContent",
        MISSION_LOADED: "animatingHeader", // Stay, just track that mission loaded
      },
    },
    waitingForContent: {
      on: {
        SHOW_LOADING: "awaitingLoadingElement",
        SHOW_MISSION: "awaitingMissionElements",
      },
    },
    awaitingLoadingElement: {
      on: {
        LOADING_READY: "animatingLoading",
      },
    },
    animatingLoading: {
      on: {
        MISSION_LOADED: "transitioningToMission",
      },
    },
    awaitingMissionElements: {
      on: {
        MISSION_CONTENT_READY: "animatingMission",
      },
    },
    animatingMission: {
      on: {
        ANIMATION_COMPLETE: "complete",
      },
    },
    transitioningToMission: {
      on: {
        TRANSITION_COMPLETE: "complete",
      },
    },
    complete: {},
  },
};

export function useAnimationStateMachine() {
  const reset = useAnimationStore((state) => state.reset);

  const headerTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const contentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const missionLoadedRef = useRef(false);

  const [state, send] = useStateMachine(animationMachineDefinition);

  // Get elements directly from store
  const getElements = useCallback(
    () => useAnimationStore.getState().elements,
    []
  );

  // Callbacks for external triggers
  const onMissionLoaded = useCallback(() => {
    missionLoadedRef.current = true;
    send("MISSION_LOADED");
  }, [send]);

  const onLoadingElementReady = useCallback(() => {
    send("LOADING_READY");
  }, [send]);

  const onMissionContentReady = useCallback(() => {
    send("MISSION_CONTENT_READY");
  }, [send]);

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

  // Effect: Decide loading vs mission path
  useEffect(() => {
    if (state.value !== "waitingForContent") return;

    // Use rAF to ensure React has finished rendering
    const rafId = requestAnimationFrame(() => {
      if (missionLoadedRef.current) {
        send("SHOW_MISSION");
      } else {
        send("SHOW_LOADING");
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

  // Effect: Animate mission content
  useEffect(() => {
    if (state.value !== "animatingMission") return;

    const { subtitle, missionCard } = getElements();
    if (!subtitle || !missionCard) return;

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
  }, [state.value, send, getElements]);

  // Effect: Transition from loading to mission
  useEffect(() => {
    if (state.value !== "transitioningToMission") return;

    const { loadingState, subtitle, missionCard } = getElements();
    if (!loadingState || !subtitle || !missionCard) return;

    gsap.to(loadingState, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        gsap.set(loadingState, { display: "none" });

        const tl = gsap.timeline({
          onComplete: () => send("TRANSITION_COMPLETE"),
        });

        tl.fromTo(
          subtitle,
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
        );

        tl.fromTo(
          missionCard,
          { y: 60, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" },
          "-=0.4"
        );
      },
    });
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
    onLoadingElementReady,
    onMissionContentReady,
    // Rendering decisions
    isHeaderComplete: !["idle", "animatingHeader"].includes(state.value),
    isAwaitingLoading: state.value === "awaitingLoadingElement",
    isAnimatingLoading: state.value === "animatingLoading",
    showMission: [
      "awaitingMissionElements",
      "animatingMission",
      "transitioningToMission",
      "complete",
    ].includes(state.value),
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
