import { Heading } from "../Heading";
import { SvgBanner } from "../SvgBanner";
import styles from "./Header.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <SvgBanner />
      <Heading className={styles.title} />
    </header>
  );
}
