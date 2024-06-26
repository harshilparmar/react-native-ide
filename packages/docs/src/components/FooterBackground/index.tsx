import React from "react";
import usePageType from "@site/src/hooks/usePageType";
import styles from "./styles.module.css";

const FooterBackground = () => {
  const { isLanding, isDocumentation } = usePageType();

  return (
    <div className={styles.container}>
      {!isDocumentation && <div className={styles.footerBackground} />}
    </div>
  );
};

export default FooterBackground;
