import styles from "./Heading.module.css";
import { gsap } from "gsap";
import { useEffect, useRef } from "react";

const title = "Tonton";

export function Heading({ className }: { className?: string }) {
  const headingTopLineRef = useRef<HTMLSpanElement>(null);
  const headingBottomLineRef = useRef<Array<HTMLSpanElement | null>>(
    Array.from(title).map(() => null)
  );

  useEffect(() => {
    if (
      !headingTopLineRef.current ||
      !headingBottomLineRef.current ||
      headingBottomLineRef.current.some((node) => node === null)
    )
      return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline();
      tl.fromTo(
        headingTopLineRef.current,
        {
          y: 100,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.inOut",
        }
      );
      tl.fromTo(
        headingBottomLineRef.current,
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
        }
      );
    }, headingBottomLineRef.current);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <h1 className={`${styles.heading} ${className}`}>
      <span ref={headingTopLineRef} className={styles.headingTopLine}>
        Les missions de
      </span>
      <span className={styles.headingBottomLine}>
        {title.split("").map((char, index) => (
          <span
            key={index}
            className={styles.headingBottomLineChar}
            ref={(node) => {
              if (node) headingBottomLineRef.current[index] = node;
            }}
          >
            {char}
          </span>
        ))}
      </span>
    </h1>
  );
}
