import './Modal.styles.css';

import type { PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';

type Props = PropsWithChildren<{
  isOpen: boolean;
  onOpenChange(isOpen: boolean): void;
  width: number | string;
  container?: HTMLElement;
}>;

export const Modal = ({ isOpen, onOpenChange, width, container, children }: Props) => {
  if (!isOpen) {
    return null;
  }

  return createPortal(
    <>
      <div className="papp-modal-backdrop" onClick={() => onOpenChange(false)} />
      <div className="papp-modal-modal" style={{ width }}>
        {children}
      </div>
    </>,
    container ?? document.body,
  );
};
