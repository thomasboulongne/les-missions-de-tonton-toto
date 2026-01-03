import { useEffect, useRef, useCallback } from "react";
import useStateMachine from "@cassiozen/usestatemachine";
import gsap from "gsap";
import { random } from "gsap/all";
import { useAnimationStore } from "../stores/animationStore";
import type {
  SvgBannerElements,
  HeadingElements,
} from "../stores/animationStore";

// Create the state machine definition
const animationMachineDefinition = {
  initial: "idle" as const,
  context: {
    missionLoaded: false,
  },
  states: {
    idle: {
      on: {
        HEADER_READY: "animatingHeader",
      },
    },
    animatingHeader: {
      on: {
        HEADER_COMPLETE: "waitingForContent",
        MISSION_LOADED: "animatingHeader", // Stay in same state, just mark as loaded
      },
    },
    waitingForContent: {
      on: {
        SHOW_LOADING: "animatingLoading",
        SHOW_MISSION: "animatingMission",
      },
    },
    animatingLoading: {
      on: {
        MISSION_LOADED: "transitioningToMission",
      },
    },
    transitioningToMission: {
      on: {
        TRANSITION_COMPLETE: "complete",
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

export function useAnimationStateMachine() {
  const reset = useAnimationStore((state) => state.reset);

  const headerTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const contentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const missionLoadedRef = useRef(false);
  const hasAnimatedMissionRef = useRef(false);
  const hasAnimatedLoadingRef = useRef(false);

  const [state, send] = useStateMachine(animationMachineDefinition);

  // Get elements directly from store (stable reference via getState)
  const getElements = useCallback(
    () => useAnimationStore.getState().elements,
    []
  );

  // Send MISSION_LOADED event
  const onMissionLoaded = useCallback(() => {
    missionLoadedRef.current = true;
    send("MISSION_LOADED");
  }, [send]);

  // Effect: Start header animation when entering animatingHeader
  useEffect(() => {
    if (state.value !== "animatingHeader") return;
    if (headerTimelineRef.current) return; // Already running

    const elements = getElements();
    const { svgBanner, heading } = elements;
    if (!svgBanner || !heading) return;

    headerTimelineRef.current = createHeaderTimeline(svgBanner, heading, () => {
      send("HEADER_COMPLETE");
    });
  }, [state.value, send, getElements]);

  // Effect: Decide what to show when entering waitingForContent
  useEffect(() => {
    if (state.value !== "waitingForContent") return;

    // Use requestAnimationFrame to ensure React has finished rendering
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
    if (hasAnimatedLoadingRef.current) return;

    const elements = getElements();
    const { loadingState } = elements;
    if (!loadingState) return;

    hasAnimatedLoadingRef.current = true;

    gsap.fromTo(
      loadingState,
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
    );
  }, [state.value, getElements]);

  // Effect: Animate mission content - poll for elements to be ready
  useEffect(() => {
    if (state.value !== "animatingMission") return;
    if (hasAnimatedMissionRef.current) return;

    // Poll until elements are ready (they might not be registered yet)
    const checkAndAnimate = () => {
      const elements = getElements();
      const { subtitle, missionCard } = elements;

      if (!subtitle || !missionCard) {
        // Elements not ready yet, try again
        return false;
      }

      hasAnimatedMissionRef.current = true;

      // Kill any existing tweens and force initial state to prevent double animation
      gsap.killTweensOf([subtitle, missionCard]);
      gsap.set(subtitle, { y: 20, opacity: 0 });
      gsap.set(missionCard, { y: 60, opacity: 0 });

      contentTimelineRef.current = gsap.timeline({
        onComplete: () => {
          send("ANIMATION_COMPLETE");
        },
      });

      // Use 'to' instead of 'fromTo' since we already set initial positions with gsap.set
      contentTimelineRef.current.to(subtitle, {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      });

      // Use 'to' instead of 'fromTo' since we already set initial positions with gsap.set
      contentTimelineRef.current.to(
        missionCard,
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.4"
      );

      return true;
    };

    // Try immediately
    if (checkAndAnimate()) return;

    // If not ready, poll with requestAnimationFrame
    let rafId: number;
    const poll = () => {
      if (!checkAndAnimate()) {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => cancelAnimationFrame(rafId);
  }, [state.value, send, getElements]);

  // Effect: Transition from loading to mission
  useEffect(() => {
    if (state.value !== "transitioningToMission") return;

    const elements = getElements();
    const { loadingState, subtitle, missionCard } = elements;
    if (!loadingState || !subtitle || !missionCard) return;

    gsap.to(loadingState, {
      opacity: 0,
      y: -20,
      duration: 0.3,
      ease: "power2.in",
      onComplete: () => {
        gsap.set(loadingState, { display: "none" });

        const tl = gsap.timeline({
          onComplete: () => {
            send("TRANSITION_COMPLETE");
          },
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

  // Cleanup on unmount only
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
    // Expose for rendering decisions
    isHeaderComplete: !["idle", "animatingHeader"].includes(state.value),
    isAnimatingLoading: state.value === "animatingLoading",
    showMission: [
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

  // 1. SVG Banner - Arc animation
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

  // 2. SVG Banner - Decorations animation
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

  // 3. Heading - Top line animation
  tl.fromTo(
    heading.topLine,
    { y: 100, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, ease: "power2.inOut" },
    "-=2"
  );

  // 4. Heading - Bottom line chars animation
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
