import type { PropsWithChildren } from 'react';

import styles from './Button.module.css';

type Props = PropsWithChildren<{
  onClick?: () => void;
}>;

export const Button = ({ children, onClick }: Props) => {
  return (
    <button className={styles.button} onClick={onClick}>
      {children}
    </button>
  );
};
