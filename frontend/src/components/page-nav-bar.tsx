"use client";

/**
 * PageNavBar - 页面导航栏组件，支持滚动监听和平滑导航
 *
 * @example
 * ```tsx
 * import { PageNavBar } from "@/components/page-nav-bar";
 *
 * const navItems = [
 *   { id: "hero", label: "Hero" },
 *   { id: "features", label: "Features" },
 *   { id: "pricing", label: "Pricing" },
 * ];
 *
 * <PageNavBar items={navItems} />
 *
 * <section id="hero">...</section>
 * <section id="features">...</section>
 * <section id="pricing">...</section>
 * ```
 */

import type { Key } from "react-aria-components";
import type { ReactNode } from "react";
import { HiOutlineMenu, HiX } from "react-icons/hi";

import { Tabs } from "@heroui/react";
import * as motion from "motion/react-client";
import React from "react";
import { cn } from "tailwind-variants";

export interface NavItem {
  id: string;
  label: string;
}

export interface PageNavBarProps {
  items: NavItem[];
  logo?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tabListClassName?: string;
}

export function PageNavBar({
  items,
  logo,
  actions,
  className,
  tabListClassName,
}: PageNavBarProps) {
  const [activeId, setActiveId] = React.useState<Key>(items[0]?.id ?? "");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isProgrammaticScrollRef = React.useRef(false);
  const scrollEndTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const lastScrollYRef = React.useRef(0);

  // 处理点击导航项
  const handleTabChange = React.useCallback((key: Key) => {
    const sectionId = String(key);
    const element = document.getElementById(sectionId);

    if (!element) return;

    // 关闭移动端菜单
    setIsMobileMenuOpen(false);

    // 设置程序化滚动标记
    isProgrammaticScrollRef.current = true;
    setActiveId(key);

    // 计算目标位置(减去导航栏高度的偏移)
    const navBarHeight = 80;
    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    const targetPosition = elementTop - navBarHeight;

    // 平滑滚动到目标位置
    window.scrollTo({
      top: targetPosition,
      behavior: "smooth",
    });
  }, []);

  // 滚动监听 - 更新激活状态
  React.useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 检测滚动是否停止（用于重置程序化滚动标记）
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }

      scrollEndTimeoutRef.current = setTimeout(() => {
        // 滚动停止后，重置程序化滚动标记
        isProgrammaticScrollRef.current = false;
      }, 150);

      // 如果是程序化滚动，不更新激活状态
      if (isProgrammaticScrollRef.current) {
        lastScrollYRef.current = currentScrollY;
        return;
      }

      // 检查是否滚动到页面底部
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = currentScrollY;
      const clientHeight = window.innerHeight;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;

      // 如果在底部，激活最后一个 item
      if (isAtBottom && items.length > 0) {
        setActiveId(items[items.length - 1].id);
        lastScrollYRef.current = currentScrollY;
        return;
      }

      // 查找当前可见的section
      const scrollPosition = currentScrollY + 150; // 添加偏移量

      let currentSection = items[0]?.id ?? "";

      for (const item of items) {
        const element = document.getElementById(item.id);
        if (!element) continue;

        const elementTop = element.offsetTop;

        // 如果滚动位置已经过了这个元素的顶部，则认为这是当前section
        if (scrollPosition >= elementTop) {
          currentSection = item.id;
        } else {
          // 一旦找到第一个还没到达的section，就停止
          break;
        }
      }

      setActiveId(currentSection);
      lastScrollYRef.current = currentScrollY;
    };

    let rafId: number | null = null;
    const throttledHandleScroll = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        handleScroll();
        rafId = null;
      });
    };

    window.addEventListener("scroll", throttledHandleScroll, { passive: true });

    handleScroll();

    return () => {
      window.removeEventListener("scroll", throttledHandleScroll);
      if (scrollEndTimeoutRef.current) {
        clearTimeout(scrollEndTimeoutRef.current);
      }
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [items]);

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn(
          "sticky top-0 z-50 w-full bg-[var(--background)]/95 backdrop-blur-xl border-b border-[var(--default)]/20 shadow-sm",
          className,
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex shrink-0 items-center">
            <div className="lg:min-w-[160px]">{logo}</div>
          </div>

          <div className="hidden flex-1 justify-center lg:flex">
            <Tabs selectedKey={activeId} onSelectionChange={handleTabChange}>
              <Tabs.ListContainer className="scrollbar-hide max-w-full overflow-x-auto">
                <Tabs.List
                  aria-label="页面导航"
                  className={cn(
                    "w-fit min-w-min rounded-full bg-[var(--background)]",
                    "*:h-9 *:w-fit *:px-4 *:text-sm *:font-normal *:text-muted *:opacity-80",
                    "*:hover:opacity-100 *:data-[selected=true]:text-foreground *:data-[selected=true]:opacity-100",
                    tabListClassName,
                  )}
                >
                  {items.map((item) => (
                    <Tabs.Tab key={item.id} id={item.id}>
                      {item.label}
                      <Tabs.Indicator className="rounded-full bg-[var(--default)] shadow-none duration-300" />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>

          <div className="flex-1 lg:hidden" />

          <div className="flex shrink-0 items-center justify-end gap-2">
            <div className="lg:min-w-[160px] flex items-center justify-end gap-2">
              {actions}
              <button
                type="button"
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-[var(--default)]/10 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(
                    "Menu button clicked, current state:",
                    isMobileMenuOpen,
                  );
                  setIsMobileMenuOpen(!isMobileMenuOpen);
                }}
              >
                {isMobileMenuOpen ? (
                  <HiX className="h-5 w-5" />
                ) : (
                  <HiOutlineMenu className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {isMobileMenuOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="sticky top-[73px] z-40 overflow-hidden bg-[var(--background)]/95 backdrop-blur-xl border-b border-[var(--default)]/20 lg:hidden"
        >
          <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
            <nav className="flex flex-col space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleTabChange(item.id)}
                  className={cn(
                    "rounded-lg px-4 py-3 text-left text-sm font-medium transition-colors",
                    "hover:bg-[var(--default)]/10",
                    activeId === item.id
                      ? "bg-[var(--default)]/20 text-foreground"
                      : "text-muted",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </motion.div>
      )}
    </>
  );
}

export default PageNavBar;
