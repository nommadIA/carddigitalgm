import React from "react";
import { cn } from "../../lib/utils";
import { AnimatedNumber, parseMetricFigure } from "./AnimatedNumber";

export interface ForgeSpecTag {
  label: React.ReactNode;
  accent?: boolean;
  icon?: React.ReactNode;
}

export interface ForgeSpecCardProps {
  id?: string;
  title: string;
  status?: string;
  statusLive?: boolean;
  eyebrow?: string;
  figure?: React.ReactNode;
  unit?: string;
  tags?: ForgeSpecTag[];
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  animate?: boolean;
  animationKey?: string | number | boolean;
  animationDuration?: number;
}

export const ForgeSpecCard: React.FC<ForgeSpecCardProps> = ({
  id = "01",
  title,
  status = "LIVE",
  statusLive = true,
  eyebrow,
  figure,
  unit,
  tags = [],
  className,
  children,
  onClick,
  animate = true,
  animationKey,
  animationDuration = 820,
}) => {
  const parsedFigure = animate ? parseMetricFigure(figure) : null;

  return (
    <div
      onClick={onClick}
      className={cn(
        "forge-spec",
        onClick && "cursor-pointer active:scale-[0.99] transition-transform",
        className
      )}
    >
      {/* BARRA SUPERIOR: ID + TÍTULO MONO + STATUS */}
      <div className="forge-spec__bar">
        {id && <span className="forge-spec__id shrink-0">{id}</span>}
        <span className="forge-spec__title min-w-0 truncate">{title}</span>
        {status && (
          <span
            className={cn(
              "forge-spec__status shrink-0",
              statusLive && "forge-spec__status--live"
            )}
          >
            {status}
          </span>
        )}
      </div>

      {/* CORPO DO CONTAINER */}
      <div className="forge-spec__body flex-1 flex flex-col justify-between">
        <div>
          {eyebrow && <div className="forge-spec__eyebrow">{eyebrow}</div>}

          {figure !== undefined && (
            <div className="forge-spec__figure flex items-baseline gap-1.5 tabular-nums flex-wrap">
              <span className="tabular-nums">
                {parsedFigure ? (
                  <AnimatedNumber
                    value={parsedFigure.numericValue}
                    decimals={parsedFigure.decimals}
                    currency={parsedFigure.isCurrency}
                    currencyPrefix={parsedFigure.currencyPrefix}
                    prefix={parsedFigure.prefix}
                    suffix={parsedFigure.suffix}
                    replayKey={animationKey}
                    duration={animationDuration}
                  />
                ) : (
                  figure
                )}
              </span>
              {unit && <span className="forge-spec__unit tabular-nums">{unit}</span>}
            </div>
          )}

          {children}
        </div>

        {tags && tags.length > 0 && (
          <div className="forge-spec__tags mt-auto pt-1">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className={cn(
                  "forge-spec__tag tabular-nums",
                  tag.accent && "forge-spec__tag--accent"
                )}
              >
                {tag.icon && <span className="shrink-0 flex items-center">{tag.icon}</span>}
                <span>{tag.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgeSpecCard;
