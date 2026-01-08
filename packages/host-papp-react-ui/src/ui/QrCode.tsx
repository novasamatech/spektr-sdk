import _QRCodeStyling from 'qr-code-styling';
import { memo, useEffect, useMemo, useState } from 'react';

import styles from './QrCode.module.css';

const QRCodeStyling = _QRCodeStyling as unknown as typeof _QRCodeStyling.default;

type Props = {
  value: string;
  size: number;
};

export const QrCode = memo(({ value, size }: Props) => {
  const [ref, setRef] = useState<HTMLDivElement | null>(null);
  const qrCode = useMemo(() => {
    return new QRCodeStyling({
      data: value,
      type: 'svg',
      shape: 'square',
      width: size,
      height: size,
      margin: 0,
      image: `data:image/svg+xml;base64,${IMAGE}`,
      imageOptions: {
        hideBackgroundDots: true,
        imageSize: 0.4,
        margin: 4,
      },
      dotsOptions: {
        type: 'rounded',
        color: '#ffffff',
      },
      backgroundOptions: {
        color: 'transparent',
      },
      cornersSquareOptions: {
        type: 'dot',
        color: '#ffffff',
      },
      cornersDotOptions: {
        type: 'dot',
        color: '#ffffff',
      },
      qrOptions: {
        errorCorrectionLevel: 'M',
      },
    });
  }, [size]);

  useEffect(() => {
    if (ref) {
      qrCode.append(ref);
    }

    return () => {
      if (ref) {
        QRCodeStyling._clearContainer(ref);
      }
    };
  }, [qrCode, ref]);

  useEffect(() => {
    qrCode?.update({ data: value });
  }, [value, qrCode]);

  return <div className={styles.container} style={{ height: size, width: size }} ref={setRef} />;
});

const IMAGE =
  'PHN2ZyB3aWR0aD0iNTgiIGhlaWdodD0iNjUiIHZpZXdCb3g9IjAgMCA1OCA2NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMy4yNjM5NyAxMy43MjY1Qy0wLjk4OTc3MiAxOC42ODE3IC0xLjEwMTk0IDI1LjU3OTIgMy4wMjIzNyAyOS4xMTg3QzcuMTQ2NjkgMzIuNjY2NyAxMy45MzcxIDMxLjUxODYgMTguMTk5NSAyNi41NTQ3QzIyLjQ1MzIgMjEuNTk5NSAyMi41NjU0IDE0LjcwMiAxOC40NDExIDExLjE2MjZDMTYuODI3NiA5Ljc3MjcxIDE0Ljc5MTMgOS4xMDc5OSAxMi42Njg4IDkuMTA3OTlDOS4zNzI3NyA5LjEwNzk5IDUuODUyNDUgMTAuNzEzNyAzLjI2Mzk3IDEzLjcyNjVaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0yLjAzMDAxIDM5LjM2NTdDLTEuMTcxMDggNDMuMTY0MSAwLjIxODA2NiA0OS42MTI4IDUuMTM2MTggNTMuNzY1MUMxMC4wNTQzIDU3LjkxNzQgMTYuNjQ2MyA1OC4yMTEgMTkuODQ3NCA1NC40MTI2QzIzLjA0ODUgNTAuNjE0MiAyMS42NTkzIDQ0LjE2NTUgMTYuNzQxMiA0MC4wMTMyQzE0LjEzNTUgMzcuODExOCAxMS4wNjM4IDM2LjY5ODIgOC4yNzY4NyAzNi42OTgyQzUuODAwNTUgMzYuNjk4MiAzLjUzOTk2IDM3LjU3ODcgMi4wMzg2NCAzOS4zNjU3IiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik0zMC45MDg3IDUzLjI2NDNDMjUuMTM2NCA1NS4wODU5IDIxLjE1ODggNTguNzk3OSAyMi4wMjE2IDYxLjU1MThDMjIuODkzMSA2NC4zMDU2IDI4LjI3NzEgNjUuMDY1MyAzNC4wNDk0IDYzLjIzNTFDMzkuODIxNyA2MS40MTM2IDQzLjc5OTQgNTcuNzAxNiA0Mi45MzY2IDU0Ljk0NzdDNDIuMzg0MyA1My4yMTI2IDQwLjAzNzUgNTIuMjYzIDM2LjkzMTMgNTIuMjYzQzM1LjExMDcgNTIuMjYzIDMzLjAzOTkgNTIuNTgyNCAzMC45MDg3IDUzLjI1NTciIGZpbGw9IndoaXRlIi8+PHBhdGggZD0iTTIxLjg3NDkgMy41Mzk0MkMyMC42ODQyIDYuOTc1MjQgMjQuNDYzNCAxMS40MTI1IDMwLjMzMDYgMTMuNDU4NEMzNi4xOTc5IDE1LjUwNDQgNDEuOTE4NCAxNC4zNzM1IDQzLjEwOTEgMTAuOTM3N0M0NC4yOTk4IDcuNTAxODQgNDAuNTIwNiAzLjA2NDYyIDM0LjY1MzQgMS4wMTg2NkMzMi42Nzc1IDAuMzI4MDQ0IDMwLjcxMDMgMCAyOC45MzI5IDBDMjUuNDM4NCAwIDIyLjY2MDEgMS4yNjAzOCAyMS44NzQ5IDMuNTM5NDJaIiBmaWxsPSJ3aGl0ZSIvPjxwYXRoIGQ9Ik00OC4yNTE2IDEwLjQ2MzhDNDYuNTUxOSAxMS4xNDU4IDQ2Ljk1NzQgMTYuMTA5NiA0OS4xNDkgMjEuNTMwOUM1MS4zNDA2IDI2Ljk2MDkgNTQuNDg5OSAzMC44MDI1IDU2LjE4OTcgMzAuMTIwNUM1Ny44ODA4IDI5LjQzODUgNTcuNDgzOSAyNC40ODMzIDU1LjI5MjMgMTkuMDUzNEM1My4yNzMzIDE0LjA0NjQgNTAuNDM0NiAxMC4zODYxIDQ4LjY3NDQgMTAuMzg2MUM0OC41Mjc3IDEwLjM4NjEgNDguMzg5NyAxMC40MTIgNDguMjUxNiAxMC40NjM4WiIgZmlsbD0id2hpdGUiLz48cGF0aCBkPSJNNDkuNTU0NCA0My40NDkxQzQ3LjEzODUgNDguNjg5MiA0Ni4zMDE1IDUzLjQ2MzEgNDcuNjkwNyA1NC4xMDE5QzQ5LjA3OTggNTQuNzQwNyA1Mi4xNjg4IDUxLjAxMTQgNTQuNTg0NyA0NS43NzEzQzU3LjAwOTIgNDAuNTMxMyA1Ny44Mzc2IDM1Ljc1NzQgNTYuNDU3IDM1LjExODVDNTYuMzUzNSAzNS4wNjY3IDU2LjI0MTMgMzUuMDQ5NSA1Ni4xMTE5IDM1LjA0OTVDNTQuNjAyIDM1LjA0OTUgNTEuNzg5MSAzOC42MDYyIDQ5LjU1NDQgNDMuNDQ5MVoiIGZpbGw9IndoaXRlIi8+PC9zdmc+';
