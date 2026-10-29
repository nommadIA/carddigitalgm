"use client";

import React, { useEffect, useState } from "react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FaGithub } from "react-icons/fa6";
import { IoMdCheckmark } from "react-icons/io";

type AnimatedFormProps = {
  name?: string;
  className?: string;
};

export const AnimatedCheckmarkCircle = ({
  circleLength = 2 * Math.PI * 50,
  delay = 0,
  duration = 0.8,
  isComplete = true,
  strokeColor = "#10b981",
  className,
}: {
  circleLength?: number;
  delay?: number;
  duration?: number;
  isComplete?: boolean;
  strokeColor?: string;
  className?: string;
}) => {
  return (
    <div className={cn("relative flex items-center justify-center shrink-0 w-5 h-5", className)}>
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="currentColor"
          strokeWidth="10"
          fill="transparent"
          className="text-white/10 dark:text-neutral-800"
        />
        {isComplete && (
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            stroke={strokeColor}
            strokeWidth="10"
            strokeLinecap="round"
            fill="transparent"
            strokeDasharray={circleLength}
            initial={{ strokeDashoffset: circleLength }}
            animate={{ strokeDashoffset: 0 }}
            transition={{
              duration: duration,
              delay: delay,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        )}
      </svg>
      <AnimatePresence>
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ delay: delay + duration * 0.7, duration: 0.25, type: "spring", stiffness: 350 }}
            className="absolute inset-0 flex items-center justify-center"
            style={{ color: strokeColor }}
          >
            <IoMdCheckmark className="w-3.5 h-3.5" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AnimatedFormCard = ({ name }: { name: string }) => {
  const password = "••••••••";
  const circleLength = 2 * Math.PI * 50;
  const nameAnimationDuration = Math.max(0.6, name.length * 0.08);

  const [typedName, setTypedName] = useState("");
  const [typedPassword, setTypedPassword] = useState("");
  const [nameDone, setNameDone] = useState(false);
  const [passwordDone, setPasswordDone] = useState(false);

  useEffect(() => {
    let currentIdx = 0;
    const nameInterval = setInterval(() => {
      if (currentIdx <= name.length) {
        setTypedName(name.slice(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(nameInterval);
        setNameDone(true);

        // Inicia senha após nome terminar
        setTimeout(() => {
          let passIdx = 0;
          const passInterval = setInterval(() => {
            if (passIdx <= password.length) {
              setTypedPassword(password.slice(0, passIdx));
              passIdx++;
            } else {
              clearInterval(passInterval);
              setPasswordDone(true);
            }
          }, 80);
        }, 300);
      }
    }, 70);

    return () => clearInterval(nameInterval);
  }, [name]);

  return (
    <div className="w-full max-w-sm mx-auto rounded-2xl border border-white/10 bg-neutral-950/80 p-3 sm:p-4 backdrop-blur-xl shadow-2xl shadow-black/60">
      <div className="mb-3 px-1">
        <h3 className="text-sm font-semibold text-neutral-200 tracking-tight">Criar uma conta</h3>
        <p className="text-xs text-neutral-400">Preencha os dados abaixo para continuar</p>
      </div>

      <div className="space-y-2.5">
        {/* Campo Nome / E-mail */}
        <div className="rounded-xl border border-neutral-200/30 dark:border-neutral-800/80 p-1 bg-gradient-to-b from-neutral-900/40 to-neutral-950 shadow-[inset_0_1px_0_0_#f5f5f510,inset_0_0_0_1px_#131313]">
          <div className="rounded-lg p-2.5 flex items-center justify-between gap-3 bg-gradient-to-b from-neutral-900/60 to-neutral-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),inset_0_0_0_1px_#131313]">
            <div className="flex items-center gap-1.5 overflow-hidden text-sm font-medium text-neutral-200">
              <span className="truncate">{typedName}</span>
              {!nameDone && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-[2px] h-4 bg-emerald-400 rounded-full"
                />
              )}
            </div>
            <AnimatedCheckmarkCircle
              circleLength={circleLength}
              delay={0.1}
              duration={0.6}
              isComplete={nameDone}
              strokeColor="#10b981"
            />
          </div>
        </div>

        {/* Campo Senha */}
        <div className="rounded-xl border border-neutral-200/30 dark:border-neutral-800/80 p-1 bg-gradient-to-b from-neutral-900/40 to-neutral-950 shadow-[inset_0_1px_0_0_#f5f5f510,inset_0_0_0_1px_#131313]">
          <div className="rounded-lg p-2.5 flex items-center justify-between gap-3 bg-gradient-to-b from-neutral-900/60 to-neutral-950 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),inset_0_0_0_1px_#131313]">
            <div className="flex items-center gap-1.5 overflow-hidden text-sm font-mono tracking-widest text-neutral-300">
              <span>{typedPassword}</span>
              {nameDone && !passwordDone && (
                <motion.span
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                  className="inline-block w-[2px] h-4 bg-emerald-400 rounded-full"
                />
              )}
            </div>
            <AnimatedCheckmarkCircle
              circleLength={circleLength}
              delay={0.1}
              duration={0.6}
              isComplete={passwordDone}
              strokeColor="#10b981"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const AnimatedForm = ({ name = "Alex Morgan", className }: AnimatedFormProps) => {
  const [animationKey, setAnimationKey] = useState(0);
  const delayTime = 7000;

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey((prev) => prev + 1);
    }, delayTime);

    return () => clearInterval(interval);
  }, [delayTime]);

  return (
    <div className={className}>
      <AnimatedFormCard key={animationKey} name={name} />
    </div>
  );
};

export default AnimatedForm;
