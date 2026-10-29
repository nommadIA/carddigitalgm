import React from "react";
import { cn } from "../../lib/utils";

export interface ForgeSpecTag {
  label: string;
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
}) => {
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
        {id && <span className="forge-spec__id">{id}</span>}
        <span className="forge-spec__title">{title}</span>
        {status && (
          <span
            className={cn(
              "forge-spec__status",
              statusLive && "forge-spec__status--live"
            )}
          >
            {status}
          </span>
        )}
      </div>

      {/* CORPO DO CONTAINER */}
      <div className="forge-spec__body">
        {eyebrow && <div className="forge-spec__eyebrow">{eyebrow}</div>}

        {figure !== undefined && (
          <div className="forge-spec__figure flex items-baseline">
            <span>{figure}</span>
            {unit && <span className="forge-spec__unit">{unit}</span>}
          </div>
        )}

        {children}

        {tags && tags.length > 0 && (
          <div className="forge-spec__tags">
            {tags.map((tag, idx) => (
              <span
                key={idx}
                className={cn(
                  "forge-spec__tag",
                  tag.accent && "forge-spec__tag--accent"
                )}
              >
                {tag.icon && <span className="shrink-0">{tag.icon}</span>}
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
