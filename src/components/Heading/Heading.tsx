import { useEffect, useRef } from "react";
import styles from "./Heading.module.css";
import { useAnimationStore } from "../../stores/animationStore";

const title = "Tonton";

export function Heading({ className }: { className?: string }) {
  const headingTopLineRef = useRef<HTMLSpanElement>(null);
  const headingBottomLineRef = useRef<Array<HTMLSpanElement | null>>(
    Array.from(title).map(() => null)
  );
  const register = useAnimationStore((state) => state.register);
  const unregister = useAnimationStore((state) => state.unregister);

  useEffect(() => {
    if (
      !headingTopLineRef.current ||
      !headingBottomLineRef.current ||
      headingBottomLineRef.current.some((node) => node === null)
    )
      return;

    const bottomLineChars = headingBottomLineRef.current.filter(
      (node): node is HTMLSpanElement => node !== null
    );

    register("heading", {
      topLine: headingTopLineRef.current,
      bottomLineChars,
    });

    return () => {
      unregister("heading");
    };
  }, [register, unregister]);

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
