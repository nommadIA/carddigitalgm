import React from "react";
import { BorderBeam } from "./BorderBeam";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e?: any) => void;
  style?: React.CSSProperties;
  key?: React.Key | null | undefined;
  id?: string;
  borderBeam?: boolean;
}

export const Card = ({
  title,
  right,
  children,
  className = "",
  style,
  onClick,
  id,
  borderBeam = false,
  ...rest
}: CardProps) => {
  return (
    <div
      id={id}
      className={cn(
        "forge-spec relative overflow-hidden transition-all",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform duration-150",
        className
      )}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {/* Feixe de Luz BorderBeam se habilitado */}
      {borderBeam && <BorderBeam duration={6} borderWidth={1.2} color="#f65a1a" />}

      {(title || right) && (
        <div className="forge-spec__bar">
          <div className="forge-spec__title">
            {title ? <h3>{title}</h3> : null}
          </div>
          {right ? <div className="ml-auto">{right}</div> : null}
        </div>
      )}
      <div className="relative z-10 w-full p-4 sm:p-5">
        {children}
      </div>
    </div>
  );
};

export default Card;