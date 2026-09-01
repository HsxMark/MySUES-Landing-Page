"use client";

import React from "react";
import { Button } from "@heroui/react";
import { PiSunFill, PiMoonBold } from "react-icons/pi";
import * as motion from "motion/react-client";

export function SwitchThemeButton() {
  const [isDark, setIsDark] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const initialDark = savedTheme ? savedTheme === "dark" : prefersDark;

    setIsDark(initialDark);
    document.documentElement.setAttribute(
      "data-theme",
      initialDark ? "dark" : "light",
    );
  }, []);

  const handleThemeChange = () => {
    const newIsDark = !isDark;
    const newTheme = newIsDark ? "dark" : "light";

    setIsDark(newIsDark);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  // 避免服务端渲染和客户端不一致
  if (!mounted) {
    return (
      <Button isIconOnly size="sm" variant="ghost" className="rounded-full">
        <PiSunFill className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={handleThemeChange}
        className="rounded-full"
      >
        {isDark ? (
          <PiMoonBold className="h-4 w-4" />
        ) : (
          <PiSunFill className="h-4 w-4" />
        )}
      </Button>
    </motion.div>
  );
}

export default SwitchThemeButton;
