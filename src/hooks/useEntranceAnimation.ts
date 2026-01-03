import { useEffect, useRef } from "react";
import { useAnimationStore } from "../stores/animationStore";
import gsap from "gsap";
import { random } from "gsap/all";

export function useEntranceAnimation() {
  const elements = useAnimationStore((state) => state.elements);
  const reset = useAnimationStore((state) => state.reset);
  const hasPlayed = useRef(false);
  const ctxRef = useRef<gsap.Context | null>(null);

  useEffect(() => {
    const { svgBanner, heading, subtitle, missionCard } = elements;

    // Wait for all elements to be registered
    if (
      !svgBanner ||
      !heading ||
      !subtitle ||
      !missionCard ||
      hasPlayed.current
    ) {
      return;
    }

    hasPlayed.current = true;

    // Create master timeline with all animations
    ctxRef.current = gsap.context(() => {
      const tl = gsap.timeline();

      // 1. SVG Banner - Arc animation
      tl.fromTo(
        svgBanner.arc,
        {
          scaleY: 0,
          opacity: 1,
        },
        {
          scaleY: 1,
          opacity: 1,
          duration: 1,
          ease: "elastic.out",
          transformOrigin: "top center",
        }
      );

      // 2. SVG Banner - Decorations animation (overlaps with arc)
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
        {
          y: 100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.inOut",
        },
        "-=2"
      );

      // 4. Heading - Bottom line chars animation
      tl.fromTo(
        heading.bottomLineChars,
        {
          opacity: 1,
          scale: 0,
        },
        {
          scale: 1,
          duration: 1,
          opacity: 1,
          ease: "elastic.out",
          stagger: 0.1,
        },
        "-=0.5"
      );

      // 5. Subtitle animation
      tl.fromTo(
        subtitle,
        {
          y: 20,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power2.out",
        },
        "-=0.6"
      );

      // 6. Mission Card animation
      tl.fromTo(
        missionCard,
        {
          y: 60,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
        },
        "-=0.8"
      );
    });
  }, [elements]);

  // Reset store and revert animations on unmount only
  useEffect(() => {
    return () => {
      ctxRef.current?.revert();
      reset();
      hasPlayed.current = false;
    };
  }, [reset]);
}
