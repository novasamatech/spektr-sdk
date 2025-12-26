import type { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

import styles from './Modal.module.css';
import { useTheme } from './Theme.js';

type Props = PropsWithChildren<{
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
  width: number | string;
  container?: HTMLElement;
}>;

export const Modal = ({ isOpen, onOpenChange, width, container, children }: Props) => {
  const theme = useTheme();

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className={styles.backdrop} onClick={() => onOpenChange(false)} />
      <div className={`${styles.modal} ${theme === 'dark' ? styles.modalDark : styles.modalLight}`} style={{ width }}>
        {children}
      </div>
    </>,
    container ?? document.body,
  );
};
