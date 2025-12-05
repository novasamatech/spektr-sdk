import type { PropsWithChildren } from 'react';

type Props = PropsWithChildren<{
  onClick?: () => void;
}>;

export const Button = ({ children, onClick }: Props) => {
  return <button onClick={onClick}>{children}</button>;
};
