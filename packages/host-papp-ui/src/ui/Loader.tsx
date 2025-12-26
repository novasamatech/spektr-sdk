import { memo } from 'react';

import styles from './Loader.module.css';

type Props = {
  size?: number;
};

export const Loader = memo(({ size = 16 }: Props) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      className={styles.spinner}
    >
      <path
        fill="currentColor"
        fillOpacity={0.24}
        fillRule="evenodd"
        d="M8 2.2a5.8 5.8 0 1 0 0 11.6A5.8 5.8 0 0 0 8 2.2ZM1 8a7 7 0 1 1 14 0A7 7 0 0 1 1 8Z"
        clipRule="evenodd"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M.771 7.594C.462 7.243.57 6.703.695 6.244c.7-2.556 2.949-4.809 5.443-5.536.53-.155 1.167-.26 1.552.14.191.198.31.472.31.776 0 .463-.276.859-.665 1.02-.245.1-.519.1-.772.178-1.824.566-3.543 2.29-3.927 4.2-.057.55-.504.978-1.047.978-.33 0-.625-.158-.818-.406Z"
        clipRule="evenodd"
      />
    </svg>
  );
});
