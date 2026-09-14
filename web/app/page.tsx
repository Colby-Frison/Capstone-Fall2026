import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>Pilots Guide to Medical Certification</h1>
        <p>
          Search FAA medical certification conditions, likely outcomes,
          deferral requirements, and medication guidance in plain language.
        </p>
      </main>
    </div>
  );
}
