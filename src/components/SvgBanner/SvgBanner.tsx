import { useRef, useEffect } from "react";
import styles from "./SvgBanner.module.css";
import { useAnimationStore } from "../../stores/animationStore";

export function SvgBanner() {
  const svgRef = useRef<SVGSVGElement>(null);
  const register = useAnimationStore((state) => state.register);
  const unregister = useAnimationStore((state) => state.unregister);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;

    const arc = svg.querySelector("#Arc");
    const pinky = svg.querySelector("#Pinky");
    const donut = svg.querySelector("#Donut");
    const triangle = svg.querySelector("#Triangle");
    const pickleRick = svg.querySelector("#Pickle_Rick");
    const u = svg.querySelector("#U");

    if (!arc || !pinky || !donut || !triangle || !pickleRick || !u) return;

    register("svgBanner", {
      arc,
      decorations: [pinky, donut, triangle, pickleRick, u],
    });

    return () => {
      unregister("svgBanner");
    };
  }, [register, unregister]);

  return (
    <div className={styles.bannerWrapper}>
      <svg
        ref={svgRef}
        className={styles.banner}
        viewBox="0 0 4279 2611"
        preserveAspectRatio="xMidYMid slice"
      >
        <path
          className={styles.shape}
          id="Arc"
          d="M4279,2610h0v-.5c0-756.35-957.89-1369.5-2139.5-1369.5S0,1853.15,0,2609.5v.5h0V-1h4279v2611Z"
          style={{ fill: "#ec0000" }}
        />
        <rect
          className={styles.shape}
          id="Pinky"
          x="487.47"
          y="288.82"
          width="645.3"
          height="654.11"
          rx="177"
          ry="177"
          transform="translate(-107.65 1055.54) rotate(-62.84)"
          style={{ fill: "#f500a7" }}
        />
        <path
          className={styles.shape}
          id="Donut"
          d="M3753.12,1697c-107.85,0-209.08-40.86-285.06-115.06-36.9-36.04-65.91-78.03-86.21-124.82-21.05-48.51-31.73-99.86-31.73-152.62s10.67-104.11,31.73-152.62c20.31-46.79,49.31-88.79,86.21-124.82,75.97-74.2,177.21-115.06,285.06-115.06s209.08,40.86,285.06,115.06c36.9,36.04,65.91,78.03,86.21,124.82,21.05,48.51,31.73,99.86,31.73,152.62s-10.67,104.11-31.73,152.62c-20.31,46.79-49.31,88.79-86.21,124.82-75.97,74.19-177.21,115.06-285.06,115.06ZM3753.12,1113c-55.06,0-106.42,20.55-144.62,57.86-37,36.13-57.38,83.59-57.38,133.64s20.38,97.51,57.38,133.64c38.21,37.31,89.57,57.86,144.62,57.86s106.42-20.55,144.62-57.86c37-36.13,57.38-83.59,57.38-133.64s-20.38-97.51-57.38-133.64c-38.21-37.31-89.57-57.86-144.62-57.86Z"
          style={{ fill: "#f1ad00" }}
        />
        <path
          className={styles.shape}
          id="Triangle"
          d="M1952.14,909.29c39.39-26.29,92.19-19.17,123.21,16.61l299.97,346.01c56.75,65.45,2.27,166.31-83.58,154.73l-680.89-91.81c-85.85-11.58-111.67-123.26-39.61-171.35l380.9-254.19h0Z"
          style={{ fill: "#c27cff" }}
        />
        <path
          className={styles.shape}
          id="Pickle_Rick"
          d="M326.95,1468.7h0c88.42-22.03,177.97,31.78,200,120.21l132.5,531.74c22.03,88.42-31.78,177.97-120.21,200h0c-88.42,22.03-177.97-31.78-200-120.21l-132.5-531.74c-22.03-88.42,31.78-177.97,120.21-200h0Z"
          style={{ fill: "#108f1d" }}
        />
        <path
          className={styles.shape}
          id="U"
          d="M3035.81,1019.74c-.35,0-.69,0-1.03,0-64.58-.22-127.4-21.27-181.67-60.88-53.84-39.29-99.82-96.65-136.67-170.48-75.07-150.41-113.07-370.19-112.93-653.24.03-55.49,45.02-100.45,100.5-100.45h.05c55.5.03,100.48,45.04,100.45,100.55-.08,172.96,15.77,411.1,91.77,563.38,22.35,44.79,47.7,77.72,75.32,97.88,20.4,14.89,41.29,22.16,63.86,22.24.12,0,.23,0,.35,0,24.49,0,51.84-8.72,79.13-25.22,31.14-18.83,61.65-47.35,88.25-82.47,59.96-79.17,94.71-183.38,95.35-285.89.35-55.29,45.28-99.87,100.48-99.87.22,0,.43,0,.64,0,55.5.35,100.22,45.62,99.87,101.13-.47,74.82-13.25,149.08-38,220.72-23.47,67.94-56.48,130.27-98.11,185.25-90.2,119.11-209.55,187.34-327.6,187.34Z"
          style={{ fill: "#499eff" }}
        />
      </svg>
      <div className={styles.gradientOverlay} />
    </div>
  );
}
